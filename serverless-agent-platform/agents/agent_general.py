"""
agents/agent_general.py
========================
General Assistant — handles research, writing, code generation,
analysis, and any task that doesn't require specialist file output.

Powered by: NVIDIA Nemotron via OpenRouter API
"""

import os
import httpx


async def run(task: str, supabase, agent_id: str, session_id=None) -> dict:
    print("[AGENT_GENERAL] Starting General Assistant...")

    openrouter_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("VITE_OPENROUTER_API_KEY")

    if not openrouter_key:
        raise ValueError("OPENROUTER_API_KEY is required for agent_general")

    # ── Call OpenRouter (NVIDIA Nemotron) ─────────────────────────
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sumanthlucky3.github.io/serverless-agent-platform/",
        "X-Title": "Serverless Agent Platform",
    }
    payload = {
        "model": "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a highly capable AI assistant on the Serverless Agent Platform. "
                    "You complete tasks thoroughly, accurately and concisely. "
                    "Format your response in clean markdown."
                )
            },
            {"role": "user", "content": task}
        ],
        "max_tokens": 2048,
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        data = response.json()

    output_text = data["choices"][0]["message"]["content"]
    model_used = data.get("model", "nvidia/nemotron-ultra")

    print(f"[AGENT_GENERAL] Output ({len(output_text)} chars) generated via {model_used}.")

    # ── Write result back to agent_messages in Supabase ──────────
    if supabase and session_id:
        try:
            supabase.table("agent_messages").insert({
                "session_id": int(session_id),
                "role": "assistant",
                "content": output_text,
            }).execute()
            # Mark session done
            supabase.table("agent_sessions").update({
                "status": "done"
            }).eq("id", int(session_id)).execute()
            print("[AGENT_GENERAL] Result logged to agent_messages.")
        except Exception as e:
            print(f"[AGENT_GENERAL] Warning: Could not log response — {e}")

    return {
        "output_text": output_text,
        "model_used": model_used,
        "status": "success"
    }
