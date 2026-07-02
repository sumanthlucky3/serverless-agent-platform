import os
import sys
import asyncio
from supabase import create_client, Client
from huggingface_hub import InferenceClient
from groq import Groq
from google.antigravity import Agent, LocalAgentConfig

async def main():
    print("🤖 Waking up Antigravity Cloud Agent...")
    
    # 1. Gather our secure passwords
    gemini_key = os.getenv("GEMINI_API_KEY")
    huggingface_key = os.getenv("HUGGINGFACE_API_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    task_prompt = os.getenv("AGENT_TASK", "Tell me a quick joke about AI.")
    
    if not gemini_key:
        print("❌ Error: Missing Gemini API Key.")
        sys.exit(1)

    # 2. Connect to the Supabase Memory Database
    supabase = None
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print("💾 Connected to Supabase Memory Bank successfully!")
    except Exception as e:
        print(f"❌ Supabase Connection Failed: {e}")

    # Helper function to write to Supabase
    def log_run(task, routed_to, result, model_used, status):
        if supabase:
            try:
                supabase.table("agent_runs").insert({
                    "task": task,
                    "routed_to": routed_to,
                    "result": result,
                    "model_used": model_used,
                    "tokens_used": 0,
                    "status": status
                }).execute()
                print("💾 Saved run to Supabase.")
            except Exception as e:
                print(f"⚠️ Failed to save to Supabase: {e}")

    # 3. Hand the task to the Appropriate Agent (Routing)
    print(f"📋 Executing Task: '{task_prompt}'")
    try:
        # STEP 1: Fast Groq router
        print("🧠 Calling Groq Llama 3.3 for ultra-fast task classification...")
        groq_client = Groq(api_key=groq_key)
        system_prompt = """You are a task classifier. Reply with exactly one word: FRONTEND or GENERAL. FRONTEND = UI components, CSS, React, HTML, design. GENERAL = everything else."""

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": task_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=10,
        )
        
        category = chat_completion.choices[0].message.content.strip().upper()
        print(f"🎯 Groq classification result: {category}")

        if "FRONTEND" in category:
            print("🚀 Routing task to Hugging Face Serverless API (Frontend specialisation)...")
            hf_client = InferenceClient(api_key=huggingface_key)
            messages = [{"role": "user", "content": task_prompt}]
            model_id = "HuggingFaceH4/zephyr-7b-beta"
            response = hf_client.chat.completions.create(model=model_id, messages=messages)
            output_text = response.choices[0].message.content
            
            print("\n✨ --- AGENT OUTPUT --- ✨\n")
            print(output_text)
            print("\n✨ -------------------- ✨\n")
            
            with open("output.txt", "w", encoding="utf-8") as f:
                f.write(output_text)
            
            log_run(task_prompt, category, output_text, model_id, "success")
        else:
            print("🚀 Routing task to Antigravity SDK Sandbox...")
            
            # Initialize the SDK
            # STEP 2: Use Antigravity SDK Agent class
            config = LocalAgentConfig(
                api_key=gemini_key
            )
            
            async with Agent(config) as agent:
                response = await agent.chat(task_prompt)
                output_text = await response.text()
            
            print("\n✨ --- AGENT OUTPUT --- ✨\n")
            print(output_text)
            print("\n✨ -------------------- ✨\n")
            
            with open("output.txt", "w", encoding="utf-8") as f:
                f.write(output_text)
            
            # STEP 3: Write to Supabase
            log_run(task_prompt, category, output_text, "gemini/antigravity-preview-05-2026", "success")
            
    except Exception as e:
        print(f"❌ Agent Execution Failed: {e}")
        log_run(task_prompt, "UNKNOWN", str(e), "unknown", "error")

if __name__ == "__main__":
    asyncio.run(main())
