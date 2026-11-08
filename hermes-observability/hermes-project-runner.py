#!/usr/bin/env python3
"""
Hermes Agent Dedicated Project Keeper Runner
Executes domain-specific triage and root cause analysis for each Coolify project.
Uses OpenAI gpt-6-luna (triage) and gpt-6-astra (RCA) with Google Gemini 3.8 Flash redundancy.
"""

import json
import os
import sys
import urllib.request
from datetime import datetime

# Load environment configuration
ENV_PATHS = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "hermes.env"),
    "/etc/hermes-observability/hermes.env",
    "/etc/pqc-audit.env",
    "hermes.env"
]
for env_file in ENV_PATHS:
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ or not os.environ[k]:
                        os.environ[k] = v

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

MODEL_TRIAGE = os.environ.get("HERMES_MODEL_SCOUT", "gpt-6-luna")
MODEL_TRIAGE_FALLBACK = os.environ.get("HERMES_MODEL_SCOUT_FALLBACK", "gemini-3.8-flash")

MODEL_RCA = os.environ.get("HERMES_MODEL_ANALYST", "gpt-6-astra")
MODEL_RCA_FALLBACK = os.environ.get("HERMES_MODEL_ANALYST_FALLBACK", "gemini-4-argon")

BASE_PROJECTS_DIR = os.environ.get("HERMES_PROJECTS_DIR", "/etc/hermes-observability/projects")
TELEMETRY_DIR = os.environ.get("HERMES_TELEMETRY_DIR", "/var/lib/hermes-telemetry")


def get_project_soul(project_slug: str) -> str:
    candidates = [
        os.path.join(BASE_PROJECTS_DIR, project_slug, "SOUL.md"),
        os.path.join("projects", project_slug, "SOUL.md"),
        os.path.join("hermes-observability", "projects", project_slug, "SOUL.md")
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return f.read().strip()
    return f"Você é o HERMES-KEEPER do projeto {project_slug.upper()}."


def call_openai(model: str, system_prompt: str, user_content: str) -> str:
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY não configurada.")
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "max_completion_tokens": 2500
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res["choices"][0]["message"]["content"].strip()


def call_gemini(model: str, system_prompt: str, user_content: str) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY não configurada.")
    clean_model = model.replace("models/", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_content}]}],
        "generationConfig": {"maxOutputTokens": 2500, "temperature": 0.2}
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res["candidates"][0]["content"]["parts"][0]["text"].strip()


def call_keeper(project_slug: str, primary_model: str, fallback_models: list, user_content: str) -> str:
    system_prompt = get_project_soul(project_slug)
    all_models = [primary_model] + [m for m in fallback_models if m != primary_model]
    last_err = None
    for model in all_models:
        try:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Invocando Keeper '{project_slug}' via '{model}'...")
            if "gemini" in model.lower() or "argon" in model.lower():
                output = call_gemini(model, system_prompt, user_content)
            else:
                output = call_openai(model, system_prompt, user_content)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Sucesso na resposta do Keeper ({model}).")
            return output
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Falha em {model}: {e}. Acionando fallback...")
            last_err = e
            continue
    raise RuntimeError(f"Todos os modelos falharam para {project_slug}. Último erro: {last_err}")


def notify_telegram(message: str):
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": message[:4000], "parse_mode": "Markdown"}
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            pass
    except Exception as e:
        print(f"Erro ao enviar Telegram: {e}")


def main():
    if len(sys.argv) < 2:
        print("Uso: hermes-project-runner.py <project-slug> [anomaly_description]")
        sys.exit(1)

    project_slug = sys.argv[1].lower().strip()
    anomaly_text = sys.argv[2] if len(sys.argv) > 2 else "Anomalia detectada pelo script deterministico de verificacao."

    print(f"\n============================================================")
    print(f"   HERMES DEDICATED PROJECT KEEPER: {project_slug.upper()}")
    print(f"   Servidor: EVEO Dedicated (177.104.141.223)")
    print(f"   Horario: {datetime.now().isoformat()}")
    print(f"============================================================\n")

    # ETAPA 1: Triagem do Projeto com gpt-6-luna
    triage_input = f"<project_incident>\nProjeto: {project_slug}\nTelemetria/Alerta: {anomaly_text}\nTimestamp: {datetime.now().isoformat()}\n</project_incident>"
    triage_output = call_keeper(project_slug, MODEL_TRIAGE, [MODEL_TRIAGE_FALLBACK, "gemini-3.5-flash-lite"], triage_input)
    print(f"Resposta Triagem:\n{triage_output}\n")

    if '"status": "HEALTHY"' in triage_output.upper():
        print(f"[{project_slug.upper()}] Triagem confirmou operacao estavel. Encerrando sem escalonamento.")
        sys.exit(0)

    # ETAPA 2: Investigacao Profunda de RCA com gpt-6-astra
    print(f"--- Diagnóstico Aprofundado (RCA) com HERMES-ANALYST ({MODEL_RCA}) ---")
    rca_input = (
        f"=== TRIAGEM INICIAL DO PROJETO ===\n{triage_output}\n\n"
        f"=== ANOMALIA REGISTRADA ===\n{anomaly_text}\n\n"
        f"Identifique a causa-raiz especifica do projeto '{project_slug}', o impacto funcional no dominio e proponha os comandos de recuperacao."
    )
    rca_output = call_keeper(project_slug, MODEL_RCA, [MODEL_RCA_FALLBACK, "gemini-3.8-flash"], rca_input)
    print(f"Resposta RCA:\n{rca_output}\n")

    # Monta boletim executivo de projeto
    bulletin = f"""🚨 **[ALERTA DE PROJETO: {project_slug.upper()}]**
**Ambiente:** EVEO Dedicated
**Horário:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S UTC')}

📌 **Diagnóstico Técnico (RCA):**
{rca_output}

---
*Gerado autonomamente pelo Hermes Dedicated Project Keeper ({project_slug})*"""

    print("\n==================== BOLETIM DO PROJETO ====================\n")
    print(bulletin)
    print("\n============================================================\n")

    # Salva relatorio de projeto
    proj_telemetry_dir = os.path.join(TELEMETRY_DIR, "projects", project_slug)
    os.makedirs(proj_telemetry_dir, exist_ok=True)
    report_file = os.path.join(proj_telemetry_dir, f"incident-{datetime.now().strftime('%Y%m%d-%H%M%S')}.md")
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(bulletin)

    notify_telegram(bulletin)


if __name__ == "__main__":
    main()
