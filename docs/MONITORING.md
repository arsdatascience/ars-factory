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

