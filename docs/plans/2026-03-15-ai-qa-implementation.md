# AI Q&A Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-powered Q&A to ClubClaw so members can DM or @mention the bot to ask club-related questions, answered by GPT-4o-mini using a knowledge.md file as context.

**Architecture:** New `modules/ai/` module with three files: knowledge loader (reads knowledge.md from disk), chat function (calls OpenAI API), and init (registers Discord event listeners for DMs and mentions). Config schema updated to support new ai fields.

**Tech Stack:** OpenAI SDK (`openai` npm package), discord.js events, existing config/db infrastructure

**Design Doc:** `docs/plans/2026-03-15-ai-qa-design.md`

---

### Task 1: Install OpenAI SDK & Update Config Schema

**Files:**
- Modify: `clubclaw/package.json` (add `openai` dependency)
- Modify: `clubclaw/src/config/schema.ts` (add `model` and `knowledge_file` to AiSchema)
- Modify: `clubclaw/.env.example` (add OPENAI_API_KEY)

**Step 1: Install the OpenAI SDK**

```bash
cd /Users/ash/Desktop/clubclaw/clubclaw
npm install openai
```

**Step 2: Update the AiSchema in config/schema.ts**

Change the existing `AiSchema` to:
```typescript
export const AiSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['anthropic', 'openai']).default('openai'),
  model: z.string().default('gpt-4o-mini'),
  knowledge_file: z.string().default('knowledge.md'),
  features: z.array(z.string()).default([]),
});
```

**Step 3: Update .env.example**

Add to `clubclaw/.env.example`:
```
OPENAI_API_KEY=your-openai-api-key-here
```

**Step 4: Verify build**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx tsc`
Expected: no errors

**Step 5: Run existing tests**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx vitest run`
Expected: all 16 tests PASS (schema change is backward-compatible)

**Step 6: Commit**

```bash
git add clubclaw/package.json clubclaw/package-lock.json clubclaw/src/config/schema.ts clubclaw/.env.example
git commit -m "feat: add openai SDK and update config schema for AI Q&A"
```

---

### Task 2: Knowledge Loader

**Files:**
- Create: `clubclaw/src/modules/ai/knowledge.ts`
- Test: `clubclaw/src/modules/ai/__tests__/knowledge.test.ts`

**Step 1: Write the failing test**

Create `clubclaw/src/modules/ai/__tests__/knowledge.test.ts`:
```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { loadKnowledge } from '../knowledge.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('loadKnowledge', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true });
  });

  it('reads content from a knowledge file', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-kb-'));
    const filePath = path.join(tmpDir, 'knowledge.md');
    fs.writeFileSync(filePath, '# Club Info\nMeetings on Thursdays at 7pm.');

    const content = loadKnowledge(filePath);
    expect(content).toBe('# Club Info\nMeetings on Thursdays at 7pm.');
  });

  it('returns null when file does not exist', () => {
    const content = loadKnowledge('/nonexistent/knowledge.md');
    expect(content).toBeNull();
  });

  it('returns null when file is empty', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubclaw-kb-'));
    const filePath = path.join(tmpDir, 'knowledge.md');
    fs.writeFileSync(filePath, '');

    const content = loadKnowledge(filePath);
    expect(content).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx vitest run src/modules/ai/__tests__/knowledge.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the knowledge loader**

Create `clubclaw/src/modules/ai/knowledge.ts`:
```typescript
import fs from 'node:fs';

export function loadKnowledge(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (content.length === 0) return null;

  return content;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx vitest run src/modules/ai/__tests__/knowledge.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add clubclaw/src/modules/ai/
git commit -m "feat: add knowledge.md loader for AI Q&A"
```

---

### Task 3: Chat Function (OpenAI Integration)

**Files:**
- Create: `clubclaw/src/modules/ai/chat.ts`
- Test: `clubclaw/src/modules/ai/__tests__/chat.test.ts`

**Step 1: Write the failing test for system prompt building**

Add to `clubclaw/src/modules/ai/__tests__/chat.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../chat.js';

describe('buildSystemPrompt', () => {
  it('includes org name and knowledge content', () => {
    const prompt = buildSystemPrompt('CS Club', 'A computer science club', '# FAQ\nMeetings on Thursdays.');
    expect(prompt).toContain('CS Club');
    expect(prompt).toContain('A computer science club');
    expect(prompt).toContain('Meetings on Thursdays');
  });

  it('includes instruction to only answer club questions', () => {
    const prompt = buildSystemPrompt('CS Club', undefined, '# Info');
    expect(prompt).toContain('ONLY answer questions about the club');
  });

  it('handles missing description', () => {
    const prompt = buildSystemPrompt('CS Club', undefined, '# Info');
    expect(prompt).toContain('CS Club');
    expect(prompt).not.toContain('undefined');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx vitest run src/modules/ai/__tests__/chat.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the chat function**

Create `clubclaw/src/modules/ai/chat.ts`:
```typescript
import OpenAI from 'openai';

let client: OpenAI | null = null;

export function initOpenAI(apiKey: string): void {
  client = new OpenAI({ apiKey });
}

export function buildSystemPrompt(
  orgName: string,
  orgDescription: string | undefined,
  knowledge: string
): string {
  const desc = orgDescription ? ` ${orgDescription}` : '';
  return `You are the AI assistant for ${orgName}.${desc}

You can ONLY answer questions about the club using the knowledge provided below.
If someone asks something unrelated to the club, politely say:
"I can only help with questions about ${orgName}."

Keep answers concise and friendly.

## Club Knowledge

${knowledge}`;
}

export async function askQuestion(
  question: string,
  systemPrompt: string,
  model: string
): Promise<string> {
  if (!client) {
    throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY.');
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx vitest run src/modules/ai/__tests__/chat.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add clubclaw/src/modules/ai/chat.ts clubclaw/src/modules/ai/__tests__/chat.test.ts
git commit -m "feat: add OpenAI chat function with system prompt builder"
```

---

### Task 4: AI Module Init (Discord Event Listeners)

**Files:**
- Create: `clubclaw/src/modules/ai/index.ts`
- Modify: `clubclaw/src/index.ts` (wire initAi into startup)

**Step 1: Implement the AI module init**

Create `clubclaw/src/modules/ai/index.ts`:
```typescript
import { type Client, type Message, ChannelType } from 'discord.js';
import path from 'node:path';
import type { ClubClawConfig } from '../../config/index.js';
import type { Database } from '../../db/index.js';
import { loadKnowledge } from './knowledge.js';
import { initOpenAI, buildSystemPrompt, askQuestion } from './chat.js';

export function initAi(
  client: Client,
  config: ClubClawConfig,
  db: Database
): void {
  const aiConfig = config.ai;
  if (!aiConfig?.enabled) {
    console.log('AI module: disabled (ai.enabled is false)');
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('AI module: OPENAI_API_KEY not set, disabling');
    return;
  }

  initOpenAI(apiKey);

  const knowledgePath = path.resolve(process.cwd(), '..', aiConfig.knowledge_file);

  client.on('messageCreate', async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const isMentioned = message.mentions.has(client.user!);
    const isDM = message.channel.type === ChannelType.DM;

    if (!isMentioned && !isDM) return;

    // Strip the bot mention from the message
    let question = message.content;
    if (isMentioned && client.user) {
      question = question.replace(`<@${client.user.id}>`, '').trim();
    }

    if (!question) return;

    try {
      // Show typing indicator
      await message.channel.sendTyping();

      // Load knowledge fresh each time
      const knowledge = loadKnowledge(knowledgePath);

      if (!knowledge) {
        await message.reply(
          'No knowledge base has been set up yet. Ask a club officer to create knowledge.md.'
        );
        return;
      }

      const systemPrompt = buildSystemPrompt(
        config.org.name,
        config.org.description,
        knowledge
      );

      const answer = await askQuestion(question, systemPrompt, aiConfig.model);

      await message.reply(answer);

      db.logAudit('ai_question', message.author.id, question.slice(0, 100));
    } catch (err) {
      console.error('AI module error:', err);
      await message.reply('Sorry, I encountered an error. Please try again later.');
    }
  });

  console.log('AI module: initialized');
}
```

**Step 2: Wire initAi into the entry point**

In `clubclaw/src/index.ts`, add the import:
```typescript
import { initAi } from './modules/ai/index.js';
```

And add the init call after the other module inits (after `initAnnouncements`):
```typescript
initAi(client, config, db);
```

**Step 3: Verify build**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx tsc`
Expected: no errors

**Step 4: Run all tests**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx vitest run`
Expected: all tests PASS (existing 16 + new 6 = 22 tests)

**Step 5: Commit**

```bash
git add clubclaw/src/modules/ai/index.ts clubclaw/src/index.ts
git commit -m "feat: add AI Q&A module with DM and @mention support"
```

---

### Task 5: Example Knowledge File & Config Update

**Files:**
- Create: `knowledge.md` (repo root)
- Modify: `clubclaw.example.yaml` (update ai section)

**Step 1: Create example knowledge.md**

Create `knowledge.md` at `/Users/ash/Desktop/clubclaw/knowledge.md`:
```markdown
# CS Club

## Meeting Times
- General meetings: Thursdays 7pm, Room 301
- Board meetings: Mondays 5pm, Room 205

## Officers
- President: Jane Smith
- VP: John Doe
- Treasurer: Alex Lee

## How to Join
React in #welcome to get verified. Pick your team roles.

## Events
- Hackathon: April 12-13
- Career Fair: April 25
- End of year banquet: May 10

## FAQ
Q: How do I join a team?
A: React with the team emoji in #welcome.

Q: When are dues?
A: $10 per semester, pay via Venmo to @csclubtreas.

Q: Can I attend without being a member?
A: Yes! General meetings are open to everyone. Some events require membership.
```

**Step 2: Update clubclaw.example.yaml ai section**

Replace the `ai:` section in `clubclaw.example.yaml` with:
```yaml
ai:
  enabled: true
  provider: "openai"
  model: "gpt-4o-mini"
  knowledge_file: "knowledge.md"
  features: []
```

**Step 3: Commit**

```bash
git add knowledge.md clubclaw.example.yaml
git commit -m "feat: add example knowledge.md and update ai config in example yaml"
```

---

### Task 6: Final Build & Test

**Step 1: Run full test suite**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx vitest run`
Expected: all tests PASS

**Step 2: Run build**

Run: `cd /Users/ash/Desktop/clubclaw/clubclaw && npx tsc`
Expected: no errors

**Step 3: Push to GitHub**

```bash
git push origin main
```

---

## Summary

| Task | What It Builds | Tests |
|------|---------------|-------|
| 1 | OpenAI SDK install + config schema update | build check + existing tests |
| 2 | Knowledge file loader | 3 unit tests |
| 3 | OpenAI chat function + system prompt builder | 3 unit tests |
| 4 | AI module init (DM + @mention listeners) | build check |
| 5 | Example knowledge.md + config update | — |
| 6 | Final build + test + push | full suite |

**Total: 6 tasks, ~6 new tests, TDD throughout**
