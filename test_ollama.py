import requests
import json

# The local server address where Ollama runs in the background
url = "http://localhost:11434/api/generate"

# Setting up our data payload with the model we just downloaded
payload = {
    "model": "qwen2.5:1.5b",
    "prompt": "Write a short, funny haiku about debugging code.",
    "stream": False
}

print("Thinking... (Processing on local CPU)")

try:
    # Sending the request to your local AI
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("\n--- AI Response ---")
        print(response.json()["response"])
        print("-------------------")
    else:
        print(f"Error: {response.status_code}")
except Exception as e:
    print("Failed to connect. Is Ollama running in the background?")