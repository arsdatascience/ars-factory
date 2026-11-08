# 🏭 Ars Factory

> **Mission Control de automação RPA e observabilidade para EVEO Cloud e Coolify.**

---

## 🚀 Visão Geral

O **Ars Factory** exibe o histórico persistente de tarefas e builds no PostgreSQL. O modo padrão é somente consulta. O modo demonstrativo, ativado com `FACTORY_DEMO_MODE=true`, registra simulações com status `simulated`. A execução de RPA e a geração de artefatos reais exigem executores dedicados.

* ⚡ **Arquitetura Moderna:** Baseada em Node.js 24 + TypeScript com Hono (alta performance e consumo ultra-baixo de recursos).
* 🤖 **Histórico de builds:** Solicitações de demonstração e histórico de mudanças.
* 📋 **Fila demonstrativa:** Estado persistente e transições atômicas de `queued` para `simulated` ou, no caso de tarefas, `cancelled`.
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

O Mission Control usa HTTP Basic com o usuário `operator` e o valor de `API_SECRET_TOKEN` como senha. A API e `/metrics` aceitam o cabeçalho `Authorization: Bearer <token>`. Use HTTPS no proxy do ambiente publicado. `/health` e `/ready` são públicos para as sondas.

As listagens aceitam `limit` de 1 a 100 e `offset` de 0 a 10.000. O próximo deslocamento vem em `nextOffset` quando disponível. Payloads e manifestos aparecem somente nos detalhes. Requisições `POST`, inclusive cancelamento, exigem `Content-Type: application/json` e aceitam até 64 KiB.

### Monitoramento & Saúde
* `GET /` — Painel Mission Control & Observability Dashboard (Interface Web)
* `GET /health` — Probe de saúde da aplicação (`status: ok`)
* `GET /ready` — Retorna `503` sem credencial válida configurada ou sem esquema de jobs disponível. O campo `mode` indica `demo` ou `read-only`.
* `GET /metrics` — Métricas no formato padrão **Prometheus** (para raspagem do Prometheus / cAdvisor)
* `GET /api/v1/metrics` — Métricas do sistema e tarefas em JSON
* `GET /api/v1/monitoring/services` — Catálogo completo das ferramentas de observabilidade

### Tarefas da Fábrica
* `GET /api/v1/tasks` — Listar tarefas recentes
* `POST /api/v1/tasks` — Enfileirar tarefa no modo demo
* `GET /api/v1/tasks/:id` — Obter detalhes e histórico de estados
* `POST /api/v1/tasks/:id/cancel` — Cancelar tarefa na fila. Repetir um cancelamento já concluído retorna `200`. Tarefas já simuladas retornam `409`.

### Robôs RPA & Compilação
* `GET /api/v1/builds` — Listar solicitações de build
* `POST /api/v1/builds` — Enfileirar build no modo demo
* `GET /api/v1/builds/:id` — Obter detalhes e histórico de estados
* `GET /api/v1/builds/:id/artifact` — Retorna `404` enquanto a geração de artefatos estiver indisponível

---

## 🐳 Executando Localmente

### Pré-requisitos
* Node.js 24
* PostgreSQL 16 ou compatível
* Docker e Docker Compose (opcional)

### Passo a Passo

```bash
npm ci
npm run build
npm run migrate
npm start
```

Antes de migrar e iniciar, copie `.env.example` para `.env` e configure `DATABASE_URL` e `API_SECRET_TOKEN`. Para gerar um segredo compatível, execute `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Para desenvolvimento após a migração, use `npm run dev`.

### Via Docker Compose

Configure `API_SECRET_TOKEN` e `POSTGRES_PASSWORD` em `.env`, usando segredos distintos. O Compose usa a própria instância PostgreSQL, aplica as migrações na inicialização e publica o painel apenas no loopback.

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
6. Configure `DATABASE_URL` e `API_SECRET_TOKEN` como segredos exclusivos de runtime. Use `FACTORY_RUN_MIGRATIONS=true` e `FACTORY_MIGRATION_HOSTS` com os nomes internos autorizados para aplicar as migrações na inicialização antes da prontidão.
7. Use `/health` para liveness e `/ready` para prontidão. Configure um `METRICS_SECRET_TOKEN` distinto e use-o no scrape de `/metrics`.
8. Consulte [a documentação de monitoramento](docs/MONITORING.md).

## Testes

`npm test` compila o projeto e executa os testes de segurança. Para incluir migração, histórico, cancelamento e reinício, defina `TEST_DATABASE_URL` para um banco de teste que permita criar e remover schemas isolados. A CI fornece PostgreSQL 16.

