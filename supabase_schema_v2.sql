-- ============================================================
-- Serverless Agent Platform — Supabase Schema v2
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. AGENTS REGISTRY — defines each specialist agent
CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,               -- e.g. 'agent_general', 'agent_docs', 'agent_jobs'
    name        TEXT NOT NULL,                  -- Display name: "General Assistant"
    description TEXT,                           -- Short description shown on Agent Hub card
    icon        TEXT DEFAULT 'bot',             -- Lucide icon name
    color       TEXT DEFAULT '#0663C1',         -- Hex accent color for the card
    model_used  TEXT,                           -- Primary AI model
    status      TEXT DEFAULT 'active',          -- 'active' | 'coming_soon' | 'disabled'
    run_count   INTEGER DEFAULT 0,              -- Total runs (updated by trigger)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AGENT SESSIONS — each chat/task session inside an agent
CREATE TABLE IF NOT EXISTS agent_sessions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agent_id    TEXT REFERENCES agents(id) ON DELETE CASCADE,
    title       TEXT,                           -- Auto-generated from first message
    status      TEXT DEFAULT 'active',          -- 'active' | 'completed' | 'error'
    message_count INTEGER DEFAULT 0,
    started_at  TIMESTAMPTZ DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    summary     TEXT                            -- Short AI-generated summary
);

-- 3. AGENT MESSAGES — full chat history per session
CREATE TABLE IF NOT EXISTS agent_messages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id  BIGINT REFERENCES agent_sessions(id) ON DELETE CASCADE,
    agent_id    TEXT REFERENCES agents(id),
    role        TEXT NOT NULL,                  -- 'user' | 'assistant' | 'system'
    content     TEXT NOT NULL,                  -- Message text (markdown supported)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AGENT FILES — files uploaded by user or output by agent
CREATE TABLE IF NOT EXISTS agent_files (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id   BIGINT REFERENCES agent_sessions(id) ON DELETE CASCADE,
    agent_id     TEXT REFERENCES agents(id),
    file_name    TEXT NOT NULL,
    file_type    TEXT,                          -- 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'image'
    file_size    INTEGER,                       -- bytes
    storage_path TEXT,                          -- Supabase Storage path
    direction    TEXT DEFAULT 'input',          -- 'input' (user uploaded) | 'output' (agent generated)
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AGENT CONNECTORS — per-agent integration config
CREATE TABLE IF NOT EXISTS agent_connectors (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agent_id    TEXT REFERENCES agents(id) ON DELETE CASCADE,
    connector   TEXT NOT NULL,                  -- 'github' | 'gmail' | 'notion' | 'drive' | 'slack'
    status      TEXT DEFAULT 'disconnected',    -- 'connected' | 'disconnected' | 'error'
    config      JSONB DEFAULT '{}',             -- Encrypted/masked config (scopes, endpoint, etc.)
    connected_at TIMESTAMPTZ
);

-- ============================================================
-- SEED DATA — Pre-register the 3 agents from the UI design
-- ============================================================
INSERT INTO agents (id, name, description, icon, color, model_used, status) VALUES
(
    'agent_general',
    'General Assistant',
    'Handles research, writing, code generation, and analysis tasks.',
    'bot',
    '#0663C1',
    'gemini/antigravity-preview-05-2026',
    'active'
),
(
    'agent_docs',
    'Docs & Reports Agent',
    'Generates professional PDFs, Word docs, Excel sheets, and PowerPoint presentations from a prompt.',
    'file-text',
    '#7C3AED',
    'gemini/antigravity-preview-05-2026',
    'active'
),
(
    'agent_jobs',
    'Job Application Agent',
    'Reads job alert emails, matches against your resume, and sends application emails automatically.',
    'briefcase',
    '#D97F06',
    'gemini/antigravity-preview-05-2026',
    'coming_soon'
)
ON CONFLICT (id) DO NOTHING;

-- Pre-register default connectors for each agent
INSERT INTO agent_connectors (agent_id, connector, status) VALUES
('agent_general',  'github',     'connected'),
('agent_general',  'supabase',   'connected'),
('agent_general',  'groq',       'connected'),
('agent_general',  'notion',     'disconnected'),
('agent_general',  'google_drive','disconnected'),
('agent_docs',     'github',     'connected'),
('agent_docs',     'supabase',   'connected'),
('agent_docs',     'google_drive','disconnected'),
('agent_jobs',     'gmail',      'disconnected'),
('agent_jobs',     'github',     'connected'),
('agent_jobs',     'supabase',   'connected')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Keep original agent_runs table intact (backward compatible)
-- ============================================================
-- The existing agent_runs table stays as-is.
-- New runs will ALSO write to agent_messages for the chat UI.
-- No data is lost. No existing workflow breaks.
