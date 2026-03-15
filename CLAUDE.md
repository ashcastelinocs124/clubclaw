# clubclaw

**clubclaw** is a campus student organization management platform — combining the philosophy of openclaw (extensible, open tooling) with nanobot-style automation to help clubs handle communication infrastructure: Discord servers, Slack workspaces, and email lists.

---

## Project Overview

### What It Is
A unified backend/bot platform that student organizations install once and use to:
- Manage Discord server structure (channels, roles, onboarding)
- Manage Slack workspaces (channels, invites, notifications)
- Manage club email (send newsletters, handle replies, mailing lists)
- Potentially unify all of the above under one dashboard or CLI

### Who Uses It
- Club officers (setup, configuration, bulk actions)
- Club members (self-service: join channels, update preferences)
- Campus admins (optional: oversight across all orgs)

### Core Philosophy
- **Low friction** — clubs shouldn't need a dev to set it up
- **Multi-platform** — Discord, Slack, email are first-class citizens
- **Composable** — orgs pick which integrations they need
- **Student-friendly** — free tiers, easy auth, no infra knowledge required

---

## Architecture (TBD — being designed)

> See `docs/plans/` for the evolving design documents.

---

## Project Structure

```
clubclaw/                  ← repo root
  CLAUDE.md                ← this file
  learnings.md             ← captured learnings across sessions
  memory.md                ← current state and session context
  docs/
    plans/                 ← design docs (YYYY-MM-DD-<topic>-design.md)
  clubclaw/                ← all source code lives here
    .claude/
      skills/              ← project-specific skills
    ...source files...
```

---

## Learnings

This project maintains a `learnings.md` at the root. Append entries whenever you:
- Fix a non-obvious bug (include root cause)
- Discover a library/API gotcha or version-specific quirk
- Make an architectural decision worth remembering
- Find a useful command, config, or file path that wasn't obvious

Format:
```
### YYYY-MM-DD — [Brief topic]
- **What:** ...
- **Why it matters:** ...
- **Fix/Pattern:** ...
```

---

## Memory

`memory.md` at the root stores persistent cross-session state:
- What's built vs. what's in progress
- Key decisions and the reasoning behind them
- Established patterns and conventions
- Known gotchas and workarounds

Read `memory.md` at the start of every session before doing anything else. Update it whenever something significant changes.

---

## Completed Work

> Nothing completed yet — project is in design phase (2026-03-15).
