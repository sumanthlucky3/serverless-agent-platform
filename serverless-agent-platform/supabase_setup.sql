-- Supabase Table Setup for Agent Platform
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS agent_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    task text,
    routed_to text,
    result text,
    model_used text,
    tokens_used integer,
    status text
);

CREATE TABLE IF NOT EXISTS agent_memory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    session_id text,
    role text,
    content text,
    embedding vector(1536) NULL
);
