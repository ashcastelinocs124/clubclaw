---
name: code-implementation
description: Use when implementing features, writing new code, adding functionality, refactoring, or fixing bugs where root cause is known. Also use when the user says "implement", "build", "add feature", or requests a function/module/service. Includes planning, approval gate, test-driven development, and code review.
---

# Code Implementation Skill
**Usage:** /code-implementation "task description"

**Trigger this skill when:**
- User asks to implement/build/add code or a feature
- User requests a function/module/service to be written
- Complex coding tasks requiring design decisions
- Multi-file changes that benefit from upfront planning
- Bug fixes that require non-trivial coding (after root cause is known)

**Skip for:** Pure analysis, docs-only tasks, minor tweaks that don't need a plan

## Full-Stack by Default

**Every backend feature needs a frontend.** Unless the user explicitly says "backend only", assume the feature requires:
1. Backend implementation (API endpoints, services, models)
2. Frontend integration (API client, types, store, components, pages, routing)

If you implement a backend endpoint without surfacing it in the UI, the feature is **incomplete**.

## Execution Workflow

### Phase 0: Context Questions (BLOCKING — AskUserQuestion BEFORE anything else)

**Run this BEFORE exploring code, BEFORE planning, BEFORE writing a single line.**

Ask up to 3 questions in one `AskUserQuestion` call. Tailor them to what's actually unclear — don't ask what the user already told you.

**Always ask Q1. Ask Q2 and Q3 only if genuinely unclear:**

**Q1 — Confirm scope** (always ask):
```
question: "What should this do when it's done? Describe the end state."
header: "What to build"
options:
  - label: "[Restate user's request as option A — most likely interpretation]"
    description: "Build exactly this"
  - label: "[Narrower version — just the core, no extras]"
    description: "Minimal version only"
  - label: "[Broader version — if it likely needs more than stated]"
    description: "Include [X] as well"
```

**Q2 — Stack scope** (ask if not obvious):
```
question: "What scope does this touch?"
header: "Scope"
options:
  - label: "Full-stack (backend + frontend)"
    description: "Build the API and wire it into the UI"
  - label: "Backend only"
    description: "API / service / data layer — no UI changes"
  - label: "Frontend only"
    description: "UI changes only — backend already exists"
  - label: "Other"
    description: "I'll describe it"
```

**Q3 — Hard constraints** (ask if the task has real choices):
```
question: "Any constraints I should know before I start?"
header: "Constraints"
options:
  - label: "No constraints — use your best judgement"
    description: "Pick the simplest, most fitting approach"
  - label: "Must use [specific library/pattern]"
    description: "I'll specify in Other"
  - label: "Must NOT change [specific file/system]"
    description: "I'll specify in Other"
  - label: "Match existing pattern in codebase"
    description: "Find what's already there and follow it exactly"
```

**Rules:**
- Do NOT start exploring the codebase until all questions are answered
- Do NOT ask questions already answered in the user's original message
- If the task is a one-liner with zero ambiguity (e.g. "add a print statement"), skip this phase
- Batch all questions into a single `AskUserQuestion` call — no back-and-forth

---

### Phase 0.5: Architecture Context (if applicable)

**When invoked from /system-arch or when architecture context exists:**
- Review the approved architecture decision
- Extract specific implementation requirements:
  * Components to create/modify
  * Interface contracts and APIs
  * Data flow requirements
  * Success metrics from architecture plan
- Ensure test strategy aligns with architectural requirements
- Note any architectural constraints that affect implementation

### Phase 1: Understand & Bound
- Capture requirements and constraints (inputs/outputs, interfaces, performance, edge cases)
- Identify affected components/files — **both backend AND frontend**
- Fire `explore` agent to find related code patterns if needed
- Note non-functional needs (tests, types, logging, telemetry)
- **Frontend surface audit:** Which pages/components consume this data? What new UI is needed?

### Phase 1.5: Traceability Setup (for large tasks)

**A task is "large" if ANY of these apply:**
- Touches 3+ files
- Has 3+ distinct implementation steps
- Involves both backend AND frontend
- Spans multiple phases or components
- Will take more than one logical session

**If the task is large, create `traceability.md` in the project root BEFORE writing any code:**

```markdown
# Traceability — [Task Name]
**Started:** YYYY-MM-DD
**Goal:** [One-line description]
**Status:** 🔄 In Progress

## Steps
| # | Step | Status | Files Touched | Notes |
|---|------|--------|---------------|-------|
| 1 | [step description] | ⏳ Pending | — | |
| 2 | [step description] | ⏳ Pending | — | |

## Decisions
| Decision | Rationale |
|----------|-----------|

## Files Changed
| File | Change | Status |
|------|--------|--------|

## Test Results
| Test | Result | Notes |
|------|--------|-------|

## Deviations
_None yet._

## Completion
**Status:** In Progress
```

**Update rules — keep traceability.md live throughout the task:**
- Mark a step `🔄 In Progress` when you start it
- Mark it `✅ Done` when complete, or `❌ Blocked` if stuck — add a note
- Add every file you create or modify to **Files Changed** as you go
- Log every architectural decision to **Decisions** as it's made
- Add test results to **Test Results** after each test run
- Add anything that deviates from the original plan to **Deviations**
- On completion, set top-level **Status** to `✅ Complete` or `⚠️ Partial`

**Do NOT update traceability.md in bulk at the end — update it step by step as you work.**

### Phase 2: Plan (checklist-driven)
Produce a concise plan before coding:
- Scope & assumptions
- Key design decisions (with rationale and alternatives considered)
- Files to touch (including test files)
- Steps to implement (ordered)
- **Test cases required** (unit, integration, edge cases)
- Tests/verification commands
- Rollback notes

Use this template:
```markdown
## Implementation Plan
- Scope/assumptions: ...
- Key Design Decisions:
  | Decision | Rationale | Alternatives |
  |----------|-----------|--------------|
  | [Choice] | [Why] | [Other options] |

### Backend
- Files: [...]
- Test Files: [...] (MANDATORY: list all test files to create/modify)

### Frontend
- API layer: [types, endpoints, client changes]
- Store: [new/modified Zustand store]
- Components: [new/modified components]
- Pages: [new/modified pages]
- Routing: [App.tsx route changes, if any]
- **Design skill needed?** [Yes → invoke /frontend-design for non-trivial UI | No → standard components]

### Test Cases Required
  * Unit tests: [...]
  * Integration tests: [...]
  * Edge cases: [...]
- Steps:
  1) ...
  2) Write tests for [component] (BEFORE implementation)
  3) Implement backend [component]
  4) Add frontend types + API client
  5) Build store/hooks
  6) Build components/pages
  7) Wire routing
  8) ...
- Tests/verify: `...`
- Rollback: ...
```
Only start coding after the plan is written. Keep the plan updated if scope changes.

**CRITICAL: Test-Driven Approach**
- Write test cases BEFORE implementing each component when possible
- Every new function/module MUST have corresponding tests
- Aim for >80% code coverage on new code

### Phase 2.5: Plan Approval Gate (BLOCKING — AskUserQuestion)

**Always run this after writing the plan. No exceptions.**

Show the plan summary, then use `AskUserQuestion`:

```
question: "Here's the plan — does this look right before I start coding?"
header: "Approve plan"
options:
  - label: "Yes, proceed"
    description: "Start implementing as planned"
  - label: "Change the scope"
    description: "I'll tell you what to adjust — you update the plan before starting"
  - label: "Wrong approach — let's rethink"
    description: "I'll describe what I want instead"
```

- If "Change the scope" or "Wrong approach": incorporate feedback, show updated plan, re-ask
- If "Yes, proceed": begin Phase 3

**Do NOT write a single line of implementation code until the user approves the plan.**

### Phase 3: Implement (Subagent-Driven)

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, no context pollution.

**Setup:**
1. Extract all tasks from the approved plan with full text and context
2. Create TodoWrite with all tasks
3. Record the git SHA before starting (`BASE_SHA`)

**Per-task loop — execute tasks sequentially (never in parallel):**

#### Step 3a: Dispatch Implementer Subagent

Dispatch a **general-purpose** Agent per task. Paste the full task text into the prompt — do NOT make the subagent read plan files.

```
Agent tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N: [task name]

    ## Task Description
    [FULL TEXT of task from plan — paste it here]

    ## Context
    [Scene-setting: where this fits, dependencies, architectural context]
    [Relevant code patterns from the codebase]

    ## Before You Begin
    If you have questions about requirements, approach, dependencies,
    or anything unclear — ask them now before starting work.

    ## Your Job
    1. Implement exactly what the task specifies
    2. Write tests FIRST (TDD: red → green → refactor)
    3. Run lsp_diagnostics on changed files
    4. Verify all tests pass
    5. Commit your work
    6. Self-review: completeness, quality, YAGNI, test coverage
    7. Report back: what you implemented, tests + results, files changed, concerns

    Work from: [directory]
```

**If the subagent asks questions:** answer clearly, then let it proceed.

#### Step 3b: Dispatch Spec Compliance Reviewer

After the implementer finishes, dispatch a **general-purpose** Agent to verify spec compliance:

```
Agent tool (general-purpose):
  description: "Review spec compliance for Task N"
  prompt: |
    You are reviewing whether an implementation matches its specification.

    ## What Was Requested
    [FULL TEXT of task requirements]

    ## What Implementer Claims They Built
    [From implementer's report]

    ## CRITICAL: Do Not Trust the Report
    DO NOT take their word for it. Read the actual code and verify:
    - Missing requirements (did they skip anything?)
    - Extra/unneeded work (did they overbuild?)
    - Misunderstandings (did they solve the wrong problem?)

    Report:
    - ✅ Spec compliant (if everything matches after code inspection)
    - ❌ Issues found: [list what's missing or extra, with file:line references]
```

**If spec reviewer finds issues:** resume the implementer subagent to fix them, then re-run spec review. Repeat until ✅.

#### Step 3c: Dispatch Code Quality Reviewer

Only after spec compliance passes. Dispatch a **superpowers:code-reviewer** Agent:

```
Agent tool (superpowers:code-reviewer):
  description: "Code quality review for Task N"
  prompt: |
    WHAT_WAS_IMPLEMENTED: [from implementer's report]
    PLAN_OR_REQUIREMENTS: Task N from [plan]
    BASE_SHA: [commit before task]
    HEAD_SHA: [current commit]
    DESCRIPTION: [task summary]
```

**If code reviewer finds issues:** resume the implementer subagent to fix, then re-run quality review. Repeat until approved.

#### Step 3d: Mark Task Complete

Update TodoWrite, then move to the next task.

---

**Frontend Integration Steps** (when a task involves frontend work):

1. **Types** — Add/update TypeScript interfaces in `api/types.ts` matching backend Pydantic schemas
2. **API client** — Add endpoint functions in `api/endpoints.ts` calling the new backend routes
3. **Store** — Create or extend a Zustand store in `stores/` for state management
4. **Hooks** — Add custom hooks in `hooks/` if needed (WebSocket, polling, derived state)
5. **Components** — Build reusable UI components in `components/`
6. **Pages** — Create or update pages in `pages/` that compose the components
7. **Routing** — Add routes in `App.tsx` if new pages were created
8. **Design quality** — For non-trivial UI, invoke `/frontend-design` skill for aesthetic direction

**Contract alignment:** Frontend types MUST mirror backend response schemas exactly. Read the backend Pydantic models or API response shapes before writing TypeScript interfaces.

### Phase 4: Final Review (after all tasks complete)

Dispatch a **superpowers:code-reviewer** Agent covering the entire implementation:

```
Agent tool (superpowers:code-reviewer):
  description: "Final review of full implementation"
  prompt: |
    WHAT_WAS_IMPLEMENTED: [summary of all tasks]
    PLAN_OR_REQUIREMENTS: [full plan]
    BASE_SHA: [SHA before first task]
    HEAD_SHA: [current HEAD]
    DESCRIPTION: Full implementation review — check cross-task integration,
    consistency, and overall quality.
```

Also verify:
- **Frontend:** TypeScript compiles cleanly, routes reachable, API shapes match
- **Backend:** All tests green, lsp_diagnostics clean
- If any issues found, dispatch a fix subagent — do NOT fix manually (context pollution)

### Phase 5: Summarize
- Summarize changes, tests run, and status vs plan
- Call out any deviations or TODOs
- **If traceability.md exists:** finalize it — mark all completed steps `✅ Done`, set top-level Status to `✅ Complete` (or `⚠️ Partial` if anything was skipped), fill in the Completion timestamp

### Phase 6: Explain (only if user asks)
- If the user requests an explanation of the new code, use the **Explain** skill (/explain) or the **tutor** agent to provide a concise walkthrough (what it does, how it works, key flows)

## Quality Guidelines

**ALWAYS:**
- Plan before you code; keep it short but specific
- Update the plan if the scope shifts
- Keep diffs tight; avoid drive-by refactors
- Add/maintain tests; keep `lsp_diagnostics` clean
- Use existing patterns and conventions (SOLID, DRY, KISS, YAGNI)
- Dispatch fresh subagent per task (no context pollution)
- Run spec compliance review THEN code quality review per task
- Run a final cross-task code review after all tasks complete

**NEVER:**
- Start coding without a plan
- Skip writing tests for new code
- Write implementation before tests (when TDD is feasible)
- Mark tests as TODO or skip tests
- Ignore failing tests or diagnostics
- Ship code with <80% test coverage
- Write tests after the fact without running them
- Introduce type suppressions (`# type: ignore`, `as any`, `@ts-ignore`)
- Mix unrelated refactors with the requested change
- Dispatch multiple implementation subagents in parallel (conflicts)
- Skip spec review or code quality review for any task
- Start code quality review before spec compliance passes
- Move to next task while either review has open issues
- Fix issues manually instead of resuming the implementer subagent

## Escalation Triggers

**Ask User if:**
- Requirements are ambiguous
- Multiple valid approaches exist with trade-offs
- Scope creep detected
- Business logic unclear (intended behavior?)

## Verification Checklist (tick before closing)

**Backend:**
- [ ] Plan created with test cases identified
- [ ] Plan followed/updated throughout implementation
- [ ] Test files created/modified for ALL new code
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Edge case tests written and passing
- [ ] Error handling tests written and passing
- [ ] Test coverage >80% on new code (if measurable)
- [ ] All tests/commands executed and passing
- [ ] lsp_diagnostics clean on changed files

**Frontend:**
- [ ] TypeScript types match backend Pydantic schemas
- [ ] API endpoint functions added for new backend routes
- [ ] Store created/updated with proper state management
- [ ] Components/pages built and wired to store
- [ ] Routes added in App.tsx (if new pages)
- [ ] Frontend builds cleanly (no TS errors)
- [ ] `/frontend-design` invoked for non-trivial UI work

**Per-Task Review:**
- [ ] Implementer subagent completed and self-reviewed
- [ ] Spec compliance reviewer passed (✅ — nothing missing or extra)
- [ ] Code quality reviewer approved
- [ ] Task marked complete in TodoWrite

**Final:**
- [ ] Final cross-task code review run and approved
- [ ] Summary delivered to user with test results
- [ ] `traceability.md` finalized (if task was large) — all steps marked, status set to ✅ Complete
