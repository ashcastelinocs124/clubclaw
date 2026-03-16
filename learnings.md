# Learnings

> Captured insights from development sessions on clubclaw.

### 2026-03-15 — Vitest picks up compiled JS in dist/
- **What:** Running `npx vitest run` without a config caused vitest to discover and attempt to run compiled `.js` test files in `dist/`, which fail because vitest v4 cannot be `require()`d in CJS modules.
- **Why it matters:** Every `npm run build` followed by `npx vitest run` would show 3 false failures from `dist/` even though all source tests pass. Confusing output.
- **Fix/Pattern:** Added `clubclaw/vitest.config.ts` with `test.exclude: ['dist/**', 'node_modules/**']` to prevent vitest from scanning the build output directory.

### 2026-03-15 — TextChannel.setArchived does not exist in discord.js v14
- **What:** The task spec called `textChannel.setArchived(true)` but `setArchived` is only available on `ThreadChannel`, not `TextChannel`. TypeScript caught this at compile time (`TS2339`).
- **Why it matters:** Discord's channel archival concept only applies to threads. For regular text channels, you must use alternative approaches (rename with prefix, move to archive category, or delete).
- **Fix/Pattern:** Replaced `setArchived()` with `setName('archived-...')` with a guard to avoid double-prefixing. Always check discord.js type definitions when the task spec references a method -- the API surface differs between channel types.

### 2026-03-15 — Vitest afterEach cleanup with shared tmpDir variable
- **What:** When multiple tests share a `let tmpDir` variable and `afterEach` calls `fs.rmSync(tmpDir)`, tests that don't set `tmpDir` still see the stale value from a prior test. The `afterEach` then tries to remove an already-deleted directory and throws `ENOENT`.
- **Why it matters:** This is a subtle test isolation bug -- the test logic itself is correct, but the shared mutable state between test cases causes cleanup failures.
- **Fix/Pattern:** Use `fs.rmSync(tmpDir, { recursive: true, force: true })` and reset `tmpDir = undefined` after cleanup. The `force` flag suppresses `ENOENT` errors.

### 2026-03-15 — VPS Deployment & Discord Bot Operations

- **Command**: `tsc` is not in PATH on VPS — always use `npx tsc` instead of `npm run build` when TypeScript is a devDependency
- **Warning**: Discord bot tokens exposed in chat (or any public channel) get automatically revoked by Discord. Always reset and never paste tokens in conversations
- **Gotcha**: YAML is sensitive to spaces before colons — `knowledge_file : "x"` fails silently, must be `knowledge_file: "x"`
- **Gotcha**: `pm2` installed via `npm install -g` may not persist across SSH sessions on some VPS setups — reinstall if "command not found"
- **Command**: When VPS has local changes blocking `git pull`, use `git stash && git pull` to proceed
- **Config**: The bot looks for `clubclaw.yaml` at `../clubclaw.yaml` relative to `clubclaw/` source dir (i.e. at repo root), not inside the source folder
- **Gotcha**: AI module silently disables if `OPENAI_API_KEY` is not in `.env` — logs show `AI module: OPENAI_API_KEY not set, disabling` but easy to miss. No "AI module: initialized" = check the key
- **Gotcha**: Channel names in `clubclaw.yaml` must exactly match Discord channel names — bot uses `channel.name ===` comparison, no fuzzy matching
- **Decision**: Used OpenClaw's multi-channel gateway pattern and Nanobot's YAML config approach as architectural inspiration for ClubClaw
