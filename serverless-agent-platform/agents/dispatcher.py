"""
agents/dispatcher.py
====================
Central dispatcher for the Serverless Agent Platform.

Reads AGENT_ID from environment and routes the task to the correct
specialist agent module. Fully backward-compatible — if AGENT_ID is
not set, falls back to the original binary FRONTEND/GENERAL router.

Usage (in GitHub Actions workflow):
    env:
      AGENT_ID: "agent_docs"        # Which specialist to activate
      AGENT_TASK: "..."             # The task / prompt
"""

import os
import sys
import asyncio
from supabase import create_client, Client

# ── Lazy imports — only the activated agent is loaded ────────────────────────
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
    else:
        print(f"[DISPATCHER] Unknown AGENT_ID '{agent_id}'. Falling back to agent_general.")
        from agents.agent_general import run
        return run


async def main():
    print("=" * 60)
    print("  Serverless Agent Platform — Dispatcher v2")
    print("=" * 60)

    # ── Read config ───────────────────────────────────────────────
    agent_id   = os.getenv("AGENT_ID", "agent_general")
    task       = os.getenv("AGENT_TASK", "Tell me a quick AI joke.")
    session_id = os.getenv("SESSION_ID")          # Optional: links to chat UI session

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    print(f"[DISPATCHER] Agent   : {agent_id}")
    print(f"[DISPATCHER] Task    : {task[:80]}{'...' if len(task) > 80 else ''}")

    # ── Supabase connection ───────────────────────────────────────
    supabase: Client | None = None
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("[DISPATCHER] Supabase: Connected")
    except Exception as e:
        print(f"[DISPATCHER] Supabase: Failed — {e}")

    # ── Log user message to agent_messages (if session_id given) ──
    if supabase and session_id:
        try:
            supabase.table("agent_messages").insert({
                "session_id": int(session_id),
                "agent_id":   agent_id,
                "role":       "user",
                "content":    task
            }).execute()
        except Exception as e:
            print(f"[DISPATCHER] Warning: Could not log user message — {e}")

    # ── Dispatch to specialist agent ──────────────────────────────
    run_fn = get_agent_module(agent_id)

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
