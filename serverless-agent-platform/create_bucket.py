import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

try:
    # Try to create the bucket
    res = supabase.storage.create_bucket("agent-files", options={"public": True})
    print("Bucket created:", res)
except Exception as e:
    print("Bucket might already exist or error:", e)

# List buckets to confirm
buckets = supabase.storage.list_buckets()
print("Buckets:", [b.name for b in buckets])
