"""
agents/agent_general.py
========================
General Assistant — handles research, writing, code generation,
analysis, and any task that doesn't require specialist file output.

Powered by: Google Gemini via Antigravity SDK
"""

import os
from groq import Groq
from google.antigravity import Agent, LocalAgentConfig


async def run(task: str, supabase, agent_id: str, session_id=None) -> dict:
    print("[AGENT_GENERAL] Starting General Assistant...")

    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key   = os.getenv("GROQ_API_KEY")

    if not gemini_key:
        raise ValueError("GEMINI_API_KEY is required for agent_general")

    # ── Step 1: Groq fast classification (optional sub-routing) ──
    category = "GENERAL"
    if groq_key:
        try:
            groq_client = Groq(api_key=groq_key)
            resp = groq_client.chat.completions.create(
                messages=[
                    {"role": "system",
                     "content": "You are a task classifier. Reply with exactly one word: FRONTEND or GENERAL."},
                    {"role": "user", "content": task}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0,
                max_tokens=10,
            )
            category = resp.choices[0].message.content.strip().upper()
            print(f"[AGENT_GENERAL] Groq classification: {category}")
        except Exception as e:
            print(f"[AGENT_GENERAL] Groq classification failed, defaulting to GENERAL: {e}")

    # ── Step 2: Route to appropriate model ───────────────────────
    if "FRONTEND" in category:
        from huggingface_hub import InferenceClient
        hf_key = os.getenv("HUGGINGFACE_API_KEY")
        hf_client = InferenceClient(api_key=hf_key)
        model_id  = "HuggingFaceH4/zephyr-7b-beta"
        response  = hf_client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": task}]
        )
        output_text = response.choices[0].message.content
        model_used  = model_id
    else:
        config = LocalAgentConfig(api_key=gemini_key)
        async with Agent(config) as agent:
            response    = await agent.chat(task)
            output_text = await response.text()
        model_used = "gemini/antigravity-preview-05-2026"

    print(f"[AGENT_GENERAL] Output ({len(output_text)} chars) generated.")

    # ── Step 3: Log to agent_runs (backward compatible) ──────────
    if supabase:
        try:
            supabase.table("agent_runs").insert({
                "task":       task,
                "routed_to":  category,
                "result":     output_text,
                "model_used": model_used,
                "tokens_used": 0,
                "status":     "success"
            }).execute()
            print("[AGENT_GENERAL] Logged to agent_runs.")
        except Exception as e:
            print(f"[AGENT_GENERAL] Warning: Could not log to agent_runs — {e}")

    return {
        "output_text": output_text,
        "model_used":  model_used,
        "category":    category,
        "status":      "success"
    }
