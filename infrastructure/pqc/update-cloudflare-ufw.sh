#!/usr/bin/env bash
set -euo pipefail

CF_IPV4=$(curl -fsSL --retry 3 https://www.cloudflare.com/ips-v4)
CF_IPV6=$(curl -fsSL --retry 3 https://www.cloudflare.com/ips-v6)

if [ -z "$CF_IPV4" ]; then
    echo "ERRO: Falha ao obter lista de IPs Cloudflare."
    exit 1
fi

for ip in $CF_IPV4 $CF_IPV6; do
    ufw allow proto tcp from "$ip" to any port 80,443 comment "Cloudflare Edge Proxy" >/dev/null
    ufw allow proto udp from "$ip" to any port 443 comment "Cloudflare Edge QUIC" >/dev/null
done
echo "CIDRs Cloudflare sincronizados com sucesso."
