"""
agents/agent_vision.py
========================
Vision Assistant — handles multimodal tasks involving images (e.g., Image-to-Text).

Powered by: Hugging Face Serverless Inference API (e.g., Qwen-VL)
"""

import os
import httpx


async def run(task: str, supabase, agent_id: str, session_id=None) -> dict:
    print("[AGENT_VISION] Starting Vision Assistant...")

    hf_key = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("VITE_HUGGINGFACE_API_KEY")
    if not hf_key:
        raise ValueError("HUGGINGFACE_API_KEY is required for agent_vision")

    # The router recommends a model, typically a Vision model
    routed_model = os.getenv("HF_ROUTED_MODEL_ID", "Qwen/Qwen2.5-VL-7B-Instruct")
    image_urls_env = os.getenv("IMAGE_URLS", "")
    
    image_urls = [url.strip() for url in image_urls_env.split(",") if url.strip()]
    if not image_urls:
        raise ValueError("[AGENT_VISION] No image URLs provided for a vision task.")

    print(f"[AGENT_VISION] Using Hugging Face model: {routed_model} with {len(image_urls)} images.")

    # ── Call Hugging Face API (OpenAI Compatible Endpoint) ───────
    headers = {
        "Authorization": f"Bearer {hf_key}",
        "Content-Type": "application/json"
    }

    # Format the content block with the text and all images
    content_list = [{"type": "text", "text": task}]
    for url in image_urls:
        content_list.append({
            "type": "image_url",
            "image_url": {"url": url}
        })

    payload = {
        "model": routed_model,
        "messages": [
            {
                "role": "user",
                "content": content_list
            }
        ],
        "max_tokens": 1024,
        "temperature": 0.2
    }

    output_text = ""
    model_used = routed_model

    try:
        # Many modern HF models support the /v1/chat/completions endpoint for multimodality
        api_url = f"https://api-inference.huggingface.co/models/{routed_model}/v1/chat/completions"
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            output_text = data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        print(f"[AGENT_VISION] API Error: {e.response.text}")
        output_text = f"Vision Model Error: Could not process the image via Hugging Face ({e.response.status_code}). Please ensure you are using a valid free-tier Vision model."
    except Exception as e:
        print(f"[AGENT_VISION] Inference failed: {e}")
        output_text = f"Vision Model Error: {e}"

    print(f"[AGENT_VISION] Output ({len(output_text)} chars) generated.")

    return {
        "output_text": output_text,
        "model_used": model_used,
        "status": "success"
    }
