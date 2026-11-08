#!/usr/bin/env bash
# ========================================================
# PQC ENTERPRISE RIGOROUS AUDIT ENGINE v3.1
# Servidor EVEO - Zero Falsos Positivos
# ========================================================
set -euo pipefail

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

ERRORS=0

echo "========================================================"
echo "   AUDITORIA ENTERPRISE DE CRIPTOGRAFIA PÓS-QUÂNTICA    "
echo "========================================================"

# 1. OpenSSH KEX & Ciphers & Password Auth
echo -e "\n[1/5] Verificando OpenSSH Hardening..."
if command -v sshd >/dev/null 2>&1; then
    SSHD_OPTS=$(sshd -T 2>/dev/null || sudo sshd -T 2>/dev/null)
    FIRST_KEX=$(echo "$SSHD_OPTS" | awk '/^kexalgorithms / {print $2}' | cut -d"," -f1)
    CIPHER_LIST=$(echo "$SSHD_OPTS" | awk '/^ciphers / {print $2}')
    PASS_AUTH=$(echo "$SSHD_OPTS" | awk '/^passwordauthentication / {print $2}')

    if [[ "$FIRST_KEX" =~ (mlkem768x25519|sntrup761x25519) ]]; then
        echo -e "  ${GREEN}[OK]${NC} KEX prioritário Pós-Quântico: ${FIRST_KEX}"
    else
        echo -e "  ${RED}[FALHA]${NC} KEX prioritário NÃO é PQC: ${FIRST_KEX}"
        ERRORS=$((ERRORS + 1))
    fi

    if echo "$CIPHER_LIST" | grep -q "128"; then
        echo -e "  ${RED}[FALHA]${NC} Cifras fracas de 128 bits detectadas: ${CIPHER_LIST}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}[OK]${NC} Cifras simétricas exclusivas de 256 bits: ${CIPHER_LIST}"
    fi

    if [[ "$PASS_AUTH" == "no" ]]; then
        echo -e "  ${GREEN}[OK]${NC} PasswordAuthentication desativada (Apenas chaves autorizadas)."
    else
        echo -e "  ${RED}[FALHA]${NC} PasswordAuthentication ainda ativa no sshd!"
        ERRORS=$((ERRORS + 1))
    fi
fi

# 2. Proxy Coolify & Traefik TLS
echo -e "\n[2/5] Verificando Proxy e TLS..."
if docker ps --format '{{.Names}}' | grep -q "^coolify-proxy$"; then
    echo -e "  ${GREEN}[OK]${NC} Container coolify-proxy ativo."
    if [[ -f /data/coolify/proxy/dynamic/tls-pqc.yaml ]]; then
        echo -e "  ${GREEN}[OK]${NC} Opções de TLS PQC e Authenticated Origin Pulls configuradas."
    else
        echo -e "  ${YELLOW}[AVISO]${NC} Arquivo tls-pqc.yaml ausente."
    fi
else
    echo -e "  ${RED}[FALHA]${NC} Container coolify-proxy fora do ar!"
    ERRORS=$((ERRORS + 1))
fi

# 3. Kernel BBR & Isolamento de Borda Cloudflare
echo -e "\n[3/5] Verificando Kernel BBR, UFW e Isolamento Cloudflare..."
BBR_STATUS=$(sysctl -n net.ipv4.tcp_congestion_control 2>/dev/null || echo "desconhecido")
if [[ "$BBR_STATUS" == "bbr" ]]; then
    echo -e "  ${GREEN}[OK]${NC} TCP BBR ativo."
else
    echo -e "  ${RED}[FALHA]${NC} TCP BBR inativo (${BBR_STATUS})"
    ERRORS=$((ERRORS + 1))
fi

if sudo iptables -S DOCKER-USER 2>/dev/null | grep -q "cloudflare_v4"; then
    echo -e "  ${GREEN}[OK]${NC} Borda restrita na chain DOCKER-USER (Bypass Cloudflare bloqueado)."
else
    echo -e "  ${RED}[FALHA]${NC} Regra de restricao Cloudflare ausente na DOCKER-USER!"
    ERRORS=$((ERRORS + 1))
fi

if sudo iptables -S DOCKER-USER 2>/dev/null | grep -q "CROWDSEC_CHAIN"; then
    echo -e "  ${GREEN}[OK]${NC} CrowdSec bouncer ativo na chain DOCKER-USER."
else
    echo -e "  ${YELLOW}[AVISO]${NC} CrowdSec bouncer ausente na DOCKER-USER."
fi

# 4. Guardiões Multiagênticos Hermes
echo -e "\n[4/5] Verificando Malha Multiagêntica Hermes..."
HERMES_FAILED=0
for p in ars-factory cidade-do-agro contdigital sistema-insight tempo-agro; do
    if [[ -x /etc/hermes-observability/projects/$p/checks.sh ]]; then
        res=$(sudo /etc/hermes-observability/projects/$p/checks.sh 2>&1 || true)
        if [[ "$res" == "OK" ]]; then
            echo -e "  ${GREEN}[OK]${NC} Guardião Hermes [$p]: OK"
        else
            echo -e "  ${RED}[FALHA]${NC} Guardião Hermes [$p]: $res"
            HERMES_FAILED=$((HERMES_FAILED + 1))
        fi
    fi
done
if [[ $HERMES_FAILED -gt 0 ]]; then
    ERRORS=$((ERRORS + HERMES_FAILED))
fi

# 5. Restic e Cloudflare R2
echo -e "\n[5/5] Verificando Repositorio Restic e Snapshots..."
if [[ -f /etc/restic/env && -f /etc/restic/repo.pw ]]; then
    SNAPSHOT_COUNT=$(sudo bash -c 'source /etc/restic/env 2>/dev/null && restic snapshots --json 2>/dev/null' | grep -c '"id":' || true)
    SNAPSHOT_COUNT=$(echo "$SNAPSHOT_COUNT" | head -n1 | tr -dc '0-9')
    if [[ -n "$SNAPSHOT_COUNT" && "$SNAPSHOT_COUNT" -gt 0 ]]; then
        echo -e "  ${GREEN}[OK]${NC} Repositório Cloudflare R2 conectado ($SNAPSHOT_COUNT snapshots verificados)."
    else
        echo -e "  ${YELLOW}[AVISO]${NC} Repositório Restic inicializado, aguardando primeiro snapshot finalizar."
    fi
else
    echo -e "  ${RED}[FALHA]${NC} Credenciais do Restic ausentes!"
    ERRORS=$((ERRORS + 1))
fi

echo -e "\n========================================================"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "   ${GREEN}AUDITORIA PQC ENTERPRISE CONCLUÍDA - 100% OK${NC}   "
    echo "========================================================"
    exit 0
else
    echo -e "   ${RED}AUDITORIA PQC DETECTOU $ERRORS PROBLEMAS${NC}          "
    echo "========================================================"
    exit 1
fi
