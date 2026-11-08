#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# HERMES-PROJECTS-GATE: Portão Determinístico dos Guardiões por Projeto
# Executa os testes rápidos de cada um dos 5 projetos no Coolify.
# Custo Zero de LLM se os microsserviços estiverem saudáveis.
# ==============================================================================

LOCKFILE="/var/run/hermes-projects-gate.lock"
exec 202>"$LOCKFILE"
flock -n 202 || exit 0

PROJECTS_DIR="/etc/hermes-observability/projects"
RUNNER="/usr/local/bin/hermes-project-runner.py"

PROJECTS=("ars-factory" "cidade-do-agro" "contdigital" "sistema-insight" "tempo-agro")

for proj in "${PROJECTS[@]}"; do
    CHECK_SCRIPT="${PROJECTS_DIR}/${proj}/checks.sh"
    if [[ -f "$CHECK_SCRIPT" ]]; then
        # Executa verificacao deterministica rapida
        RES=$(bash "$CHECK_SCRIPT" 2>&1 || true)
        if echo "$RES" | grep -q "ANOMALY:"; then
            echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${proj^^}] Anomalia detectada: ${RES}"
            if [[ -f "$RUNNER" ]]; then
                python3 "$RUNNER" "$proj" "$RES" || true
            fi
        else
            echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${proj^^}] Operação normal. (Custo R$ 0,00)"
        fi
    fi
done
