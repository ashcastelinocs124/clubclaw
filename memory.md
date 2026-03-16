# Memory

## Current State
- **Phase:** Implementation (2026-03-15)
- **What's done:** Task 1 (scaffold), Task 2 (config schema & loader), Task 3 (database layer), Task 4 (Discord bot client & commands), Task 5 (onboarding module), Task 6 (channels module), Task 7 (announcements module), Task 8 (wire everything together), Task 9 (.gitignore & final polish) complete
- **What's in progress:** All implementation tasks complete

## Key Decisions
- Config is YAML-based with Zod validation (schema.ts) and env var resolution (`${VAR}` syntax)
- Config loader recursively resolves env vars in all string values before Zod validation
- Barrel exports from `config/index.ts` -- other modules should import from `config/index.js`
- Database: SQLite via better-sqlite3 with WAL mode; `createDatabase(path)` returns a `Database` object
- Three tables: `members` (composite PK: guild_id + user_id), `scheduled_messages`, `audit_log`
- Database module exports from `db/index.ts` -- import from `db/index.js`
- Bot module: `bot/client.ts` (createClient), `bot/commands.ts` (registerCommands), barrel from `bot/index.ts`
- Entry point (`src/index.ts`) wires config -> database -> Discord client with graceful SIGINT shutdown

## Known Patterns / Conventions
- Module system: CommonJS with Node16 module resolution, `.js` extensions in imports
- Test framework: vitest, tests live in `__tests__/` directories alongside source
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`)
- Zod v4 is installed (4.3.6) -- API is compatible with v3 for basic schemas
- Onboarding module: `modules/onboarding/` with index.ts (init), welcome.ts (embed sender), roles.ts (helpers)
- Channels module: `modules/channels/` with index.ts (init), reconcile.ts (diff logic), archive.ts (inactivity check)
- vitest.config.ts added to exclude `dist/` from test discovery (fixes false failures from compiled JS)
