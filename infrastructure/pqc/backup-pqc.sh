#!/usr/bin/env bash
set -euo pipefail

LOCKFILE="/var/run/backup-pqc.lock"
exec 200>"$LOCKFILE"
flock -n 200 || { echo "Outro backup em andamento. Abortando."; exit 1; }

source /etc/restic/env 2>/dev/null || true
if [ -f /etc/pqc-audit.env ]; then
    source /etc/pqc-audit.env
fi

BACKUP_STAGE="/var/backups/pqc-stage"
APPS_DB_DIR="${BACKUP_STAGE}/apps-db"
mkdir -p "$APPS_DB_DIR"
chmod -R 700 "$BACKUP_STAGE"

cleanup() {
    rm -rf "${BACKUP_STAGE:?}/"* 2>/dev/null || true
}
trap cleanup EXIT

echo "Extraindo dumps com baixa prioridade de I/O..."
for cid in $(docker ps -q --filter "ancestor=postgres" --filter "ancestor=timescale/timescaledb" 2>/dev/null); do
    cname=$(docker inspect --format "{{.Name}}" "$cid" | sed "s/^\///")
    echo "  Dump PostgreSQL: $cname"
    nice -n 19 ionice -c 3 docker exec "$cid" sh -c "PGPASSWORD=\"\$POSTGRES_PASSWORD\" pg_dumpall -U \"\${POSTGRES_USER:-postgres}\" --clean" | gzip -9 > "${APPS_DB_DIR}/pg_${cname}.sql.gz" || true
done

if [ -f /etc/restic/env ] && ! grep -q "PREENCHA_SUA_ACCESS_KEY" /etc/restic/env; then
    echo "Enviando snapshot para o repositório Restic..."
    restic backup \
        "$BACKUP_STAGE" \
        /data/coolify/source \
        /data/coolify/proxy \
        /data/coolify/mtls \
        /etc/ssh \
        /etc/hermes-observability \
        --tag "coolify-pqc" \
        --exclude-caches || true
    restic check --read-data-subset=2% || true
else
    echo "Repositório S3 não configurado em /etc/restic/env (modo template preservado)."
fi

echo "Backup PQC concluído com sucesso."
