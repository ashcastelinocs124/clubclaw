# ClubClaw

A Discord bot for campus student organizations — automates server management so club officers can focus on running their club, not configuring Discord.

## Features

- **Onboarding** — Sends a welcome embed when new members join with emoji-based role selection. Members react to pick their team/interest group and get roles assigned automatically.
- **Channel Management** — Declarative channel structure defined in YAML. ClubClaw reconciles your Discord server to match the config on startup, creating missing channels and categories with proper role-based permissions.
- **Auto-Archive** — Flags channels inactive for a configurable number of days by prefixing them with `archived-`.
- **Scheduled Announcements** — Cron-based scheduled messages (e.g., weekly meeting reminders) plus a `/announce` slash command for ad-hoc announcements.
- **Audit Logging** — All bot actions (role changes, channel creation, messages sent) are recorded to a local SQLite database.

## Requirements

- Node.js 22+
- A Discord bot token ([create one here](https://discord.com/developers/applications))

## Setup

```bash
# Clone the repo
git clone https://github.com/ashcastelinocs124/clubclaw.git
cd clubclaw/clubclaw

# Install dependencies
npm install

# Build
npm run build
```

### Configuration

Copy the example config and fill in your values:

```bash
cp clubclaw.example.yaml clubclaw.yaml
```

Edit `clubclaw.yaml`:

```yaml
org:
  name: "My Club"
  description: "A student organization"

discord:
  token: "${DISCORD_BOT_TOKEN}"   # reads from env var
  guild_id: "YOUR_GUILD_ID"

onboarding:
  welcome_channel: "welcome"
  welcome_message: "Hey {member}, welcome to {org}! React below to pick your team."
  verification:
    enabled: true
    method: "reaction"
    role: "Member"
  roles:
    - name: "Team A"
      emoji: "🅰️"
      description: "First team"
    - name: "Team B"
      emoji: "🅱️"
      description: "Second team"

channels:
  categories:
    - name: "Teams"
      channels:
        - name: "team-a"
          access: ["Team A"]
        - name: "team-b"
          access: ["Team B"]
  auto_archive:
    enabled: true
    inactive_days: 30

announcements:
  channel: "announcements"
  scheduled:
    - message: "Weekly meeting reminder!"
      cron: "0 10 * * WED"
```

Config values using `${ENV_VAR}` syntax are resolved from environment variables at load time.

### Running

```bash
# Set your bot token
export DISCORD_BOT_TOKEN="your-token-here"

# Production
npm start

# Development (auto-reload)
npm run dev
```

### Running with PM2

```bash
npm install -g pm2
cd clubclaw
pm2 start dist/index.js --name clubclaw
pm2 save
pm2 startup
```

## Project Structure

```
clubclaw/
  src/
    index.ts              # Entry point — wires config, db, and modules
    config/               # YAML config loader with Zod validation
    db/                   # SQLite database layer (better-sqlite3)
    bot/                  # Discord client setup and command registration
    modules/
      onboarding/         # Welcome messages + reaction role assignment
      channels/           # Channel reconciliation + auto-archive
      announcements/      # Scheduled messages + /announce command
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Discord:** discord.js v14
- **Database:** SQLite via better-sqlite3
- **Config:** YAML (js-yaml) + Zod schema validation
- **Scheduling:** node-cron
- **Tests:** Vitest

## Testing

```bash
npm test
```

## License

ISC
