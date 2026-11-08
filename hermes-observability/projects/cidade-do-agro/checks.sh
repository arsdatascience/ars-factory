#!/usr/bin/env bash
# Deterministic Check Script - Cidade do Agro (IoT & Várzea)
set -euo pipefail

ANOMALIES=()

# 1. Verifica se os containers essenciais do projeto estao rodando
CORE_CONTAINERS=("vy3uu2zxck2zmoc9kzfa9iob" "urzxisgl3k42tr3xqxlizaui" "xkvwidir38mgeevl7ibiogxf" "j4vjgzbfr0ztwmxaxj25f9bw")
for c_uuid in "${CORE_CONTAINERS[@]}"; do
    STATUS=$(docker ps -a --filter "name=$c_uuid" --format '{{.Status}}' 2>/dev/null || true)
    if [[ -z "$STATUS" || "$STATUS" =~ "Exited" || "$STATUS" =~ "unhealthy" ]]; then
        ANOMALIES+=("Container critico Cidade do Agro ($c_uuid) com status anomalo: ${STATUS:-Nao encontrado}")
    fi
done

# 2. Verifica se a porta MQTT (1883/8883) do EMQX esta respondendo
if ! docker ps | grep -q "urzxisgl3k42tr3xqxlizaui"; then
    ANOMALIES+=("Broker MQTT AU915 fora do ar")
fi

if [[ ${#ANOMALIES[@]} -gt 0 ]]; then
    echo "ANOMALY: $(IFS='; '; echo "${ANOMALIES[*]}")"
    exit 1
else
    echo "OK"
    exit 0
fi
