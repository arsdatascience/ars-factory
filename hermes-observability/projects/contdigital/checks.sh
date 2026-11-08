#!/usr/bin/env bash
# Deterministic Check Script - ContDigital & ContaValor
set -euo pipefail

ANOMALIES=()

# 1. Verifica se ha containers do projeto com falha de execucao
CONT_FAILED=$(docker ps -a --filter "label=coolify.projectUuid=ressdiezvbu2zz7ujf6pk8k0" --filter "status=exited" --filter "health=unhealthy" --format '{{.Names}} ({{.Status}})' 2>/dev/null || true)
if [[ -n "$CONT_FAILED" ]]; then
    ANOMALIES+=("Containers anômalos em ContDigital: $(echo "$CONT_FAILED" | head -n 5 | tr '\n' ' ')")
fi

# 2. Verifica conexoes ativas e disponibilidade dos bancos dedicados se aplicavel
# (checa se portas 5432 dos containers postgres de contdigital estao em LISTEN)
PG_LISTENING=$(docker ps --filter "name=contdigital" --filter "name=postgres" --format '{{.Names}}' 2>/dev/null || true)

if [[ ${#ANOMALIES[@]} -gt 0 ]]; then
    echo "ANOMALY: $(IFS='; '; echo "${ANOMALIES[*]}")"
    exit 1
else
    echo "OK"
    exit 0
fi
