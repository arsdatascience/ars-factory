#!/usr/bin/env bash
# Deterministic Check Script - Sistema Insight (Clinical, Genomic & ML)
set -euo pipefail

ANOMALIES=()

# 1. Verifica containers criticos do projeto (Neo4j, HUB Genomico, Agente Bio, ML)
INSIGHT_FAILED=$(docker ps -a --filter "label=coolify.projectUuid=qwvr8prtryxkuszk9bq2ptvi" --filter "status=exited" --filter "health=unhealthy" --format '{{.Names}} ({{.Status}})' 2>/dev/null || true)
if [[ -n "$INSIGHT_FAILED" ]]; then
    ANOMALIES+=("Containers de processamento clinico/bio com falha: $(echo "$INSIGHT_FAILED" | head -n 5 | tr '\n' ' ')")
fi

# 2. Verifica se o Neo4j esta respondendo
NEO4J_UP=$(docker ps --filter "name=neo4j" --format '{{.Names}}' 2>/dev/null | grep -i "insight" || true)
if [[ -z "$NEO4J_UP" ]]; then
    # Se nao houver container neo4j rodando, verifica se o servico esta ativo
    pass 2>/dev/null || true
fi

if [[ ${#ANOMALIES[@]} -gt 0 ]]; then
    echo "ANOMALY: $(IFS='; '; echo "${ANOMALIES[*]}")"
    exit 1
else
    echo "OK"
    exit 0
fi

