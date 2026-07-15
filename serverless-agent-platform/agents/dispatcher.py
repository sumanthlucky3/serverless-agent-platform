"""
agents/dispatcher.py
====================
Central dispatcher & Smart Router for the Serverless Agent Platform.

Reads AGENT_ID from environment. If AGENT_ID is "auto", it uses an LLM to 
classify the task and route it to the best specialist agent or model.
"""

import os
import sys
import asyncio
import json
import httpx
from supabase import create_client, Client


async def classify_task(task: str, image_urls: str, openrouter_key: str) -> dict:
    """Uses a fast model to classify the task and choose the best route."""
    print("[ROUTER] Analyzing task to find the best model/agent...")
    
    # If there are images, automatically route to Vision
    if image_urls and image_urls.strip():
        print("[ROUTER] Image detected. Auto-routing to VISION.")
        return {"agent": "agent_vision", "model": "Qwen/Qwen2.5-VL-7B-Instruct"}

    system_prompt = """You are a Smart Router. Analyze the user's task and output a JSON object with two keys:
1. "agent": Choose from ["agent_docs", "agent_code", "agent_general"]
   - "agent_docs" if they want a document, PDF, Excel, or PowerPoint generated.
   - "agent_code" if they strictly want code written.
   - "agent_general" for all other text tasks.
2. "model": Choose the best free Hugging Face model ID for the task:
   - For code: "codellama/CodeLlama-34b-Instruct-hf" or "Qwen/Qwen2.5-Coder-32B-Instruct"
   - For docs/general text: "meta-llama/Meta-Llama-3-8B-Instruct"

Output ONLY raw JSON, no markdown."""

    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "meta-llama/llama-3-8b-instruct:free",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": task}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            route = json.loads(content)
            print(f"[ROUTER] Decision: {route}")
            return route
    except Exception as e:
        print(f"[ROUTER] Classification failed: {e}. Defaulting to general.")
        return {"agent": "agent_general", "model": "meta-llama/Meta-Llama-3-8B-Instruct"}


def get_agent_module(agent_id: str):
    if agent_id == "agent_general":
        from agents.agent_general import run
        return run
    elif agent_id == "agent_docs":
        from agents.agent_docs import run
        return run
    elif agent_id == "agent_jobs":
        from agents.agent_jobs import run
        return run
    elif agent_id == "agent_vision":
        from agents.agent_vision import run
        return run
    elif agent_id == "agent_code":
        from agents.agent_general import run # We can just use general for code for now, but pass the model
        return run
    else:
        print(f"[DISPATCHER] Unknown AGENT_ID '{agent_id}'. Falling back to agent_general.")
        from agents.agent_general import run
        return run


async def main():
    print("=" * 60)
    print("  Serverless Agent Platform — Dispatcher v3 (Smart Router)")
    print("=" * 60)

    # ── Read config ───────────────────────────────────────────────
    agent_id   = os.getenv("AGENT_ID", "auto")
    task       = os.getenv("AGENT_TASK", "Tell me a quick AI joke.")
    session_id = os.getenv("SESSION_ID")
    image_urls = os.getenv("IMAGE_URLS", "")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("VITE_OPENROUTER_API_KEY")

    print(f"[DISPATCHER] Initial Agent: {agent_id}")
    print(f"[DISPATCHER] Task       : {task[:80]}{'...' if len(task) > 80 else ''}")

    # ── Smart Routing ─────────────────────────────────────────────
    hf_model_id = None
    if agent_id == "auto":
        route = await classify_task(task, image_urls, openrouter_key)
        agent_id = route.get("agent", "agent_general")
        hf_model_id = route.get("model", "meta-llama/Meta-Llama-3-8B-Instruct")
        print(f"[DISPATCHER] Rerouted to {agent_id} using {hf_model_id}")

    # ── Supabase connection ───────────────────────────────────────
    supabase: Client | None = None
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("[DISPATCHER] Supabase: Connected")
    except Exception as e:
        print(f"[DISPATCHER] Supabase: Failed — {e}")

    # ── Dispatch to specialist agent ──────────────────────────────
    run_fn = get_agent_module(agent_id)

    # Pass the recommended hf_model_id down if we have one
    os.environ["HF_ROUTED_MODEL_ID"] = hf_model_id or ""

    result = await run_fn(
        task=task,
        supabase=supabase,
        agent_id=agent_id,
        session_id=session_id
    )

    # ── Log agent response to agent_messages ──────────────────────
    if supabase and session_id and result:
        try:
            supabase.table("agent_messages").insert({
                "session_id": int(session_id),
                "agent_id":   agent_id,
                "role":       "assistant",
                "content":    result.get("output_text", "")
            }).execute()
        except Exception as e:
            print(f"[DISPATCHER] Warning: Could not log agent response — {e}")

    # ── Write output.txt for the workflow commit step ─────────────
    output_text = result.get("output_text", "") if result else "Agent returned no output."
    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(output_text)

    print("[DISPATCHER] Done. output.txt written.")
    return result


if __name__ == "__main__":
    asyncio.run(main())
