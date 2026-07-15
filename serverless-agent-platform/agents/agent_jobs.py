"""
agents/agent_jobs.py
=====================
Job Application Agent — v1 (stub / coming soon)

Vision:
  1. Read Gmail for job alert emails
  2. Extract job title, company, JD, apply link
  3. Compare JD against attached resume (Gemini)
  4. If match score > threshold → send application email
  5. Log result to Supabase

Status: COMING SOON
"""

import os


async def run(task: str, supabase, agent_id: str, session_id=None) -> dict:
    print("[AGENT_JOBS] Job Application Agent — Coming Soon")

    output_text = """# Job Application Agent — Coming Soon

This agent is currently under development.

## What it will do (v1):
1. **Read Gmail** for job alert emails (Naukri, LinkedIn, Indeed alerts)
2. **Extract** job title, company name, and job description from email
3. **Match** the job description against your uploaded resume using AI
4. **Score** the match (0-100%) and filter jobs above your threshold
5. **Send** a professional application email to the recruiter/HR
6. **Log** every application to your Supabase dashboard

## How to activate it:
1. Go to Agent Hub → Job Application Agent → Connectors
2. Click "+ Connect" next to Gmail
3. Authorize access via Google OAuth
4. Upload your resume PDF in the Files panel
5. Set your match threshold (e.g. 70%)
6. The agent runs automatically on new job alert emails

## Coming in v2:
- LinkedIn Easy Apply integration
- Naukri profile auto-update
- Application tracking board (Applied / Interviewed / Rejected)
- Follow-up email automation after 7 days

Stay tuned!"""

    return {
        "output_text": output_text,
        "model_used":  "pending_setup",
        "status":      "coming_soon"
    }
