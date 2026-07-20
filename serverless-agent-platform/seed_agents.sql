-- seed_agents.sql
-- Run this script in your Supabase SQL Editor to populate the agents table.

INSERT INTO agents (id, name, description, icon, color, status, run_count)
VALUES 
  ('auto', 'Smart Router (Auto)', 'Automatically routes tasks to the best available agent.', 'bot', '#10B981', 'active', 0),
  ('agent_general', 'General Assistant', 'Handles research, writing, code generation, analysis, and general tasks.', 'bot', '#3B82F6', 'active', 0),
  ('agent_docs', 'Docs & Reports Agent', 'Specializes in generating markdown documents and reports.', 'file-text', '#8B5CF6', 'active', 0),
  ('agent_vision', 'Vision Assistant', 'Handles multimodal tasks involving images (e.g. Image-to-Text).', 'briefcase', '#F59E0B', 'active', 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status;
