---
name: doc-search
description: Auto-detect when code uses third-party APIs/SDKs (anthropic, openai, stripe, firebase, supabase, AWS, etc.) and search their official documentation BEFORE writing implementation code. Triggers automatically when you detect imports like `anthropic`, `openai`, `stripe`, `boto3`, `@supabase/supabase-js`, `google.generativeai`, `twilio`, `firebase`, `resend`, `replicate`, `pinecone`, `langchain`, `prisma`, `clerk`, or any third-party API/SDK. Also triggers on explicit requests like "check the docs", "look up the API", "search the documentation", "how does X API work". Ensures code uses current, correct API patterns instead of stale training data.
---

# Doc Search

Search official API/SDK documentation before implementing code that uses third-party services. Prevents outdated patterns from training data.

## Workflow

### 1. Detect API Usage

Scan the task for API/SDK usage. Look for:
- Import statements (`import anthropic`, `from openai import`, `require('stripe')`)
- Package references in the user's request ("use the Claude API", "call Stripe")
- Existing imports in files being modified

### 2. Look Up Provider Docs

Read `references/providers.md` to find the provider's doc URL and search pattern. For each detected API:

1. **WebSearch** using the site-scoped pattern: `site:{docs_url} {specific_method_or_feature}`
2. **WebFetch** the most relevant result page to get current API patterns
3. Extract: method signatures, required params, auth patterns, key examples

**Search queries should be specific.** Not "how to use openai" but "site:platform.openai.com/docs chat completions API create".

### 3. Present Findings

Show a brief summary before implementing:

```
Docs: {provider} — {feature}
- Endpoint/Method: {name}
- Key params: {list}
- Auth: {pattern}
- Example: {short code snippet from docs}
```

Keep it to 5-8 lines. The user needs confidence you have the right pattern, not a docs dump.

### 4. Implement Using Doc Patterns

Write code using the patterns found in official docs, not from memory. If docs show a different pattern than what you'd normally generate, **always prefer the docs**.

## Example

**User says:** "Add a function that calls Claude to summarize text"

**Skill behavior:**
1. Detect: `anthropic` SDK usage
2. WebSearch: `site:docs.anthropic.com messages API create python`
3. WebFetch the top result to get current method signature
4. Present:
   ```
   Docs: Anthropic — Messages API
   - Method: client.messages.create()
   - Key params: model, max_tokens, messages[]
   - Auth: ANTHROPIC_API_KEY env var
   - Current model: claude-sonnet-4-20250514
   ```
5. Implement the function using the exact patterns from docs

**User says:** "Set up Stripe checkout for a subscription"

**Skill behavior:**
1. Detect: `stripe` SDK usage
2. WebSearch: `site:docs.stripe.com checkout session subscription create`
3. WebFetch to get current Checkout Session API
4. Present findings, then implement using doc patterns

## Rules

- **Always search before implementing** — even if you're confident about the API. APIs change.
- **Use site-scoped searches** — `site:docs.x.com` avoids blog posts and outdated tutorials.
- **One search per provider** — don't over-fetch. Get the specific method/endpoint needed.
- **Unknown providers** — WebSearch `{package} API documentation official` to find the docs site first.
- **Skip for trivial usage** — if the user is just importing a well-known utility (lodash, moment), don't search docs unless the task involves a specific non-obvious method.
