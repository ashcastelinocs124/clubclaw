# ClubClaw v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Discord bot for student organizations that handles onboarding, channel management, and announcements — all driven by a single YAML config file.

**Architecture:** Monolithic TypeScript/Node.js bot. YAML config validated with Zod at startup. discord.js for Discord API. SQLite via better-sqlite3 for persistence. Three feature modules (onboarding, channels, announcements) initialized from config slices.

**Tech Stack:** TypeScript, Node.js, discord.js, Zod, js-yaml, better-sqlite3, node-cron, dotenv

**Design Doc:** `docs/plans/2026-03-15-clubclaw-v1-design.md`

---

### Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `clubclaw/package.json`
- Create: `clubclaw/tsconfig.json`
- Create: `clubclaw/.env.example`
- Create: `clubclaw/src/index.ts` (placeholder)

**Step 1: Initialize the Node.js project**

```bash
cd clubclaw/clubclaw
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install discord.js zod js-yaml better-sqlite3 node-cron dotenv
npm install -D typescript @types/node @types/better-sqlite3 @types/js-yaml @types/node-cron tsx vitest
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create .env.example**

```
DISCORD_BOT_TOKEN=your-bot-token-here
```

**Step 5: Create placeholder entry point**

Create `clubclaw/src/index.ts`:
```typescript
import 'dotenv/config';

console.log('ClubClaw starting...');
```

**Step 6: Add npm scripts to package.json**

Add to `scripts`:
```json
{
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "tsx watch src/index.ts",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 7: Verify it compiles and runs**

Run: `npm run build && npm start`
Expected: prints "ClubClaw starting..."

**Step 8: Commit**

```bash
git add clubclaw/
git commit -m "feat: scaffold clubclaw project with dependencies"
```

---

### Task 2: Config Schema & Loader

**Files:**
- Create: `clubclaw/src/config/schema.ts`
- Create: `clubclaw/src/config/loader.ts`
- Create: `clubclaw/src/config/index.ts`
- Test: `clubclaw/src/config/__tests__/loader.test.ts`
- Create: `clubclaw.example.yaml`

**Step 1: Write the failing test for env var resolution**

Create `clubclaw/src/config/__tests__/loader.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { resolveEnvVars } from '../loader.js';

describe('resolveEnvVars', () => {
  it('replaces ${VAR} with environment variable value', () => {
    process.env.TEST_TOKEN = 'abc123';
    expect(resolveEnvVars('${TEST_TOKEN}')).toBe('abc123');
    delete process.env.TEST_TOKEN;
  });

  it('leaves strings without env vars unchanged', () => {
    expect(resolveEnvVars('hello world')).toBe('hello world');
  });

  it('throws on missing env var', () => {
    expect(() => resolveEnvVars('${MISSING_VAR}')).toThrow('MISSING_VAR');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd clubclaw && npx vitest run src/config/__tests__/loader.test.ts`
Expected: FAIL — module not found

**Step 3: Write the Zod config schema**

Create `clubclaw/src/config/schema.ts`:
```typescript
import { z } from 'zod';

export const RoleSchema = z.object({
  name: z.string(),
  emoji: z.string(),
  description: z.string().optional(),
});

export const VerificationSchema = z.object({
  enabled: z.boolean().default(false),
  method: z.enum(['reaction', 'button', 'command']).default('reaction'),
  role: z.string(),
});

export const OnboardingSchema = z.object({
  welcome_channel: z.string(),
  welcome_message: z.string(),
  verification: VerificationSchema.optional(),
  roles: z.array(RoleSchema).default([]),
});

export const ChannelDefSchema = z.object({
  name: z.string(),
  access: z.array(z.string()).default([]),
});

export const CategorySchema = z.object({
  name: z.string(),
  channels: z.array(ChannelDefSchema).default([]),
});

export const AutoArchiveSchema = z.object({
  enabled: z.boolean().default(false),
  inactive_days: z.number().default(30),
});

export const ChannelsSchema = z.object({
  categories: z.array(CategorySchema).default([]),
  auto_archive: AutoArchiveSchema.optional(),
});

export const ScheduledMessageSchema = z.object({
  message: z.string(),
  cron: z.string(),
});

export const AnnouncementsSchema = z.object({
  channel: z.string(),
  scheduled: z.array(ScheduledMessageSchema).default([]),
});

export const AiSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['anthropic', 'openai']).default('anthropic'),
  features: z.array(z.string()).default([]),
});

export const ConfigSchema = z.object({
  org: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  discord: z.object({
    token: z.string(),
    guild_id: z.string(),
  }),
  onboarding: OnboardingSchema.optional(),
  channels: ChannelsSchema.optional(),
  announcements: AnnouncementsSchema.optional(),
  ai: AiSchema.optional(),
});

export type ClubClawConfig = z.infer<typeof ConfigSchema>;
```

**Step 4: Write the config loader**

Create `clubclaw/src/config/loader.ts`:
```typescript
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ConfigSchema, type ClubClawConfig } from './schema.js';

export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (match, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return envValue;
  });
}

function resolveEnvVarsDeep(obj: unknown): unknown {
  if (typeof obj === 'string') return resolveEnvVars(obj);
  if (Array.isArray(obj)) return obj.map(resolveEnvVarsDeep);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveEnvVarsDeep(value);
    }
    return result;
  }
  return obj;
}

export function loadConfig(configPath: string): ClubClawConfig {
  const absolutePath = path.resolve(configPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const parsed = yaml.load(raw);
  const resolved = resolveEnvVarsDeep(parsed);
  return ConfigSchema.parse(resolved);
}
```

**Step 5: Create barrel export**

Create `clubclaw/src/config/index.ts`:
```typescript
export { loadConfig, resolveEnvVars } from './loader.js';
export { ConfigSchema } from './schema.js';
export type { ClubClawConfig } from './schema.js';
```

**Step 6: Run tests to verify they pass**

Run: `cd clubclaw && npx vitest run src/config/__tests__/loader.test.ts`
Expected: 3 tests PASS

**Step 7: Write test for full config loading**

Add to `clubclaw/src/config/__tests__/loader.test.ts`:
```typescript
import { loadConfig } from '../loader.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('loadConfig', () => {
  it('loads and validates a valid YAML config', () => {
    const configYaml = `
org:
  name: "Test Club"
discord:
  token: "test-token"
  guild_id: "123"
onboarding:
  welcome_channel: "welcome"
  welcome_message: "Hello {member}!"
  roles:
    - name: "Dev"
      emoji: "💻"
`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-'));
    const tmpFile = path.join(tmpDir, 'clubclaw.yaml');
    fs.writeFileSync(tmpFile, configYaml);

    const config = loadConfig(tmpFile);
    expect(config.org.name).toBe('Test Club');
    expect(config.onboarding?.roles).toHaveLength(1);
    expect(config.onboarding?.roles[0].name).toBe('Dev');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('throws on missing config file', () => {
    expect(() => loadConfig('/nonexistent/path.yaml')).toThrow('Config file not found');
  });

  it('resolves env vars in config values', () => {
    process.env.TEST_BOT_TOKEN = 'secret-token';
    const configYaml = `
org:
  name: "Test Club"
discord:
  token: "\${TEST_BOT_TOKEN}"
  guild_id: "123"
`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-'));
    const tmpFile = path.join(tmpDir, 'clubclaw.yaml');
    fs.writeFileSync(tmpFile, configYaml);

    const config = loadConfig(tmpFile);
    expect(config.discord.token).toBe('secret-token');

    fs.rmSync(tmpDir, { recursive: true });
    delete process.env.TEST_BOT_TOKEN;
  });
});
```

**Step 8: Run all config tests**

Run: `cd clubclaw && npx vitest run src/config/__tests__/loader.test.ts`
Expected: 6 tests PASS

**Step 9: Create the example YAML config**

Create `clubclaw.example.yaml` at the repo root:
```yaml
# ClubClaw Configuration
# Copy this file to clubclaw.yaml and fill in your values.

org:
  name: "My Club"
  description: "A student organization"

discord:
  token: "${DISCORD_BOT_TOKEN}"
  guild_id: "YOUR_GUILD_ID_HERE"

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

ai:
  enabled: false
  provider: "anthropic"
  features: []
```

**Step 10: Commit**

```bash
git add clubclaw/src/config/ clubclaw.example.yaml
git commit -m "feat: add config schema (Zod) and YAML loader with env var resolution"
```

---

### Task 3: Database Layer (SQLite)

**Files:**
- Create: `clubclaw/src/db/index.ts`
- Create: `clubclaw/src/db/schema.ts`
- Test: `clubclaw/src/db/__tests__/db.test.ts`

**Step 1: Write the failing test**

Create `clubclaw/src/db/__tests__/db.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type Database } from '../index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Database', () => {
  let db: Database;
  let dbPath: string;

  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-db-'));
    dbPath = path.join(tmpDir, 'test.db');
    db = createDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true });
  });

  it('creates tables on init', () => {
    const tables = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('members');
    expect(names).toContain('scheduled_messages');
    expect(names).toContain('audit_log');
  });

  it('inserts and retrieves a member', () => {
    db.upsertMember('guild1', 'user1', true, ['Dev']);
    const member = db.getMember('guild1', 'user1');
    expect(member).not.toBeNull();
    expect(member!.verified).toBe(1);
    expect(member!.roles).toBe('Dev');
  });

  it('logs an audit entry', () => {
    db.logAudit('role_assign', 'user1', 'Assigned Dev role');
    const logs = db.getAuditLog(10);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('role_assign');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd clubclaw && npx vitest run src/db/__tests__/db.test.ts`
Expected: FAIL — module not found

**Step 3: Write the database schema and functions**

Create `clubclaw/src/db/schema.ts`:
```typescript
export const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS members (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    roles TEXT NOT NULL DEFAULT '',
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    message TEXT NOT NULL,
    cron TEXT NOT NULL,
    last_sent TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    user_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;
```

Create `clubclaw/src/db/index.ts`:
```typescript
import BetterSqlite3 from 'better-sqlite3';
import { INIT_SQL } from './schema.js';

export interface MemberRow {
  guild_id: string;
  user_id: string;
  verified: number;
  roles: string;
  joined_at: string;
}

export interface AuditRow {
  id: number;
  action: string;
  user_id: string | null;
  details: string | null;
  created_at: string;
}

export interface Database {
  raw: BetterSqlite3.Database;
  upsertMember(guildId: string, userId: string, verified: boolean, roles: string[]): void;
  getMember(guildId: string, userId: string): MemberRow | null;
  logAudit(action: string, userId: string | null, details: string | null): void;
  getAuditLog(limit: number): AuditRow[];
  close(): void;
}

export function createDatabase(dbPath: string): Database {
  const raw = new BetterSqlite3(dbPath);
  raw.pragma('journal_mode = WAL');
  raw.exec(INIT_SQL);

  return {
    raw,

    upsertMember(guildId, userId, verified, roles) {
      raw
        .prepare(
          `INSERT INTO members (guild_id, user_id, verified, roles)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(guild_id, user_id)
           DO UPDATE SET verified = excluded.verified, roles = excluded.roles`
        )
        .run(guildId, userId, verified ? 1 : 0, roles.join(','));
    },

    getMember(guildId, userId) {
      return (
        raw
          .prepare('SELECT * FROM members WHERE guild_id = ? AND user_id = ?')
          .get(guildId, userId) as MemberRow | undefined
      ) ?? null;
    },

    logAudit(action, userId, details) {
      raw
        .prepare('INSERT INTO audit_log (action, user_id, details) VALUES (?, ?, ?)')
        .run(action, userId, details);
    },

    getAuditLog(limit) {
      return raw
        .prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?')
        .all(limit) as AuditRow[];
    },

    close() {
      raw.close();
    },
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd clubclaw && npx vitest run src/db/__tests__/db.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add clubclaw/src/db/
git commit -m "feat: add SQLite database layer with members, scheduled_messages, audit_log"
```

---

### Task 4: Discord Bot Client & Command Registration

**Files:**
- Create: `clubclaw/src/bot/client.ts`
- Create: `clubclaw/src/bot/commands.ts`
- Create: `clubclaw/src/bot/index.ts`
- Modify: `clubclaw/src/index.ts`

**Step 1: Create the Discord client wrapper**

Create `clubclaw/src/bot/client.ts`:
```typescript
import { Client, GatewayIntentBits, Partials } from 'discord.js';

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Message,
      Partials.Reaction,
      Partials.GuildMember,
    ],
  });
}
```

**Step 2: Create the command registration system**

Create `clubclaw/src/bot/commands.ts`:
```typescript
import {
  REST,
  Routes,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export async function registerCommands(
  token: string,
  clientId: string,
  guildId: string,
  commands: RESTPostAPIChatInputApplicationCommandsJSONBody[]
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  });
  console.log(`Registered ${commands.length} slash commands`);
}
```

**Step 3: Create barrel export**

Create `clubclaw/src/bot/index.ts`:
```typescript
export { createClient } from './client.js';
export { registerCommands } from './commands.js';
```

**Step 4: Wire up the entry point**

Update `clubclaw/src/index.ts`:
```typescript
import 'dotenv/config';
import path from 'node:path';
import { loadConfig } from './config/index.js';
import { createDatabase } from './db/index.js';
import { createClient } from './bot/index.js';

async function main() {
  // 1. Load config
  const configPath = process.env.CLUBCLAW_CONFIG || path.resolve(process.cwd(), '..', 'clubclaw.yaml');
  console.log(`Loading config from ${configPath}`);
  const config = loadConfig(configPath);
  console.log(`Loaded config for org: ${config.org.name}`);

  // 2. Init database
  const dbPath = process.env.CLUBCLAW_DB || path.resolve(process.cwd(), 'data', 'clubclaw.db');
  const db = createDatabase(dbPath);
  console.log('Database initialized');

  // 3. Create Discord client
  const client = createClient();

  client.once('ready', (c) => {
    console.log(`Logged in as ${c.user.tag}`);
  });

  // 4. Login
  await client.login(config.discord.token);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    client.destroy();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Step 5: Verify it compiles**

Run: `cd clubclaw && npm run build`
Expected: no errors

**Step 6: Commit**

```bash
git add clubclaw/src/bot/ clubclaw/src/index.ts
git commit -m "feat: add Discord client setup and slash command registration"
```

---

### Task 5: Onboarding Module

**Files:**
- Create: `clubclaw/src/modules/onboarding/index.ts`
- Create: `clubclaw/src/modules/onboarding/welcome.ts`
- Create: `clubclaw/src/modules/onboarding/roles.ts`
- Test: `clubclaw/src/modules/onboarding/__tests__/roles.test.ts`

**Step 1: Write the failing test for role parsing**

Create `clubclaw/src/modules/onboarding/__tests__/roles.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildRoleEmbed, matchEmojiToRole } from '../roles.js';

describe('matchEmojiToRole', () => {
  const roles = [
    { name: 'Frontend', emoji: '🎨' },
    { name: 'Backend', emoji: '⚙️' },
  ];

  it('matches an emoji to the correct role', () => {
    expect(matchEmojiToRole('🎨', roles)).toBe('Frontend');
  });

  it('returns null for unknown emoji', () => {
    expect(matchEmojiToRole('🔥', roles)).toBeNull();
  });
});

describe('buildRoleEmbed', () => {
  it('formats roles into an embed description', () => {
    const roles = [
      { name: 'Frontend', emoji: '🎨', description: 'Frontend team' },
      { name: 'Backend', emoji: '⚙️' },
    ];
    const desc = buildRoleEmbed(roles);
    expect(desc).toContain('🎨');
    expect(desc).toContain('Frontend');
    expect(desc).toContain('Frontend team');
    expect(desc).toContain('⚙️');
    expect(desc).toContain('Backend');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd clubclaw && npx vitest run src/modules/onboarding/__tests__/roles.test.ts`
Expected: FAIL — module not found

**Step 3: Implement role helpers**

Create `clubclaw/src/modules/onboarding/roles.ts`:
```typescript
interface RoleDef {
  name: string;
  emoji: string;
  description?: string;
}

export function matchEmojiToRole(emoji: string, roles: RoleDef[]): string | null {
  const found = roles.find((r) => r.emoji === emoji);
  return found?.name ?? null;
}

export function buildRoleEmbed(roles: RoleDef[]): string {
  return roles
    .map((r) => {
      const desc = r.description ? ` — ${r.description}` : '';
      return `${r.emoji} **${r.name}**${desc}`;
    })
    .join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `cd clubclaw && npx vitest run src/modules/onboarding/__tests__/roles.test.ts`
Expected: 3 tests PASS

**Step 5: Implement welcome message sender**

Create `clubclaw/src/modules/onboarding/welcome.ts`:
```typescript
import { EmbedBuilder, type TextChannel, type GuildMember } from 'discord.js';
import type { ClubClawConfig } from '../../config/index.js';
import { buildRoleEmbed } from './roles.js';

export function formatWelcomeMessage(
  template: string,
  member: GuildMember,
  orgName: string
): string {
  return template
    .replace(/\{member\}/g, `<@${member.id}>`)
    .replace(/\{org\}/g, orgName);
}

export async function sendWelcomeMessage(
  channel: TextChannel,
  member: GuildMember,
  config: ClubClawConfig
): Promise<void> {
  const onboarding = config.onboarding;
  if (!onboarding) return;

  const message = formatWelcomeMessage(
    onboarding.welcome_message,
    member,
    config.org.name
  );

  const embed = new EmbedBuilder()
    .setTitle(`Welcome to ${config.org.name}!`)
    .setDescription(message)
    .setColor(0x5865f2);

  if (onboarding.roles.length > 0) {
    embed.addFields({
      name: 'Pick your roles',
      value: buildRoleEmbed(onboarding.roles),
    });
  }

  const sent = await channel.send({ embeds: [embed] });

  // Add role reaction emojis
  for (const role of onboarding.roles) {
    await sent.react(role.emoji);
  }

  // Add verification emoji if enabled
  if (onboarding.verification?.enabled) {
    await sent.react('✅');
  }
}
```

**Step 6: Implement the onboarding module init**

Create `clubclaw/src/modules/onboarding/index.ts`:
```typescript
import {
  type Client,
  type TextChannel,
  type GuildMember,
  type MessageReaction,
  type User,
  type PartialMessageReaction,
  type PartialUser,
} from 'discord.js';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';
import { matchEmojiToRole } from './roles.js';
import { sendWelcomeMessage } from './welcome.js';

export function initOnboarding(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const onboarding = config.onboarding;
  if (!onboarding) {
    console.log('Onboarding module: disabled (no config)');
    return;
  }

  // Handle new member joins
  client.on('guildMemberAdd', async (member: GuildMember) => {
    try {
      const channel = member.guild.channels.cache.find(
        (ch) => ch.name === onboarding.welcome_channel
      ) as TextChannel | undefined;

      if (!channel) {
        console.error(`Welcome channel "${onboarding.welcome_channel}" not found`);
        return;
      }

      await sendWelcomeMessage(channel, member, config);
      db.upsertMember(member.guild.id, member.id, false, []);
      db.logAudit('member_join', member.id, `${member.user.tag} joined`);
      console.log(`Welcomed ${member.user.tag}`);
    } catch (err) {
      console.error('Error in onboarding:', err);
    }
  });

  // Handle reaction-based role assignment
  client.on(
    'messageReactionAdd',
    async (
      reaction: MessageReaction | PartialMessageReaction,
      user: User | PartialUser
    ) => {
      if (user.bot) return;

      // Fetch partials if needed
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const guild = reaction.message.guild;
      if (!guild) return;

      const emoji = reaction.emoji.name;
      if (!emoji) return;

      const member = await guild.members.fetch(user.id);

      // Verification check
      if (
        emoji === '✅' &&
        onboarding.verification?.enabled
      ) {
        const verifyRole = guild.roles.cache.find(
          (r) => r.name === onboarding.verification!.role
        );
        if (verifyRole) {
          await member.roles.add(verifyRole);
          db.upsertMember(guild.id, user.id, true, member.roles.cache.map((r) => r.name));
          db.logAudit('verify', user.id, `Verified via reaction`);
          console.log(`Verified ${user.id}`);
        }
        return;
      }

      // Role assignment
      const roleName = matchEmojiToRole(emoji, onboarding.roles);
      if (roleName) {
        const role = guild.roles.cache.find((r) => r.name === roleName);
        if (role) {
          await member.roles.add(role);
          const currentRoles = member.roles.cache.map((r) => r.name);
          db.upsertMember(guild.id, user.id, true, currentRoles);
          db.logAudit('role_assign', user.id, `Assigned ${roleName}`);
          console.log(`Assigned role ${roleName} to ${user.id}`);
        }
      }
    }
  );

  console.log('Onboarding module: initialized');
}
```

**Step 7: Verify it compiles**

Run: `cd clubclaw && npm run build`
Expected: no errors

**Step 8: Commit**

```bash
git add clubclaw/src/modules/onboarding/
git commit -m "feat: add onboarding module with welcome messages and role assignment"
```

---

### Task 6: Channels Module

**Files:**
- Create: `clubclaw/src/modules/channels/index.ts`
- Create: `clubclaw/src/modules/channels/reconcile.ts`
- Create: `clubclaw/src/modules/channels/archive.ts`
- Test: `clubclaw/src/modules/channels/__tests__/reconcile.test.ts`

**Step 1: Write the failing test for reconciliation diffing**

Create `clubclaw/src/modules/channels/__tests__/reconcile.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { diffChannels } from '../reconcile.js';

describe('diffChannels', () => {
  it('detects channels that need to be created', () => {
    const configured = [
      { name: 'frontend', access: ['Frontend'] },
      { name: 'backend', access: ['Backend'] },
    ];
    const existing = ['frontend'];

    const diff = diffChannels(configured, existing);
    expect(diff.toCreate).toEqual([{ name: 'backend', access: ['Backend'] }]);
  });

  it('returns empty when all channels exist', () => {
    const configured = [{ name: 'general', access: [] }];
    const existing = ['general'];

    const diff = diffChannels(configured, existing);
    expect(diff.toCreate).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd clubclaw && npx vitest run src/modules/channels/__tests__/reconcile.test.ts`
Expected: FAIL — module not found

**Step 3: Implement reconciliation logic**

Create `clubclaw/src/modules/channels/reconcile.ts`:
```typescript
interface ChannelDef {
  name: string;
  access: string[];
}

interface ChannelDiff {
  toCreate: ChannelDef[];
}

export function diffChannels(
  configured: ChannelDef[],
  existingNames: string[]
): ChannelDiff {
  const existingSet = new Set(existingNames);
  const toCreate = configured.filter((ch) => !existingSet.has(ch.name));
  return { toCreate };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd clubclaw && npx vitest run src/modules/channels/__tests__/reconcile.test.ts`
Expected: 2 tests PASS

**Step 5: Implement auto-archive helper**

Create `clubclaw/src/modules/channels/archive.ts`:
```typescript
import { type TextChannel, ChannelType } from 'discord.js';

export function isChannelInactive(
  channel: TextChannel,
  inactiveDays: number
): boolean {
  const now = Date.now();
  const lastMessage = channel.lastMessageId;
  if (!lastMessage) return true;

  // Discord snowflake: (id >> 22) + 1420070400000 = timestamp
  const lastMessageTimestamp = Number(BigInt(lastMessage) >> 22n) + 1420070400000;
  const daysSinceLastMessage = (now - lastMessageTimestamp) / (1000 * 60 * 60 * 24);
  return daysSinceLastMessage >= inactiveDays;
}
```

**Step 6: Implement channels module init**

Create `clubclaw/src/modules/channels/index.ts`:
```typescript
import {
  type Client,
  type Guild,
  ChannelType,
  PermissionsBitField,
  type TextChannel,
} from 'discord.js';
import cron from 'node-cron';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';
import { diffChannels } from './reconcile.js';
import { isChannelInactive } from './archive.js';

async function reconcileGuild(guild: Guild, config: ClubClawConfig): Promise<void> {
  const channelsConfig = config.channels;
  if (!channelsConfig) return;

  for (const category of channelsConfig.categories) {
    // Find or create category
    let discordCategory = guild.channels.cache.find(
      (ch) => ch.name === category.name && ch.type === ChannelType.GuildCategory
    );

    if (!discordCategory) {
      discordCategory = await guild.channels.create({
        name: category.name,
        type: ChannelType.GuildCategory,
      });
      console.log(`Created category: ${category.name}`);
    }

    // Diff channels
    const existingNames = guild.channels.cache
      .filter((ch) => ch.parentId === discordCategory!.id)
      .map((ch) => ch.name);

    const diff = diffChannels(category.channels, Array.from(existingNames));

    for (const ch of diff.toCreate) {
      const permissionOverwrites = ch.access.length > 0
        ? [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            ...ch.access.map((roleName) => {
              const role = guild.roles.cache.find((r) => r.name === roleName);
              return role
                ? {
                    id: role.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                  }
                : null;
            }).filter(Boolean) as { id: string; allow: bigint[] }[],
          ]
        : [];

      await guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: discordCategory.id,
        permissionOverwrites,
      });
      console.log(`Created channel: #${ch.name} under ${category.name}`);
    }
  }
}

export function initChannels(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const channelsConfig = config.channels;
  if (!channelsConfig) {
    console.log('Channels module: disabled (no config)');
    return;
  }

  // Reconcile on startup
  client.once('ready', async () => {
    const guild = client.guilds.cache.get(config.discord.guild_id);
    if (!guild) {
      console.error(`Guild ${config.discord.guild_id} not found`);
      return;
    }
    await reconcileGuild(guild, config);
    console.log('Channel reconciliation complete');
  });

  // Auto-archive cron (runs daily at midnight)
  if (channelsConfig.auto_archive?.enabled) {
    cron.schedule('0 0 * * *', async () => {
      const guild = client.guilds.cache.get(config.discord.guild_id);
      if (!guild) return;

      const inactiveDays = channelsConfig.auto_archive!.inactive_days;
      const textChannels = guild.channels.cache.filter(
        (ch) => ch.type === ChannelType.GuildText
      );

      for (const [, channel] of textChannels) {
        const textChannel = channel as TextChannel;
        if (isChannelInactive(textChannel, inactiveDays)) {
          await textChannel.send(
            `This channel has been inactive for ${inactiveDays}+ days and will be archived.`
          );
          await textChannel.setArchived(true).catch(() => {
            // Not a thread, just rename to mark as archived
            textChannel.setName(`archived-${textChannel.name}`);
          });
          db.logAudit('channel_archive', null, `Archived #${textChannel.name}`);
          console.log(`Archived #${textChannel.name}`);
        }
      }
    });
  }

  console.log('Channels module: initialized');
}
```

**Step 7: Verify it compiles**

Run: `cd clubclaw && npm run build`
Expected: no errors

**Step 8: Commit**

```bash
git add clubclaw/src/modules/channels/
git commit -m "feat: add channels module with reconciliation and auto-archive"
```

---

### Task 7: Announcements Module

**Files:**
- Create: `clubclaw/src/modules/announcements/index.ts`
- Test: `clubclaw/src/modules/announcements/__tests__/announcements.test.ts`

**Step 1: Write the failing test for cron validation**

Create `clubclaw/src/modules/announcements/__tests__/announcements.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import cron from 'node-cron';

describe('Announcements cron expressions', () => {
  it('validates a correct cron expression', () => {
    expect(cron.validate('0 10 * * WED')).toBe(true);
  });

  it('rejects an invalid cron expression', () => {
    expect(cron.validate('not a cron')).toBe(false);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `cd clubclaw && npx vitest run src/modules/announcements/__tests__/announcements.test.ts`
Expected: 2 tests PASS (these test node-cron directly)

**Step 3: Implement announcements module**

Create `clubclaw/src/modules/announcements/index.ts`:
```typescript
import { type Client, type TextChannel, SlashCommandBuilder } from 'discord.js';
import cron from 'node-cron';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';

export function getAnnouncementCommands() {
  return [
    new SlashCommandBuilder()
      .setName('announce')
      .setDescription('Send an announcement to the announcements channel')
      .addStringOption((opt) =>
        opt
          .setName('message')
          .setDescription('The announcement message')
          .setRequired(true)
      )
      .toJSON(),
  ];
}

export function initAnnouncements(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const announcementsConfig = config.announcements;
  if (!announcementsConfig) {
    console.log('Announcements module: disabled (no config)');
    return;
  }

  // Register scheduled messages
  for (const scheduled of announcementsConfig.scheduled) {
    if (!cron.validate(scheduled.cron)) {
      console.error(`Invalid cron expression: ${scheduled.cron}`);
      continue;
    }

    cron.schedule(scheduled.cron, async () => {
      const guild = client.guilds.cache.get(config.discord.guild_id);
      if (!guild) return;

      const channel = guild.channels.cache.find(
        (ch) => ch.name === announcementsConfig.channel
      ) as TextChannel | undefined;

      if (!channel) {
        console.error(`Announcements channel "${announcementsConfig.channel}" not found`);
        return;
      }

      await channel.send(scheduled.message);
      db.logAudit('announcement', null, `Scheduled: ${scheduled.message.slice(0, 50)}`);
      console.log(`Sent scheduled announcement to #${announcementsConfig.channel}`);
    });

    console.log(`Scheduled: "${scheduled.message.slice(0, 40)}..." at ${scheduled.cron}`);
  }

  // Handle /announce slash command
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'announce') return;

    const message = interaction.options.getString('message', true);
    const guild = interaction.guild;
    if (!guild) return;

    const channel = guild.channels.cache.find(
      (ch) => ch.name === announcementsConfig.channel
    ) as TextChannel | undefined;

    if (!channel) {
      await interaction.reply({
        content: `Channel "${announcementsConfig.channel}" not found.`,
        ephemeral: true,
      });
      return;
    }

    await channel.send(message);
    db.logAudit('announcement', interaction.user.id, `Ad-hoc: ${message.slice(0, 50)}`);
    await interaction.reply({ content: 'Announcement sent!', ephemeral: true });
  });

  console.log('Announcements module: initialized');
}
```

**Step 4: Verify it compiles**

Run: `cd clubclaw && npm run build`
Expected: no errors

**Step 5: Commit**

```bash
git add clubclaw/src/modules/announcements/
git commit -m "feat: add announcements module with cron scheduling and /announce command"
```

---

### Task 8: Wire Everything Together in Entry Point

**Files:**
- Modify: `clubclaw/src/index.ts`

**Step 1: Update entry point to initialize all modules**

Update `clubclaw/src/index.ts`:
```typescript
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config/index.js';
import { createDatabase } from './db/index.js';
import { createClient, registerCommands } from './bot/index.js';
import { initOnboarding } from './modules/onboarding/index.js';
import { initChannels } from './modules/channels/index.js';
import { initAnnouncements, getAnnouncementCommands } from './modules/announcements/index.js';

async function main() {
  // 1. Load config
  const configPath = process.env.CLUBCLAW_CONFIG || path.resolve(process.cwd(), '..', 'clubclaw.yaml');
  console.log(`Loading config from ${configPath}`);
  const config = loadConfig(configPath);
  console.log(`Loaded config for org: ${config.org.name}`);

  // 2. Init database
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = process.env.CLUBCLAW_DB || path.join(dataDir, 'clubclaw.db');
  const db = createDatabase(dbPath);
  console.log('Database initialized');

  // 3. Create Discord client
  const client = createClient();

  // 4. Init modules (register event listeners before login)
  initOnboarding(client, config, db);
  initChannels(client, config, db);
  initAnnouncements(client, config, db);

  // 5. Register slash commands on ready
  client.once('ready', async (c) => {
    console.log(`Logged in as ${c.user.tag}`);

    const commands = [...getAnnouncementCommands()];
    if (commands.length > 0) {
      await registerCommands(
        config.discord.token,
        c.user.id,
        config.discord.guild_id,
        commands
      );
    }
  });

  // 6. Login
  await client.login(config.discord.token);

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down...');
    client.destroy();
    db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Step 2: Verify it compiles**

Run: `cd clubclaw && npm run build`
Expected: no errors

**Step 3: Run all tests**

Run: `cd clubclaw && npx vitest run`
Expected: all tests PASS

**Step 4: Commit**

```bash
git add clubclaw/src/index.ts
git commit -m "feat: wire all modules together in main entry point"
```

---

### Task 9: Add .gitignore, README, and Final Polish

**Files:**
- Create: `clubclaw/clubclaw/.gitignore`
- Create: `.gitignore` (repo root)
- Modify: `clubclaw.example.yaml` (already exists)

**Step 1: Create .gitignore for the source project**

Create `clubclaw/clubclaw/.gitignore`:
```
node_modules/
dist/
data/
.env
```

**Step 2: Create repo-root .gitignore**

Create `clubclaw/.gitignore` (repo root):
```
clubclaw.yaml
.env
node_modules/
dist/
data/
*.db
```

**Step 3: Run full test suite one more time**

Run: `cd clubclaw/clubclaw && npx vitest run`
Expected: all tests PASS

**Step 4: Run build one more time**

Run: `cd clubclaw/clubclaw && npm run build`
Expected: no errors

**Step 5: Commit**

```bash
git add .gitignore clubclaw/.gitignore
git commit -m "chore: add .gitignore files"
```

---

## Summary

| Task | What It Builds | Tests |
|------|---------------|-------|
| 1 | Project scaffold, deps, tsconfig | build check |
| 2 | Config schema (Zod) + YAML loader | 6 unit tests |
| 3 | SQLite database layer | 3 unit tests |
| 4 | Discord client + command registration | build check |
| 5 | Onboarding module (welcome + roles) | 3 unit tests |
| 6 | Channels module (reconcile + archive) | 2 unit tests |
| 7 | Announcements module (cron + /announce) | 2 unit tests |
| 8 | Wire everything in entry point | full suite |
| 9 | .gitignore + final polish | full suite |

**Total: 9 tasks, ~16 unit tests, TDD throughout**
