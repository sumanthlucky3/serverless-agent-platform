---
title: Serverless Agent Platform Blueprint
author: Antigravity IDE
date: July 2026
---

# Serverless Agent Platform Blueprint

## 1. Executive Summary
This blueprint details a fully autonomous, serverless AI agent platform designed to operate with zero local compute requirements. The system allows a user to trigger complex coding and reasoning tasks directly from a mobile device, executing entirely in the cloud, and delivering the results via automated Pull Requests.

## 2. Core Architecture

### Trigger Layer (Mobile-First)
- **GitHub Issues**: Acts as the primary interface. The user submits a natural language task as a GitHub Issue from any device.
- **Webhook Events**: GitHub Actions listens for the `issues: [opened]` event to wake up the agent.

### Compute Layer (Zero-Cost Serverless)
- **GitHub Actions Runner**: Provides the ephemeral compute environment (`ubuntu-latest`).
- **Initialization**: Automatically checks out the repository, provisions Python 3.11, installs dependencies, and injects secure environment variables (API keys).

### Intelligence & Routing Layer
- **Groq Llama 3.3 (Router)**: Acts as an ultra-fast, low-latency classifier. It analyzes the GitHub Issue and categorizes the task (e.g., `FRONTEND` vs `GENERAL`).
- **HuggingFace Zephyr 7B (Frontend Worker)**: A specialized open-source model invoked for UI and styling tasks.
- **Gemini / Antigravity SDK (General Worker)**: A highly capable agent used for complex reasoning, logic, and general-purpose execution.

### Memory & State Layer
- **Supabase (PostgreSQL)**: Serves as the central memory bank.
- **Agent Runs Table**: Logs every task, the model used, execution status, and the final output for observability and future context retrieval.

### Delivery & Action Layer
- **Automated Branching**: The agent dynamically creates a unique branch for the task (e.g., `agent/issue-3`).
- **File Output**: The agent's response is formatted as markdown and committed to a `docs/agent_responses/` directory.
- **Pull Request Creation**: The GitHub CLI (`gh`) automatically opens a PR against the `main` branch.
- **Notification**: The system posts a comment back on the original GitHub Issue with a direct link to the PR, completing the mobile notification loop.

## 3. Workflow Diagram

1. **User (Mobile)** -> *Opens Issue* -> **GitHub**
2. **GitHub** -> *Triggers Action* -> **Ubuntu Runner**
3. **Ubuntu Runner** -> *Task String* -> **Groq Router**
4. **Groq Router** -> *Classification* -> **Specific LLM (Gemini/Zephyr)**
5. **LLM** -> *Output String* -> **Supabase (Logging)**
6. **Ubuntu Runner** -> *Commit & PR* -> **GitHub Repository**
7. **GitHub** -> *Comment Notification* -> **User (Mobile)**

## 4. Security & Permissions
- All API keys are stored securely in GitHub Actions Secrets.
- GitHub Actions is explicitly granted `contents: write`, `issues: write`, and `pull-requests: write` permissions.
- The `GITHUB_TOKEN` is dynamically passed to the `gh` CLI to authorize PR creation without requiring personal access tokens.
