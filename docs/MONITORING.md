# 📡 Infraestrutura de Monitoramento & Observabilidade — EVEO Cloud

Este documento consolida o mapeamento completo da infraestrutura de monitoramento ativa no servidor dedicado da **EVEO Cloud** (`sp-177-104-141-223.l3.eveocloud.net`, IP: `177.104.141.223`) e sua integração com o **Ars Factory**.

---

## 1. URLs Nativas de Monitoramento (Coolify)

| Painel | URL | Descrição |
| :--- | :--- | :--- |
| **Fleet Metrics** | [coolify.arsdatascience.com/metrics](https://coolify.arsdatascience.com/metrics) | Gráficos em tempo real de CPU, Memória, I/O e Rede de todos os containers ativos no host. |
| **HTTP Traffic Analytics** | [coolify.arsdatascience.com/analytics](https://coolify.arsdatascience.com/analytics) | Requisições por segundo, latência média, códigos HTTP (2xx/4xx/5xx) e caminhos roteados pelo Traefik. |
| **Host Sentinel** | [coolify.arsdatascience.com/server/7p5nfb1vwriy7toqq7usgiea/sentinel](https://coolify.arsdatascience.com/server/7p5nfb1vwriy7toqq7usgiea/sentinel) | Saúde e telemetria do nó físico/VPS da EVEO Cloud. |
| **Terminal & Containers** | [coolify.arsdatascience.com/terminal](https://coolify.arsdatascience.com/terminal) | Inspeção em tempo real e acesso interativo aos containers Docker em execução. |

---

## 2. Stack de Observabilidade Ativa no Servidor

O servidor possui um stack completo conteinerizado sob o namespace `uenauovgxblihpw9qyn2juln`:

* **Prometheus (`prometheus-uenauovgxblihpw9qyn2juln`):** Coleta e armazena séries temporais de métricas a cada 15 segundos.
* **Grafana (`grafana-uenauovgxblihpw9qyn2juln`):** Dashboards visuais e sistema de alertas unificado.
* **Uptime Kuma (`uptime-kuma-uenauovgxblihpw9qyn2juln`):** Monitoramento contínuo de disponibilidade de serviços e endpoints HTTP `/health`.
* **cAdvisor & Node Exporter (`cadvisor-...`, `node-exporter-...`):** Telemetria em nível de kernel, CPU, memória e isolamento de containers.
* **Loki & Promtail (`loki-...`, `promtail-...`):** Coleta agregada, indexação e busca de logs de todos os containers.
* **Tempo & OpenTelemetry Collector (`tempo-...`, `otel-collector-...`):** Tracing distribuído de latência entre microsserviços.

---

## 3. Integração do Ars Factory com o Monitoramento

A aplicação **Ars Factory** já inclui nativamente os endpoints exigidos pelos agentes de observabilidade:

* **Probe de Saúde:** `GET /health` (responde `200 OK` para o Coolify e Uptime Kuma).
* **Probe de Prontidão:** `GET /ready` (verifica se os serviços de fila estão aptos a receber novas tarefas).
* **Prometheus Exporter:** `GET /metrics` (exporta contadores no formato padrão Prometheus):
  - `ars_factory_uptime_seconds`
  - `ars_factory_tasks_total{status="..."}`
  - `ars_factory_memory_bytes{type="rss|heap_used|heap_total"}`
* **JSON Metrics API:** `GET /api/v1/metrics` (para consumo por dashboards customizados e API).
* **Catálogo de Serviços:** `GET /api/v1/monitoring/services` (retorna o inventário completo da infraestrutura).

---

## 4. Apontamento de Rede e DNS (Cloudflare)

* **IP do Servidor EVEO:** `177.104.141.223`
* **Zonas Gerenciadas:**
  - `arsdatascience.com` (Zone ID: `6eaa9841ec4beb20e8c0f3aeca739e11`)
  - `arsdatascience.com.br` (Zone ID: `5c436294973b22ca7e595e31cdc54c56`)
* **Exemplo de Registro:**
  - Tipo: `A`
  - Nome: `factory` (para `factory.arsdatascience.com`)
  - Conteúdo: `177.104.141.223`
  - Proxy: `Habilitado (Nuvem Laranja)` para proteção DDoS e terminação SSL Cloudflare.

---

## 5. Arquitetura de Cache & Defesa Ativa em Tempo Real (Redis)

Para mitigar o consumo de RAM do Loki e proporcionar reação em sub-milissegundos contra tentativas de invasão, a infraestrutura conta com uma instância dedicada de **Redis Cache** (`redis-monitoring-cache`):

* **Loki Query-Range Cache:** Resultados de consultas pesadas de logs (especialmente auditorias de SSH e Fail2ban) são armazenados em memória no Redis com TTL de 1h, reduzindo pela metade a descompactação de chunks e prevenindo sobrecargas de CPU/RAM.
* **Tabela de Ameaças & Blacklist Instantânea:** IPs maliciosos detectados em ataques de força bruta são gravados no Redis com expiração (`blacklist:ip:<ip>`). Traefik e middlewares de API realizam verificações $O(1)$ (< 0.2ms) descartando requisições hostis antes que atinjam o banco de dados ou a aplicação.

---

## 6. Persistência de Longo Prazo & Auditoria (TimescaleDB / PostgreSQL)

O banco **`postgresql-database-arsfactory`** (TimescaleDB / PostgreSQL 16) armazena permanentemente os eventos históricos de observabilidade e segurança através das seguintes tabelas estruturadas:

1. **`monitoring_logs` (Hypertable):** Armazenamento de logs operacionais agregados indexados por nível, serviço e metadados JSONB.
2. **`security_threat_events` (Hypertable):** Registro forense de tentativas de invasão, ataques SSH ao root, e falhas de autenticação 401/403.
3. **`active_blacklisted_ips`:** Catálogo persistente de IPs banidos com contagem de reincidência, severidade e data de expiração, sincronizado com o Redis.
4. **`system_metrics_archive` (Hypertable):** Séries temporais históricas consolidadas para relatórios executivos de capacidade e consumo de hardware.
5. **`rpa_task_audit_logs`:** Rastreabilidade de ponta a ponta da execução de tarefas e robôs pelo Ars Factory.

---

## 7. Dashboards Otimizados no Grafana

| Dashboard | Intervalo | Otimização Implementada |
| :--- | :--- | :--- |
| **Docker Containers - Central de Logs (Loki)** | `30s` | Variável `$level` (Error, Warn, Info, Debug), alarmes de erro no topo, limite seguro de 200 linhas e remoção de wrap DOM pesado. |
| **Cadvisor Exporter** | `30s` | UIDs alinhados ao Prometheus, variáveis aceleradas por índice, cards de topo de Containers Ativos e CPU/RAM total, e queries limitadas com `topk(10)`. |
| **Cybersecurity & Threat Detection (SOC)** | `1m` | Restrição da varredura de falhas 401/403 aos containers de API/Edge na última 1h, eliminando varreduras redundantes em 114 containers. |
| **ContDigital Platform - 360** | `30s` | Substituição de dados mock `vector(1)` por telemetria viva via cAdvisor em 15 microsserviços com sinalização verde/vermelha. |
| **Node Exporter Full** | `1m` | Preservação de todas as 137 métricas detalhadas em seções expansíveis (`collapsed: true`), mantendo leveza sobre 80 vCPUs. |


