# 🏭 Ars Factory

> **Motor Inteligente de Orquestração RPA, Compilação de Robôs e Observabilidade Avançada**  
> Hospedado no servidor dedicado **EVEO Cloud** e integrado ao **Coolify v4.6**.

---

## 🚀 Visão Geral

O **Ars Factory** é o centro nevrálgico para automação de processos, pipelines de dados e orquestração de robôs da **Ars Data Science**.

* ⚡ **Arquitetura Moderna:** Baseada em Node.js 24 + TypeScript com Hono (alta performance e consumo ultra-baixo de recursos).
* 🤖 **Compilação de Robôs RPA:** Endpoint de empacotamento e gestão de artefatos de robôs autônomos.
* 📋 **Fila de Tarefas:** Orquestrador integrado de tarefas com suporte a ciclo de vida (`queued`, `running`, `completed`, `failed`).
* 📊 **Observabilidade Nativa:** Exportador padrão Prometheus (`/metrics`), probes de saúde (`/health`, `/ready`) e Mission Control UI integrada.
* ☁️ **Coolify Ready:** `Dockerfile` multi-stage com healthcheck nativo e suporte a Traefik com SSL automático.

---

## 🛠️ Stack Tecnológica

* **Runtime:** Node.js v24 LTS + TypeScript 5.7
* **Framework Web:** [Hono](https://hono.dev) + `@hono/node-server`
* **Logging Estruturado:** [Pino](https://getpino.io)
* **Validação:** [Zod](https://zod.dev)
* **Deploy & Conteinerização:** Docker & Docker Compose
* **Orquestrador de Servidor:** Coolify no host EVEO Cloud

---

## 📡 Endpoints da API

### Monitoramento & Saúde
* `GET /` — Painel Mission Control & Observability Dashboard (Interface Web)
* `GET /health` — Probe de saúde da aplicação (`status: ok`)
* `GET /ready` — Probe de prontidão do orquestrador
* `GET /metrics` — Métricas no formato padrão **Prometheus** (para raspagem do Prometheus / cAdvisor)
* `GET /api/v1/metrics` — Métricas do sistema e tarefas em JSON
* `GET /api/v1/monitoring/services` — Catálogo completo das ferramentas de observabilidade

### Tarefas da Fábrica
* `GET /api/v1/tasks` — Listar tarefas recentes
* `POST /api/v1/tasks` — Criar e enfileirar nova tarefa
* `GET /api/v1/tasks/:id` — Obter detalhes e logs de uma tarefa específica
* `POST /api/v1/tasks/:id/cancel` — Cancelar execução de uma tarefa

### Robôs RPA & Compilação
* `GET /api/v1/builds` — Listar pacotes de robôs compilados
* `POST /api/v1/builds` — Disparar compilação de um robô
* `GET /api/v1/builds/:id` — Obter status e logs de compilação
* `GET /api/v1/builds/:id/artifact` — Download/metadados do artefato compilado

---

## 🐳 Executando Localmente

### Pré-requisitos
* Node.js v22+ ou v24+
* Docker e Docker Compose (opcional)

### Passo a Passo

```bash
# 1. Instalar dependências
npm install

# 2. Executar em modo desenvolvimento
npm run dev

# 3. Compilar TypeScript
npm run build

# 4. Executar versão de produção
npm start
```

### Via Docker Compose

```bash
docker compose up -d --build
```

O dashboard estará disponível em `http://localhost:4001`.

---

## 🌐 Deploy no Coolify (Servidor EVEO)

1. **Repositório:** `https://github.com/arsdatascience/ars-factory.git`
2. **Projeto no Coolify:** `Ars Factory` (`urgj6app1ixcvgkuqj5uyztx`)
3. **Ambiente:** `production` (`3ya6aogbpifrntv28genyp2f`)
4. **Build Pack:** `Dockerfile`
5. **Porta:** `4001`
6. **Healthcheck:** `/health`
7. **Documentação completa de monitoramento:** Consulte [docs/MONITORING.md](docs/MONITORING.md).
