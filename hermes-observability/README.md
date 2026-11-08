# Malha de Observabilidade & Segurança Multiagêntica Hermes Agent

Malha autônoma de detecção e resposta a incidentes de segurança (força bruta SSH, CrowdSec IPS) e anomalias de infraestrutura (Docker containers, exaustão de RAM e disco) no servidor dedicado EVEO (`177.104.141.223`).

## 1. Arquitetura dos Agentes Especialistas

Conforme as diretrizes oficiais de seleção de modelos da [OpenAI](https://developers.openai.com/api/docs/guides/model-selection) e [Google AI Studio](https://aistudio.google.com/docs/models?hl=pt-br):

| Agente | Perfil / Função | Modelo Primário | Modelo de Fallback (Redundância) | Justificativa Técnica |
| :--- | :--- | :--- | :--- | :--- |
| **`HERMES-SCOUT`** | **Triagem N1 de Telemetria** | `gpt-6-luna` (OpenAI) | `gemini-3.8-flash` / `gemini-3.5-flash-lite` (Google) | High-Efficiency / Low-Latency: Ingestão rápida de grandes volumes de logs de segurança e métricas a custo mínimo. |
| **`HERMES-ANALYST`** | **RCA Profunda & Perícia DevSecOps** | `gpt-6-astra` (OpenAI) | `gemini-4-argon` / `gemini-3.8-flash` / `o3` | High-Intelligence & Complex Reasoning: Raciocínio lógico em múltiplos passos para correlacionar ataques e formular comandos cirúrgicos em Linux/Docker. |
| **`HERMES-BRIEFER`** | **Despachante Executivo de Alertas** | `gpt-6.1-sol` (OpenAI) | `gemini-3.8-flash` (Google) | Balanced Performance: Síntese executiva clara, objetiva e formatada para tomada de decisão (Human-in-the-Loop). |

## 2. Componentes no Host EVEO

- `/etc/hermes-observability/profiles/scout/SOUL.md`: Identidade e guardrails do Scout (classificação `FALSE_POSITIVE`, `WARNING`, `CRITICAL_INCIDENT`).
- `/etc/hermes-observability/profiles/analyst/SOUL.md`: Identidade e guardrails do Analyst (análise forense, causa-raiz, prescrição de mitigação segura).
- `/etc/hermes-observability/profiles/briefer/SOUL.md`: Identidade do Briefer (boletim executivo em Markdown para Telegram/Webhook).
- `/etc/hermes-observability/hermes.env`: Variáveis de ambiente e chaves das APIs oficiais.
- `/usr/local/bin/hermes-multiagent-runner.py`: Runner Python com tolerância a falhas e chaveamento automático entre OpenAI e Google Gemini.
- `/usr/local/bin/hermes-wake-gate.sh`: Portão determinístico em Bash com sanitizador anti-prompt injection.
- `/etc/systemd/system/hermes-wake-gate.service`: Unidade de execução do portão.
- `/etc/systemd/system/hermes-wake-gate.timer`: Timer agendado para execução periódica a cada 5 minutos.
- `/var/lib/hermes-telemetry/`: Histórico de snapshots de telemetria e relatórios gerados.

## 3. Fluxo de Operação Zero-Cost

1. O timer systemd executa `/usr/local/bin/hermes-wake-gate.sh` a cada 5 minutos.
2. O script avalia:
   - Contagem recente de ataques de força bruta SSH via `/var/log/auth.log` e Loki.
   - Status dos containers Docker (`exited`, `restarting`, `unhealthy`).
   - Uso de memória RAM (> 90%) e partição raiz de disco (> 85%).
   - Alertas ativos do CrowdSec IPS.
3. Se o servidor estiver operando perfeitamente e sem anomalias, o script encerra imediatamente: **custo de LLM = R$ 0,00**.
4. Se for detectada qualquer anomalia:
   - Os dados são sanitizados contra *Indirect Prompt Injection*.
   - É gerado o snapshot `/var/lib/hermes-telemetry/incident-snapshot.json`.
   - O `hermes-multiagent-runner.py` é acionado para conduzir a triagem, investigação e despacho executivo.
