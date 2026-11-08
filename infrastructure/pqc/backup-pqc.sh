#!/usr/bin/env bash
# ========================================================
# PQC ENTERPRISE RESTIC MULTI-PROJECT BACKUP ENGINE
# Servidor EVEO - Zero Downtime, High Performance & Integrity
# ========================================================
set -euo pipefail

LOCKFILE="/var/run/backup-pqc.lock"
exec 200>"$LOCKFILE"
flock -n 200 || { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Outro backup PQC em andamento. Abortando."; exit 1; }

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] === INICIANDO BACKUP PQC ENTERPRISE ==="

if [[ ! -f /etc/restic/env ]]; then
    echo "ERRO CRITICO: Arquivo /etc/restic/env nao encontrado." >&2
    exit 1
fi
source /etc/restic/env

if [[ -f /etc/pqc-audit.env ]]; then
    source /etc/pqc-audit.env
fi

BACKUP_STAGE="/var/backups/pqc-stage"
APPS_DB_DIR="${BACKUP_STAGE}/apps-db"
mkdir -p "$APPS_DB_DIR"
chmod 700 "$BACKUP_STAGE" "$APPS_DB_DIR"

cleanup() {
    echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Limpando area de staging temporaria..."
    rm -rf "${BACKUP_STAGE:?}"/* 2>/dev/null || true
}
trap cleanup EXIT

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] 1. Identificando e extraindo dumps de bancos de dados..."

DUMPED_COUNT=0

for cid in $(docker ps -q); do
    cname=$(docker inspect --format '{{.Name}}' "$cid" | sed 's/^\///')
    cimage=$(docker inspect --format '{{.Config.Image}}' "$cid")

    # Ignora containers temporarios de verificacao, teste ou importacao
    if echo "$cname" | grep -qiE 'check|test|migration|import|validation'; then
        continue
    fi

    cenv=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$cid")

    # Identifica containers PostgreSQL / TimescaleDB
    if echo "$cimage" | grep -qiE 'postgres|timescale' || echo "$cenv" | grep -q '^POSTGRES_'; then
        echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')]   [PG/Timescale] Iniciando dump do container: $cname ($cimage)"
        
        pg_user=$(echo "$cenv" | grep '^POSTGRES_USER=' | cut -d'=' -f2- | head -n1 || true)
        pg_pw=$(echo "$cenv" | grep '^POSTGRES_PASSWORD=' | cut -d'=' -f2- | head -n1 || true)
        
        if [[ -z "$pg_user" ]]; then
            if [[ "$cname" == *"coolify"* ]]; then
                pg_user="coolify"
            else
                pg_user="postgres"
            fi
        fi

        target_dump="${APPS_DB_DIR}/pg_${cname}.sql.gz"
        
        # Executa dump com pigz multi-thread (-1 rapido) com nice/ionice
        nice -n 19 ionice -c 3 docker exec -e PGPASSWORD="${pg_pw}" "$cid" \
            pg_dumpall -h 127.0.0.1 -U "${pg_user}" --clean 2>/dev/null | pigz -p 4 -1 > "$target_dump" || {
                # Fallback via socket se localhost falhar
                nice -n 19 ionice -c 3 docker exec -e PGPASSWORD="${pg_pw}" "$cid" \
                    pg_dumpall -U "${pg_user}" --clean 2>/dev/null | pigz -p 4 -1 > "$target_dump" || true
            }

        if [[ -s "$target_dump" ]]; then
            fsize=$(du -h "$target_dump" | cut -f1)
            echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')]     [OK] Dump concluido: $target_dump ($fsize)"
            DUMPED_COUNT=$((DUMPED_COUNT + 1))
        else
            echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')]     [AVISO] Dump falhou ou vazio para $cname"
            rm -f "$target_dump"
        fi
    fi

    # Identifica containers Neo4j
    if echo "$cimage" | grep -qi 'neo4j'; then
        echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')]   [Neo4j] Iniciando dump do container de grafo: $cname"
        target_dump="${APPS_DB_DIR}/neo4j_${cname}.tar.gz"
        nice -n 19 ionice -c 3 docker exec "$cid" tar -czf - /data 2>/dev/null > "$target_dump" || true
        if [[ -s "$target_dump" ]]; then
            fsize=$(du -h "$target_dump" | cut -f1)
            echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')]     [OK] Dump Neo4j concluido: $target_dump ($fsize)"
            DUMPED_COUNT=$((DUMPED_COUNT + 1))
        else
            rm -f "$target_dump"
        fi
    fi
done

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Total de bancos de dados dumpados com sucesso: $DUMPED_COUNT"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] 2. Enviando snapshot criptografado PQC para o Cloudflare R2..."

BACKUP_PATHS=("$BACKUP_STAGE")
for p in /data/coolify/source /data/coolify/proxy /data/coolify/mtls /etc/ssh /etc/hermes-observability; do
    if [[ -d "$p" || -f "$p" ]]; then
        BACKUP_PATHS+=("$p")
    fi
done

restic backup \
    "${BACKUP_PATHS[@]}" \
    --tag "pqc-enterprise" \
    --tag "coolify-multi-project" \
    --exclude-caches

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] 3. Verificando integridade do repositorio..."
restic check --read-data-subset=1%

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] === BACKUP PQC CONCLUIDO COM SUCESSO ==="
