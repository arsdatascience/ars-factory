#!/usr/bin/env python3
"""
Hermes Agent Multi-Profile Observability Runner
Architecture: Scout (gpt-6-luna) -> Analyst (gpt-6-astra) -> Briefer (gpt-6.1-sol)
With automatic dual-provider fallback to Google Gemini (gemini-3.8-flash / gemini-4-argon).
"""

import json
import os
import sys
import urllib.request
import urllib.error
import urllib.parse
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
                    v = v.strip().strip('"').strip("'")
                    k = k.strip()
                    if k not in os.environ or not os.environ[k]:
                        os.environ[k] = v

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

MODEL_SCOUT = os.environ.get("HERMES_MODEL_SCOUT", "gpt-6-luna")
MODEL_SCOUT_FALLBACK = os.environ.get("HERMES_MODEL_SCOUT_FALLBACK", "gemini-3.8-flash")

MODEL_ANALYST = os.environ.get("HERMES_MODEL_ANALYST", "gpt-6-astra")
MODEL_ANALYST_FALLBACK = os.environ.get("HERMES_MODEL_ANALYST_FALLBACK", "gemini-4-argon")

MODEL_BRIEFER = os.environ.get("HERMES_MODEL_BRIEFER", "gpt-6.1-sol")
MODEL_BRIEFER_FALLBACK = os.environ.get("HERMES_MODEL_BRIEFER_FALLBACK", "gemini-3.8-flash")

PROFILES_DIR = os.environ.get("HERMES_PROFILES_DIR", "/etc/hermes-observability/profiles")
TELEMETRY_DIR = os.environ.get("HERMES_TELEMETRY_DIR", "/var/lib/hermes-telemetry")


def get_soul_prompt(profile_name: str) -> str:
    paths = [
        os.path.join(PROFILES_DIR, profile_name, "SOUL.md"),
        os.path.join("profiles", profile_name, "SOUL.md"),
        os.path.join("hermes-observability", "profiles", profile_name, "SOUL.md")
    ]
    for p in paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return f.read().strip()
    return f"Você é o agente especialista {profile_name.upper()} do servidor EVEO."


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
    # Normalize model name for v1beta endpoint
    clean_model = model.replace("models/", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"parts": [{"text": user_content}]}
        ],
        "generationConfig": {
            "maxOutputTokens": 2500,
            "temperature": 0.2
        }
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


def call_agent(profile_name: str, primary_model: str, fallback_models: list, user_content: str) -> str:
    system_prompt = get_soul_prompt(profile_name)
    all_models = [primary_model] + [m for m in fallback_models if m != primary_model]
    
    last_err = None
    for model in all_models:
        try:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Invocando {profile_name.upper()} com modelo '{model}'...")
            if "gemini" in model.lower() or "argon" in model.lower():
                output = call_gemini(model, system_prompt, user_content)
            else:
                output = call_openai(model, system_prompt, user_content)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Sucesso na resposta de {profile_name.upper()} ({model}).")
            return output
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Alerta: Falha ao chamar {model} para {profile_name}: {e}. Tentando fallback...")
            last_err = e
            continue
            
    raise RuntimeError(f"Todos os modelos falharam para o agente {profile_name}. Último erro: {last_err}")


def notify_telegram(message: str):
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message[:4000],
        "parse_mode": "Markdown"
    }
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
        print(f"Erro ao enviar notificacao Telegram: {e}")


def main():
    snapshot_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(TELEMETRY_DIR, "incident-snapshot.json")
    if not os.path.exists(snapshot_path):
        print(f"Arquivo de snapshot {snapshot_path} nao encontrado.")
        sys.exit(1)

    with open(snapshot_path, "r", encoding="utf-8") as f:
        telemetry_raw = f.read()

    print(f"\n============================================================")
    print(f"   HERMES AGENT MULTI-PROFILE OBSERVABILITY & SECURITY")
    print(f"   Servidor: EVEO Dedicated (177.104.141.223)")
    print(f"   Horario: {datetime.now().isoformat()}")
    print(f"============================================================\n")

    # ETAPA 1: HERMES-SCOUT (Triagem N1)
    print("--- [ETAPA 1] Triagem Preliminar com HERMES-SCOUT ---")
    scout_input = f"<telemetry_snapshot>\n{telemetry_raw}\n</telemetry_snapshot>"
    scout_output = call_agent("scout", MODEL_SCOUT, [MODEL_SCOUT_FALLBACK, "gemini-3.5-flash-lite"], scout_input)
    print(f"Resposta Scout:\n{scout_output}\n")

    # Validacao de saida do Scout
    is_false_positive = False
    try:
        # tentar parsear como json
        cleaned_json = scout_output.strip().replace("```json", "").replace("```", "").strip()
        scout_json = json.loads(cleaned_json)
        if scout_json.get("classification") == "FALSE_POSITIVE":
            is_false_positive = True
    except Exception:
        if "FALSE_POSITIVE" in scout_output.upper() and "CRITICAL_INCIDENT" not in scout_output.upper():
            is_false_positive = True

    if is_false_positive:
        print("[HERMES-SCOUT] Incidente classificado como FALSO POSITIVO ou sem risco iminente.")
        print("Escalonamento encerrado sem consumo adicional de tokens.")
        sys.exit(0)

    # ETAPA 2: HERMES-ANALYST (RCA e Comandos de Mitigacao)
    print("--- [ETAPA 2] Analise Forense Profunda com HERMES-ANALYST ---")
    analyst_input = (
        f"=== TRIAGEM REALIZADA PELO HERMES-SCOUT ===\n{scout_output}\n\n"
        f"=== TELEMETRIA COMPLETA SANITIZADA ===\n{telemetry_raw}\n"
    )
    analyst_output = call_agent(
        "analyst",
        MODEL_ANALYST,
        [MODEL_ANALYST_FALLBACK, "gemini-3.8-flash", "o3"],
        analyst_input
    )
    print(f"Resposta Analyst:\n{analyst_output}\n")

    # ETAPA 3: HERMES-BRIEFER (Sintese Executiva e Despacho)
    print("--- [ETAPA 3] Sintese Executiva com HERMES-BRIEFER ---")
    briefer_input = (
        f"=== RELATORIO TECNICO DO HERMES-ANALYST ===\n{analyst_output}\n\n"
        f"Gere o boletim executivo de seguranca conforme seu SOUL.md."
    )
    briefer_output = call_agent("briefer", MODEL_BRIEFER, [MODEL_BRIEFER_FALLBACK, "gemini-3.8-flash"], briefer_input)
    print(f"\n==================== BOLETIM EXECUTIVO ====================\n")
    print(briefer_output)
    print(f"\n===========================================================\n")

    # Salva relatorio de incidente
    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    report_file = os.path.join(TELEMETRY_DIR, f"incident-{datetime.now().strftime('%Y%m%d-%H%M%S')}.md")
    latest_file = os.path.join(TELEMETRY_DIR, "latest-incident-report.md")
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(briefer_output)
    with open(latest_file, "w", encoding="utf-8") as f:
        f.write(briefer_output)

    # Notifica canais de comunicacao se configurados
    notify_telegram(briefer_output)


if __name__ == "__main__":
    main()
