import os
import sys
from supabase import create_client, Client
from google import genai
from huggingface_hub import InferenceClient

def main():
    print("🤖 Waking up Antigravity Cloud Agent...")
    
    # 1. Gather our secure passwords
    gemini_key = os.getenv("GEMINI_API_KEY")
    huggingface_key = os.getenv("HUGGINGFACE_API_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    task_prompt = os.getenv("AGENT_TASK", "Tell me a quick joke about AI.")
    
    if not gemini_key:
        print("❌ Error: Missing Gemini API Key.")
        sys.exit(1)

    # 2. Connect to the Supabase Memory Database
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print("💾 Connected to Supabase Memory Bank successfully!")
    except Exception as e:
        print(f"❌ Supabase Connection Failed: {e}")

    # 3. Hand the task to the Appropriate Agent (Routing)
    print(f"📋 Executing Task: '{task_prompt}'")
    try:
        # Simple router: if task contains 'frontend' or 'ui', use Hugging Face (Hermes/Llama), else use Gemini Sandbox
        if "ui" in task_prompt.lower() or "frontend" in task_prompt.lower():
            print("🚀 Routing task to Hugging Face Serverless API (Frontend specialisation)...")
            hf_client = InferenceClient(api_key=huggingface_key)
            messages = [{"role": "user", "content": task_prompt}]
            # Using a fast, high-quality instruction model from HF
            response = hf_client.chat.completions.create(model="NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO", messages=messages)
            output_text = response.choices[0].message.content
        else:
            print("🚀 Routing task to Google Remote Sandbox...")
            # We initialize the Gemini Client using your secure key
            client = genai.Client(api_key=gemini_key)
            
            # We send the command to the Antigravity Sandbox
            interaction = client.interactions.create(
                agent="antigravity-preview-05-2026",
                input=task_prompt,
                environment="remote",
            )
            output_text = interaction.output_text
            
        print("\n✨ --- AGENT OUTPUT --- ✨\n")
        print(output_text)
        print("\n✨ -------------------- ✨\n")
        
    except Exception as e:
        print(f"❌ Agent Execution Failed: {e}")

if __name__ == "__main__":
    main()
