"""
agents/agent_general.py
========================
General Assistant — handles research, writing, code generation,
analysis, and any task that doesn't require specialist file output.

Supports OpenRouter (Nemotron) AND Hugging Face serverless inference API.
"""

import os
import httpx


async def run(task: str, supabase, agent_id: str, session_id=None) -> dict:
    print("[AGENT_GENERAL] Starting General Assistant...")

    hf_key = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("VITE_HUGGINGFACE_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("VITE_OPENROUTER_API_KEY")
    routed_model = os.getenv("HF_ROUTED_MODEL_ID")

    output_text = ""
    model_used = ""

    # ── Call Hugging Face API (if routed and key available) ───────
    if hf_key and routed_model:
        print(f"[AGENT_GENERAL] Using Hugging Face model: {routed_model}")
        headers = {"Authorization": f"Bearer {hf_key}", "Content-Type": "application/json"}
        payload = {
            "inputs": f"<|system|>\nYou are a highly capable AI assistant on the Serverless Agent Platform. You complete tasks thoroughly and concisely. Format your response in clean markdown.<|end|>\n<|user|>\n{task}<|end|>\n<|assistant|>\n",
            "parameters": {"max_new_tokens": 2048, "temperature": 0.7, "return_full_text": False}
        }
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"https://api-inference.huggingface.co/models/{routed_model}",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list) and "generated_text" in data[0]:
                    output_text = data[0]["generated_text"].strip()
                elif "error" in data:
                    raise Exception(data["error"])
                else:
                    output_text = str(data)
                model_used = routed_model
        except Exception as e:
            print(f"[AGENT_GENERAL] HF Inference failed: {e}. Falling back to OpenRouter...")
            hf_key = None # Force fallback

    # ── Fallback to OpenRouter (NVIDIA Nemotron) ──────────────────
    if not output_text and openrouter_key:
        print("[AGENT_GENERAL] Using OpenRouter fallback (NVIDIA Nemotron)...")
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://sumanthlucky3.github.io/serverless-agent-platform/",
            "X-Title": "Serverless Agent Platform",
        }
        payload = {
            "model": "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
            "messages": [
                {"role": "system", "content": "You are a highly capable AI assistant on the Serverless Agent Platform. You complete tasks thoroughly and concisely. Format your response in clean markdown."},
                {"role": "user", "content": task}
            ],
            "max_tokens": 2048,
            "temperature": 0.7,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            output_text = data["choices"][0]["message"]["content"]
            model_used = data.get("model", "nvidia/nemotron-ultra")
            
    if not output_text:
        raise ValueError("Neither Hugging Face nor OpenRouter keys are available, or both APIs failed.")

    print(f"[AGENT_GENERAL] Output ({len(output_text)} chars) generated via {model_used}.")

    return {
        "output_text": output_text,
        "model_used": model_used,
        "status": "success"
    }
