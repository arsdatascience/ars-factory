#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# HERMES-WAKE-GATE: Portão Determinístico de Custo Zero & Sanitizador de Logs
# Executado periodicamente via systemd timer a cada 5 minutos.
# ==============================================================================

LOCKFILE="/var/run/hermes-wake-gate.lock"
exec 201>"$LOCKFILE"
flock -n 201 || exit 0

# Carrega variáveis de ambiente
if [[ -f /etc/hermes-observability/hermes.env ]]; then
    source /etc/hermes-observability/hermes.env
elif [[ -f /etc/pqc-audit.env ]]; then
    source /etc/pqc-audit.env
fi

DISK_THRESHOLD_PCT="${DISK_THRESHOLD_PCT:-85}"
MEM_THRESHOLD_PCT="${MEM_THRESHOLD_PCT:-90}"
TELEMETRY_DIR="${HERMES_TELEMETRY_DIR:-/var/lib/hermes-telemetry}"
mkdir -p "$TELEMETRY_DIR"

# 1. Sanitizador Estrito contra Indirect Prompt Injection em Logs Externos
sanitize_log() {
    sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2};?)?)?[mGK]//g" \
    | tr -cd '\11\12\15\40-\176' \
    | sed -E 's/(IGNORE PREVIOUS|SYSTEM PROMPT|<\|im_start\|>|<\|im_end\|>|\[INST\]|role:[[:space:]]*system|DAN[[:space:]]+mode)/[REDACTED_INJECTION_ATTEMPT]/gi' \
    | cut -c 1-250
}

ANOMALY_REASONS=()

# 2. Check: Tentativas Recentes de Invasão / Força Bruta SSH no Host
SSH_ATTACK_COUNT=0
if [[ -f /var/log/auth.log ]]; then
    # Conta tentativas com falha nos ultimos minutos
    SSH_ATTACK_COUNT=$(tail -n 200 /var/log/auth.log 2>/dev/null | grep -iE "(Failed password|Invalid user|not allowed because|authentication failure|Connection reset by invalid user)" | wc -l || true)
fi

# Fallback ou verificacao via Loki se disponivel
if [[ "$SSH_ATTACK_COUNT" -eq 0 && -n "${LOKI_URL:-}" ]]; then
    LOKI_QUERY='sum(count_over_time({job="security", log_type="ssh_auth"} |~ "(?i)(Failed|Invalid|not allowed)" [5m]))'
    ENCODED_QUERY=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$LOKI_QUERY" 2>/dev/null || echo "")
    if [[ -n "$ENCODED_QUERY" ]]; then
        LOKI_RES=$(curl -s -m 5 "${LOKI_URL}/loki/api/v1/query?query=${ENCODED_QUERY}" 2>/dev/null || echo "")
        LOKI_VAL=$(echo "$LOKI_RES" | grep -oP '\[[0-9.]+,[[:space:]]*"\K[0-9.]+' | head -n 1 || echo "0")
        if (( $(echo "${LOKI_VAL:-0} > 0" | bc -l 2>/dev/null || echo 0) )); then
            SSH_ATTACK_COUNT=$(printf "%.0f" "$LOKI_VAL")
        fi
    fi
fi

if [[ "$SSH_ATTACK_COUNT" -ge 8 ]]; then
    ANOMALY_REASONS+=("Pico de forca bruta SSH detectado: ${SSH_ATTACK_COUNT} tentativas recentes")
fi

# 3. Check: Containers Docker com Falha (Exited, Restarting ou Unhealthy)
FAILED_CONTAINERS=$(docker ps -a --filter "status=exited" --filter "status=restarting" --filter "health=unhealthy" --format '{{.Names}} (Status: {{.Status}})' 2>/dev/null | grep -vE "^$" || true)
if [[ -n "$FAILED_CONTAINERS" ]]; then
    ANOMALY_REASONS+=("Containers Docker anomalos: $(echo "$FAILED_CONTAINERS" | tr '\n' ' ')")
fi

# 4. Check: Uso de Disco e Memoria RAM
DISK_USAGE=$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
MEM_USAGE=$(free | awk '/Mem:/ {printf("%.0f", $3/$2 * 100)}')

if [[ "${DISK_USAGE:-0}" -ge "$DISK_THRESHOLD_PCT" ]]; then
    ANOMALY_REASONS+=("Uso de disco critico na raiz: ${DISK_USAGE}% (Threshold: ${DISK_THRESHOLD_PCT}%)")
fi
if [[ "${MEM_USAGE:-0}" -ge "$MEM_THRESHOLD_PCT" ]]; then
    ANOMALY_REASONS+=("Uso de memoria RAM critico: ${MEM_USAGE}% (Threshold: ${MEM_THRESHOLD_PCT}%)")
fi

# 5. Check: Alertas Recentes do CrowdSec
CROWDSEC_ACTIVE_ALERTS=""
if command -v cscli >/dev/null 2>&1; then
    CS_COUNT=$(cscli alerts list -l 5 -o raw 2>/dev/null | wc -l || echo "0")
    if [[ "$CS_COUNT" -gt 1 ]]; then
        CROWDSEC_ACTIVE_ALERTS=$(cscli alerts list -l 5 2>/dev/null | sanitize_log || true)
        ANOMALY_REASONS+=("Alertas ativos detectados no CrowdSec IPS")
    fi
fi

# ==============================================================================
# WAKE-AGENT GATE: Zero-Cost Exit se saudavel
# ==============================================================================
if [[ ${#ANOMALY_REASONS[@]} -eq 0 && "${1:-}" != "--force" ]]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Servidor saudavel. Sem anomalias. Wake-Gate inativo (Custo R$ 0,00)."
    exit 0
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ANOMALIA DETECTADA! Acionando malha multiagentica Hermes..."

# Coleta de telemetria completa e sanitizada
SSH_SAMPLE=""
if [[ -f /var/log/auth.log ]]; then
    SSH_SAMPLE=$(tail -n 40 /var/log/auth.log 2>/dev/null | grep -iE "(Failed|Invalid|not allowed|sshd)" | sanitize_log || true)
fi

DOCKER_SUMMARY=$(docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | head -n 25 | sanitize_log || true)

SNAPSHOT_FILE="${TELEMETRY_DIR}/incident-snapshot.json"

# Monta snapshot JSON seguro
python3 -c "
import json, sys
data = {
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'hostname': '$(hostname -f 2>/dev/null || hostname)',
    'anomaly_triggers': sys.argv[1].split(';;;'),
    'metrics': {
        'disk_usage_pct': '${DISK_USAGE}%',
        'ram_usage_pct': '${MEM_USAGE}%',
        'ssh_attack_count_5m': '${SSH_ATTACK_COUNT}'
    },
    'failed_containers': '''${FAILED_CONTAINERS}'''.strip(),
    'active_containers_sample': '''${DOCKER_SUMMARY}'''.strip(),
    'ssh_auth_log_sample': '''${SSH_SAMPLE}'''.strip(),
    'crowdsec_alerts': '''${CROWDSEC_ACTIVE_ALERTS}'''.strip()
}
with open('${SNAPSHOT_FILE}', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
" "$(IFS=';;;'; echo "${ANOMALY_REASONS[*]}")"

# Executa o runner multiagente
if [[ -f /usr/local/bin/hermes-multiagent-runner.py ]]; then
    python3 /usr/local/bin/hermes-multiagent-runner.py "$SNAPSHOT_FILE"
elif [[ -f ./hermes-multiagent-runner.py ]]; then
    python3 ./hermes-multiagent-runner.py "$SNAPSHOT_FILE"
fi
