import os
import sys
from supabase import create_client, Client
from google import genai

def main():
    print("🤖 Waking up Antigravity Cloud Agent...")
    
    # 1. Gather our secure passwords
    gemini_key = os.getenv("GEMINI_API_KEY")
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

    # 3. Hand the task to Google's Remote Sandbox Agent
    print(f"📋 Executing Task: '{task_prompt}'")
    try:
        # We initialize the Gemini Client using your secure key
        client = genai.Client(api_key=gemini_key)
        
        # We send the command to the Antigravity Sandbox
        interaction = client.interactions.create(
            agent="antigravity-preview-05-2026",
            input=task_prompt,
            environment="remote",
        )
        print("\n✨ --- AGENT OUTPUT --- ✨\n")
        print(interaction.output_text)
        print("\n✨ -------------------- ✨\n")
        
    except Exception as e:
        print(f"❌ Agent Execution Failed: {e}")

if __name__ == "__main__":
    main()
