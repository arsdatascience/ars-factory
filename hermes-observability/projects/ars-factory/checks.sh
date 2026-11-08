#!/usr/bin/env bash
# Deterministic Check Script - Ars Factory Core APM
set -euo pipefail

ANOMALIES=()

# 1. Checa se o Grafana responde 200/302 internamente
if ! curl -s -m 5 -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null | grep -qE "200|302"; then
    ANOMALIES+=("Grafana API healthcheck falhou ou porta 3000 inacessivel")
fi

# 2. Checa se o Loki esta pronto
if ! curl -s -m 5 http://127.0.0.1:3100/ready 2>/dev/null | grep -q "ready"; then
    ANOMALIES+=("Loki /ready endpoint nao retornou status ready")
fi

# 3. Checa containers essenciais da stack de monitoramento
CONTAINERS_DOWN=$(docker ps -a --filter "name=uenauovgxblihpw9qyn2juln" --filter "status=exited" --filter "health=unhealthy" --format '{{.Names}} ({{.Status}})' 2>/dev/null || true)
if [[ -n "$CONTAINERS_DOWN" ]]; then
    ANOMALIES+=("Containers essenciais do Ars Factory caidos: $(echo "$CONTAINERS_DOWN" | tr '\n' ' ')")
fi

if [[ ${#ANOMALIES[@]} -gt 0 ]]; then
    echo "ANOMALY: $(IFS='; '; echo "${ANOMALIES[*]}")"
    exit 1
else
    echo "OK"
    exit 0
fi
