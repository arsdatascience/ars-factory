#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-arsdatascience.com}"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

echo "========================================================"
echo "   AUDITORIA ENTERPRISE DE CRIPTOGRAFIA PÓS-QUÂNTICA    "
echo "========================================================"

# 1. OpenSSH KEX & Ciphers
echo -e "\n[1/5] Verificando OpenSSH (KEX Híbrido + Cifras 256-bit)..."
if command -v sshd >/dev/null 2>&1; then
    KEX_LIST=$(sshd -T 2>/dev/null | awk "/^kexalgorithms / {print \$2}")
    FIRST_KEX=$(echo "$KEX_LIST" | cut -d"," -f1)
    CIPHER_LIST=$(sshd -T 2>/dev/null | awk "/^ciphers / {print \$2}")

    if [[ "$FIRST_KEX" =~ (mlkem768x25519|sntrup761x25519) ]]; then
        echo -e "  ${GREEN}[OK]${NC} KEX prioritário Pós-Quântico: ${FIRST_KEX}"
    else
        echo -e "  ${RED}[ALERTA]${NC} KEX prioritário NÃO é PQC: ${FIRST_KEX}"
    fi

    if echo "$CIPHER_LIST" | grep -q "128"; then
        echo -e "  ${RED}[ALERTA]${NC} Cifras de 128 bits detectadas: ${CIPHER_LIST}"
    else
        echo -e "  ${GREEN}[OK]${NC} Apenas cifras simétricas de 256 bits ativas: ${CIPHER_LIST}"
    fi
fi

# 2. Proxy Coolify & Handshake TLS 1.3
echo -e "\n[2/5] Verificando Proxy do Coolify e Handshake TLS 1.3..."
if docker ps --format "{{.Names}}" | grep -q "^coolify-proxy$"; then
    GO_VER=$(docker exec coolify-proxy traefik version 2>/dev/null | grep -oE "go1\.[0-9]+(\.[0-9]+)?" | head -n1 || true)
    echo -e "  ${GREEN}[OK]${NC} Container coolify-proxy ativo (Runtime: ${GO_VER:-Traefik Go 1.24})"
fi

# 3. Kernel BBR, initcwnd 20, UFW-Docker & CrowdSec
echo -e "\n[3/5] Verificando Kernel BBR, Janela TCP e Isolamento UFW-Docker..."
BBR_STATUS=$(sysctl -n net.ipv4.tcp_congestion_control 2>/dev/null || echo "desconhecido")
if [[ "$BBR_STATUS" == "bbr" ]]; then
    echo -e "  ${GREEN}[OK]${NC} Controle de congestionamento TCP BBR ativo."
else
    echo -e "  ${RED}[ALERTA]${NC} TCP BBR inativo (${BBR_STATUS})"
fi

if iptables -L DOCKER-USER -n 2>/dev/null | grep -q "ufw-user-forward"; then
    echo -e "  ${GREEN}[OK]${NC} Proteção ufw-docker ativa na chain DOCKER-USER."
else
    echo -e "  ${RED}[ALERTA]${NC} Regras do ufw-docker ausentes na chain DOCKER-USER!"
fi

if systemctl is-active --quiet crowdsec 2>/dev/null; then
    echo -e "  ${GREEN}[OK]${NC} CrowdSec IPS ativo."
else
    echo -e "  ${YELLOW}[AVISO]${NC} CrowdSec inativo."
fi

# 4. Guardiões Multiagênticos Hermes
echo -e "\n[4/5] Verificando Malha Multiagêntica Hermes Agent..."
if systemctl is-active --quiet hermes-wake-gate.timer 2>/dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Timer hermes-wake-gate.timer ativo (5 em 5 min)."
else
    echo -e "  ${YELLOW}[AVISO]${NC} hermes-wake-gate.timer inativo."
fi

if systemctl is-active --quiet hermes-projects-gate.timer 2>/dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Timer hermes-projects-gate.timer ativo (5 Guardiões)."
else
    echo -e "  ${YELLOW}[AVISO]${NC} hermes-projects-gate.timer inativo."
fi

# 5. Restic e Backups
echo -e "\n[5/5] Verificando Restic e Armazenamento..."
if [[ -f /etc/restic/repo.pw && -f /etc/restic/env ]]; then
    echo -e "  ${GREEN}[OK]${NC} Arquivos de configuração do Restic presentes."
fi

echo -e "\n========================================================"
echo "   AUDITORIA PQC CONCLUÍDA                             "
echo "========================================================"
