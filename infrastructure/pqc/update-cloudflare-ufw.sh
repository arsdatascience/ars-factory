#!/usr/bin/env bash
set -euo pipefail

ipset create cloudflare_v4 hash:net family inet -exist
ipset create cloudflare_v4_temp hash:net family inet -exist
ipset flush cloudflare_v4_temp

CF_IPV4=$(curl -fsSL --retry 3 https://www.cloudflare.com/ips-v4)
if [[ -z "$CF_IPV4" ]]; then
    echo "ERRO: Falha ao obter lista de IPs Cloudflare." >&2
    exit 1
fi

for cidr in $CF_IPV4; do
    ipset add cloudflare_v4_temp "$cidr" -exist
done

ipset swap cloudflare_v4_temp cloudflare_v4
ipset destroy cloudflare_v4_temp

mkdir -p /etc/iptables
ipset save cloudflare_v4 > /etc/iptables/cloudflare_v4.set 2>/dev/null || true
if ipset list admin_ips >/dev/null 2>&1; then
    ipset save admin_ips > /etc/iptables/admin_ips.set 2>/dev/null || true
fi

echo "CIDRs Cloudflare sincronizados atomicamente no ipset cloudflare_v4."
