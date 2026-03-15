# ClubClaw v1 Design

**Date:** 2026-03-15
**Status:** Approved
**Approach:** Monolithic bot (Approach A)

---

## Overview

ClubClaw v1 is a Discord bot for student organizations, configured via YAML, handling onboarding/roles, channel management, and announcements/scheduling. TypeScript/Node.js. Optional light AI features. Bot-first interaction model.

**Inspired by:**
- **OpenClaw** — multi-channel gateway pattern, plugin architecture concepts, skills system
- **Nanobot** — YAML-driven declarative config, MCP tool integration patterns, workflow automation

## Decisions

- **Platform:** Discord only (v1). Slack and email deferred to v2.
- **Interaction model:** Bot-first. Officers configure via YAML, members interact via Discord.
- **Tech stack:** TypeScript / Node.js
- **Config:** YAML files validated with Zod at startup
- **AI:** Optional, disabled by default. Light integration (summarize threads, smart welcome) when enabled.
- **Hosting:** Hetzner VPS, single process, SQLite for persistence.
- **Architecture:** Monolithic with clean module boundaries (extractable to plugins later).

## Project Structure

```
clubclaw/
  clubclaw.example.yaml      ← sample config for orgs to copy
  clubclaw/
    src/
      index.ts                ← entry point: load config, init bot
      config/
        schema.ts             ← Zod schema for clubclaw.yaml
        loader.ts             ← parse + validate YAML config
      bot/
        client.ts             ← discord.js client setup
        commands.ts           ← slash command registration
      modules/
        onboarding/           ← welcome, verification, role assignment
        channels/             ← create/archive, naming, permissions
        announcements/        ← broadcasts, events, scheduling
      ai/
        index.ts              ← optional LLM integration
      utils/
    package.json
    tsconfig.json
```

## Config Schema (`clubclaw.yaml`)

```yaml
org:
  name: "CS Club"
  description: "Computer Science Club at State University"

discord:
  token: "${DISCORD_BOT_TOKEN}"   # env var reference
  guild_id: "123456789"

onboarding:
  welcome_channel: "welcome"
  welcome_message: "Hey {member}, welcome to {org}! Pick your roles below."
  verification:
    enabled: true
    method: "reaction"            # reaction | button | command
    role: "Verified"
  roles:
    - name: "Frontend"
      emoji: "🎨"
      description: "Frontend development team"
    - name: "Backend"
      emoji: "⚙️"
      description: "Backend development team"
    - name: "Design"
      emoji: "✏️"
      description: "UI/UX design team"

channels:
  categories:
    - name: "Teams"
      channels:
        - name: "frontend"
          access: ["Frontend"]
        - name: "backend"
          access: ["Backend"]
  auto_archive:
    enabled: true
    inactive_days: 30

announcements:
  channel: "announcements"
  scheduled:
    - message: "Weekly meeting tomorrow at 7pm!"
      cron: "0 10 * * WED"
    - message: "Don't forget to check #opportunities"
      cron: "0 9 * * MON"

ai:
  enabled: false
  provider: "anthropic"            # anthropic | openai
  features:
    - summarize_threads
    - smart_welcome
```

Env vars resolved via `${VAR}` syntax. Validated at startup with Zod.

## Architecture

```
                    clubclaw.yaml
                         │
                    ┌────▼────┐
                    │  Loader  │  parse YAML, validate with Zod, resolve env vars
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  Client  │  discord.js client, slash command registration
                    └────┬────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼──────┐
    │ Onboarding│ │ Channels  │ │Announcements│
    │  Module   │ │  Module   │ │   Module    │
    └─────┬─────┘ └─────┬─────┘ └─────┬──────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                    ┌────▼────┐
                    │  SQLite  │  persistent state
                    └─────────┘
```

### Startup Flow

1. Load & validate `clubclaw.yaml`
2. Connect discord.js client
3. Register slash commands
4. Init each module with its config slice + client + db
5. Modules register their own event listeners and cron jobs

### Dependencies

- `discord.js` — Discord API
- `zod` — config validation
- `js-yaml` — YAML parsing
- `node-cron` — scheduled announcements
- `better-sqlite3` — persistent state
- `dotenv` — env var loading

### SQLite Tables

- `members` — guild_id, user_id, verified, roles, joined_at
- `scheduled_messages` — id, channel, message, cron, last_sent
- `audit_log` — action, user_id, timestamp, details

## Module Details

### Onboarding Module

- Listens to `guildMemberAdd` event
- Sends welcome embed with role reaction buttons to configured channel
- On reaction/button click: assigns corresponding Discord role
- Verification flow: member reacts with ✅ → gets verified role → unlocks channels
- Tracks member state in SQLite (`members` table)

### Channels Module

- On startup: reconciles Discord server state with YAML config (creates missing categories/channels, sets permissions)
- Role-gated access via Discord permission overwrites based on `access` array
- Auto-archive: `node-cron` job checks channel activity daily, archives inactive ones
- Slash command: `/channel create <name> [--access Role1,Role2]`

### Announcements Module

- Registers `node-cron` jobs from `scheduled` config
- Sends messages to configured channel at cron time
- Slash command: `/announce <message>` for ad-hoc broadcasts
- Stores last-sent timestamps in SQLite to prevent duplicate sends on restart

### AI Module (optional, v1.1)

- Disabled by default (`ai.enabled: false`)
- When enabled:
  - `summarize_threads`: summarize long Discord threads via `/summarize`
  - `smart_welcome`: personalize welcome messages using LLM
- Uses Anthropic or OpenAI SDK based on `ai.provider`
- Lightweight wrapper — direct API calls, no agent framework

## Deployment

- **Host:** Hetzner VPS
- **Process manager:** PM2 or systemd
- **Deploy flow:** `git pull && npm run build && pm2 restart clubclaw`
- **Database:** SQLite file on disk (backed up via cron)
- **Env vars:** `.env` file with `DISCORD_BOT_TOKEN` (and optionally AI API keys)
