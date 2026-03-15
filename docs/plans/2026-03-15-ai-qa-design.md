# AI Q&A Feature Design

**Date:** 2026-03-15
**Status:** Approved
**Approach:** Context stuffing with single knowledge.md file

---

## Overview

Add an AI-powered Q&A feature to ClubClaw. Members can DM the bot or @mention it in any channel to ask club-related questions. The bot uses OpenAI GPT-4o-mini with a knowledge.md file as context to answer. Off-topic questions are politely declined.

## Decisions

- **Trigger:** DM the bot or @mention it in any channel
- **LLM Provider:** OpenAI GPT (gpt-4o-mini)
- **Knowledge source:** Single `knowledge.md` file at repo root, read from disk per question
- **Scope:** Club-only answers — off-topic questions are declined
- **Approach:** Context stuffing (load full knowledge.md into system prompt)

## Interaction Flow

```
Member DMs or @mentions bot with a question
    → Bot shows typing indicator
    → Bot reads knowledge.md from disk
    → Sends to OpenAI GPT-4o-mini with system prompt + knowledge
    → Bot replies in same channel/DM
```

## Config Changes

Add to `clubclaw.yaml`:
```yaml
ai:
  enabled: true
  provider: "openai"
  model: "gpt-4o-mini"
  knowledge_file: "knowledge.md"
```

New env var: `OPENAI_API_KEY`

## Module Structure

```
clubclaw/src/modules/ai/
  index.ts          ← initAi() — registers DM and mention listeners
  chat.ts           ← askQuestion() — calls OpenAI with knowledge context
  knowledge.ts      ← loadKnowledge() — reads knowledge.md from disk
```

## System Prompt

```
You are the AI assistant for {org.name}. {org.description}

You can ONLY answer questions about the club using the knowledge provided below.
If someone asks something unrelated to the club, politely say:
"I can only help with questions about {org.name}."

Keep answers concise and friendly.

## Club Knowledge

{contents of knowledge.md}
```

## Knowledge File

- Read from disk on each question (edits take effect without restart)
- If file missing or empty: bot replies "No knowledge base has been set up yet."
- Updated via git push + git pull on VPS

## Dependencies

- `openai` npm package
