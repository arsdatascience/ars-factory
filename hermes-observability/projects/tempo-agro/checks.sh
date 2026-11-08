#!/usr/bin/env bash
# Deterministic Check Script - Tempo Agro (Climate & Forecast)
set -euo pipefail

ANOMALIES=()

# 1. Verifica se ha containers com falha no projeto Tempo Agro
TEMPO_FAILED=$(docker ps -a --filter "label=coolify.projectUuid=ta4zqzwfhnwj6oknsvdhvfm0" --filter "status=exited" --filter "health=unhealthy" --format '{{.Names}} ({{.Status}})' 2>/dev/null || true)
if [[ -n "$TEMPO_FAILED" ]]; then
    ANOMALIES+=("Containers climáticos com falha: $(echo "$TEMPO_FAILED" | head -n 5 | tr '\n' ' ')")
fi

if [[ ${#ANOMALIES[@]} -gt 0 ]]; then
    echo "ANOMALY: $(IFS='; '; echo "${ANOMALIES[*]}")"
    exit 1
else
    echo "OK"
    exit 0
fi
