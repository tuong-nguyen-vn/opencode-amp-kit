---
name: hd-planning
description: Generate comprehensive plans for new features by exploring the codebase, synthesizing approaches, validating with spikes, and decomposing into tasks. Use when asked to plan a feature, create a roadmap, or design an implementation approach.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Feature Planning Pipeline

> **[IMPORTANT]** This skill is for PLANNING ONLY. Do NOT implement any code during this phase. All implementation will be handled by worker agents in the execution phase after the plan is approved.
>
> **User Confirmation Gates:**
> - **Gate 1 (after Phase 3)** — User approves approach direction before decomposition. If rejected, revise approach or scope.
> - **Gate 2 (Phase 4)** — User confirms spike execution. Only shown when HIGH risk items exist. If skipped, mark risks as accepted.
> - **Gate 3 (after Phase 6)** — User approves final task graph before handoff to orchestrator. Plan does NOT auto-handoff without explicit approval.

Generate quality plans through systematic discovery, synthesis, verification, and decomposition.

## Pipeline Overview

```
USER REQUEST → Discovery → Clarification → Synthesis → [Gate 1: Approve Direction] → Verification → Decomposition → Validation → [Gate 3: Approve Plan] → Ready
```

| Phase              | Tool                                                                     | Output                              |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------- |
| 1. Discovery       | `finder` (Amp/hdcode) / `Explore` subagent (Claude), `librarian`, `exa`         | Discovery Report                    |
| 2. Clarification   | Interactive Q&A with user                                                | Validated Requirements              |
| 3. Synthesis       | `oracle` (Amp/hdcode) / `Plan` subagent (Claude)                           | Approach + Risk Map                 |
| 4. Verification    | `team_create` → `task_create` → `Task()` workers → `team_delete`        | Validated Approach + Learnings      |
| 5. Decomposition   | `team_create` → `task_create` with dependencies                         | Feature team with task graph        |
| 6. Validation      | `task_list` + agent reasoning                                            | Validated dependency graph          |

## Phase 1: Discovery (Parallel Exploration)

Launch parallel sub-agents to gather codebase intelligence:

```
Task() → Agent A: Architecture snapshot
Task() → Agent B: Pattern search (find similar existing code)
Task() → Agent C: Constraints (package.json, tsconfig, deps)

# Amp / hdcode
finder → "Find all authentication middleware implementations"
finder → "Where is the database connection configured?"
finder → "Find how API routes are organized"

# Claude
Explore subagent → "Find all authentication middleware implementations"
Explore subagent → "Where is the database connection configured?"
Explore subagent → "Find how API routes are organized"

# All runtimes
librarian → External patterns ("how do similar projects do this?")
exa → Library docs (if external integration needed)
```

### Discovery Report Template

Get current date prefix first:
```bash
date +%Y%m%d
# Output: 20260113
```

Save to `history/YYYYMMDD-<feature>/discovery.md`:

```markdown
# Discovery Report: <Feature Name>

## Architecture Snapshot

- Relevant packages: ...
- Key modules: ...
- Entry points: ...

## Existing Patterns

- Similar implementation: <file> does X using Y pattern
- Reusable utilities: ...
- Naming conventions: ...

## Technical Constraints

- Node version: ...
- Key dependencies: ...
- Build requirements: ...

## External References

- Library docs: ...
- Similar projects: ...

## UI Work Detected

- UI patterns identified: [list view / form / dashboard / modal / other / none]
  (Look for: page components, form files, table/list components, task descriptions mentioning "page", "form", "view", "layout", "UI", "component", "screen", "modal", "dialog", "dashboard")
- Existing `docs/ui-standards/` directory: [yes — files: <list> / no]
- `## Worker Config` in project AGENTS.md: [yes / no]
```

## Phase 2: Clarification (Interactive)

**Input**: Discovery Report from Phase 1

**Purpose**: Clarify requirements and assumptions before synthesis.

### When to Clarify

Only ask when:
- **Ambiguous requirements** - Requirements open to multiple interpretations
- **Missing critical info** - Missing information that affects architecture decisions
- **Conflicting constraints** - Constraints that contradict each other
- **Scope uncertainty** - Unclear feature boundaries
- **UI work detected** - Feature involves UI patterns; AI cannot infer the correct design standard — must ask user

### When to Skip

- User requests skip ("skip clarification", "decide yourself", "proceed")
- All requirements are clear from Discovery Report
- Simple, low-risk feature

### Process

> **Tool hint**: If `question` or `AskUserQuestion` tool is available, use it for structured input collection instead of free-text prompts.

```
1. Synthesize points needing clarification from Discovery Report
2. Present question list (max 3-5 most important questions) — use question tool if available
3. Wait for user response or skip confirmation
4. Record answers in Discovery Report ("Clarifications" section)
5. Only proceed to Phase 3 after user confirmation
```

### Clarification Question Template

```markdown
## Clarification Needed

Based on the Discovery Report, I need to clarify the following:

1. **[Topic A]**: [Specific question]?
   - Option 1: ...
   - Option 2: ...

2. **[Topic B]**: [Specific question]?

**[Only if UI work detected in Phase 1 `## UI Work Detected`]**

N. **UI Standards**: I detected this feature includes [list the UI patterns found].
   Which UI standard applies?
   - **A**: Existing file — specify: `docs/ui-standards/<pattern>.md`
   - **B**: Describe the standard inline (I'll embed it in each UI task's Technical Notes)
   - **C**: No standard — worker uses best judgement and follows existing component patterns
   - **D**: Multiple patterns with different standards — answer per pattern (e.g., list view: A → file X, form: B → describe inline)

---
You can:
- Answer each question
- Say "skip" for me to decide based on best practices
- Say "continue" if no concerns
```

### Update Discovery Report

After receiving answers, add section to `history/<feature>/discovery.md`:

```markdown
## Clarifications

| Question | Answer | Impact |
| -------- | ------ | ------ |
| ...      | ...    | ...    |
| UI standard (list view) | `docs/ui-standards/list-view.md` | Embedded in UI task Technical Notes |
| UI standard (form layout) | [inline description] | Embedded in UI task Technical Notes |

**User Confirmation**: [timestamp]
```

## Phase 3: Synthesis (Plan)

Feed Discovery Report to `oracle` (Amp/hdcode) / `Plan` subagent (Claude) for gap analysis:

```
# Amp / hdcode
oracle(
  task: "Analyze gap between current codebase and feature requirements",
  context: "Discovery report attached. User wants: <feature>",
  files: ["history/<feature>/discovery.md"]
)

# Claude
Plan(
  task: "Analyze gap between current codebase and feature requirements",
  context: "Discovery report attached. User wants: <feature>",
  files: ["history/<feature>/discovery.md"]
)
```

The analysis produces:

1. **Gap Analysis** - What exists vs what's needed
2. **Approach Options** - 1-3 strategies with tradeoffs
3. **Risk Assessment** - LOW / MEDIUM / HIGH per component

### Risk Classification

| Level  | Criteria                      | Verification                 |
| ------ | ----------------------------- | ---------------------------- |
| LOW    | Pattern exists in codebase    | Proceed                      |
| MEDIUM | Variation of existing pattern | Interface sketch, type-check |
| HIGH   | Novel or external integration | Spike required               |

### Risk Indicators

```
Pattern exists in codebase? ─── YES → LOW base
                            └── NO  → MEDIUM+ base

External dependency? ─── YES → HIGH
                     └── NO  → Check blast radius

Blast radius >5 files? ─── YES → HIGH
                       └── NO  → MEDIUM
```

Save to `history/<feature>/approach.md`:

```markdown
# Approach: <Feature Name>

## Gap Analysis

| Component | Have | Need | Gap |
| --------- | ---- | ---- | --- |
| ...       | ...  | ...  | ... |

## Recommended Approach

<Description>

### Alternative Approaches

1. <Option A> - Tradeoff: ...
2. <Option B> - Tradeoff: ...

## Risk Map

| Component   | Risk | Reason           | Verification |
| ----------- | ---- | ---------------- | ------------ |
| Stripe SDK  | HIGH | New external dep | Spike        |
| User entity | LOW  | Follows existing | Proceed      |
```

### Gate 1: Approve Planning Direction

> **Tool hint**: Use `question` / `AskUserQuestion` tool if available to present options as structured choices.

Present the approach summary for user approval before proceeding:

```markdown
## Planning Checkpoint — Approve Direction

**Goal**: <feature summary>
**In scope**: <what's included>
**Out of scope**: <what's excluded>
**Recommended approach**: <brief description>
**Key assumptions**: <list>
**High risks**: <list with verification method>

Reply with one:
1. **approve** — proceed with this direction
2. **revise** — <what to change> (loops back to Phase 2 or 3)
3. **stop** — end planning here
```

- **approve** → Continue to Phase 4 (or Phase 5 if no HIGH risks)
- **revise** → If scope/requirements wrong → back to Phase 2. If approach wrong → back to Phase 3.
- **stop** → End planning. approach.md is the deliverable.

## Phase 4: Verification (Risk-Based)

### Gate 2: Confirm Spike Execution

> **Tool hint**: Use `question` / `AskUserQuestion` tool if available to present spike confirmation as structured choices.

Before creating any spike team, present the HIGH risk items to the user:

```markdown
## Spikes Needed

The following HIGH risk items need verification before planning continues:

1. **<Component A>** — <reason> (time-box: 30 min)
2. **<Component B>** — <reason> (time-box: 30 min)

Shall I create a spike team to validate these? (yes / skip)
```

- **User says yes** → Proceed with spike team below
- **User says skip** → Skip to Phase 5 (mark HIGH risk items as unvalidated in approach.md)

### Create Spike Team

Create a dedicated team for spike execution:

```
team_create(teamName="spike-<feature>", description="Spike validation for <feature>")
```

### Create Spike Tasks

Create one task per spike question. Use `addBlockedBy` for dependencies between spikes:

```
task_create(
  teamName="spike-<feature>",
  subject="Spike: <specific question to answer>",
  description="## Question\nCan we <specific technical question>?\n\n## Time-box\n30 minutes\n\n## Output\n`.spikes/YYYYMMDD-<feature>/<spike-name>/`\n\n## Success Criteria\n- [ ] Working throwaway code exists\n- [ ] Answer documented (yes/no + details)\n- [ ] Learnings captured for main plan"
)
```

### Execute Spikes

1. Review `task_list(teamName="spike-<feature>")` to identify independent tasks (no `blockedBy`)
2. `Task()` per independent spike with time-box
3. Workers write to `.spikes/YYYYMMDD-<feature>/<spike-name>/`
4. On completion: `task_update(teamName, taskId, status="completed", description="YES: <approach>" or "NO: <blocker>")`

### Clean Up Spike Team

After all spike tasks are completed:

```
team_delete(teamName="spike-<feature>")
```

### Aggregate Spike Results

```
# Amp / hdcode
oracle(
  task: "Synthesize spike results and update approach",
  context: "Spikes completed. Results: ...",
  files: ["history/<feature>/approach.md"]
)

# Claude
Plan(
  task: "Synthesize spike results and update approach",
  context: "Spikes completed. Results: ...",
  files: ["history/<feature>/approach.md"]
)
```

Update approach.md with validated learnings.

### If Spike Fails (NO: blocker)

If any spike returns "NO: \<blocker\>":

1. Update approach.md with the blocker details
2. Present the blocker to the user via `question` tool if available:
   - **Change approach** — revise the approach to avoid the blocker (back to Phase 3)
   - **Use alternative** — if the spike suggested an alternative, adopt it and continue
   - **Accept risk** — proceed anyway, document as accepted risk
   - **Stop** — end planning here

## Phase 5: Decomposition (Task Creation)

### Extract UI Standards

Before creating tasks, extract UI standard answers from `history/<feature>/discovery.md` Clarifications section.

Build a UI standards map:
```
UI_STANDARDS = {
  "<pattern>": "<file path or inline standard text>",
  // e.g. "list-view": "docs/ui-standards/list-view.md"
  // e.g. "form": "[inline: always use 2-column layout, labels above fields, ...]"
}
```

For any UI task, embed the relevant UI standard in the task's description under Technical Notes.

If no UI work was detected or user answered C (no standard), note "no standard defined" in UI task descriptions.

### Security Pre-Check

Scan `approach.md` and task descriptions for security signals:

| Signal Category | Keywords |
|-----------------|----------|
| PII | user, profile, email, phone, SSN, passport, health, address, DOB, identity |
| API surface | endpoint, API, REST, GraphQL, webhook, public, external |
| Auth | auth, login, session, token, JWT, OAuth, permission, role, access control |
| Payment/sensitive data | payment, card, bank, transaction, billing, encrypt, vault, secret |
| Multi-tenancy | tenant, organization, workspace, account isolation |

If ANY signal triggered, auto-include applicable security tasks in decomposition:

- `"Security: Input validation & injection hardening"` — if API surface signals
- `"Security: Auth/authz review for [feature name]"` — if auth signals
- `"Security: PII handling, data minimization & retention"` — if PII signals
- `"Security: API field exposure audit & rate limiting"` — if API surface signals
- `"Security: Payment data flow & compliance check"` — if payment signals

> When in doubt about data sensitivity, include security tasks. Cost of an extra task is lower than a missed vulnerability.

### Create Feature Team

```
team_create(teamName="<feature>", description="Feature implementation: <feature name>")
```

### Create Tasks with Dependencies

For each work item, create a task. Use `addBlockedBy` and `addBlocks` for dependency relationships:

```
# Independent tasks (no dependencies)
task_create(
  teamName="<feature>",
  subject="Create Subscription entity and SubscriptionRepository port",
  description="## Context\n<where this fits>\n\n## Requirements\n<what to implement>\n\n## Technical Notes\n- Follow existing entity pattern at `packages/domain/src/entities/user.ts`\n- ...\n\n## Acceptance Criteria\n- [ ] Entity created\n- [ ] Port defined\n- [ ] Passes type-check",
  metadata='{"priority": 2, "fileScope": "packages/domain/**"}'
)
# → returns taskId "1"

# Dependent tasks
task_create(
  teamName="<feature>",
  subject="Implement SubscriptionRepository with Drizzle",
  description="## Context\n...\n\n## Learnings from Spike\n> <embed spike learnings if applicable>\n> Reference: `.spikes/<feature>/<spike-name>/`\n\n## Acceptance Criteria\n- [ ] ...",
  addBlockedBy="1",
  metadata='{"priority": 2, "fileScope": "packages/infrastructure/**"}'
)
# → returns taskId "2"
```

### Task Requirements

Each task MUST include in its description:

- **Spike learnings** embedded (if applicable)
- **Reference to .spikes/ code** for HIGH risk items
- **Clear acceptance criteria**
- **File scope** in metadata for file reservation during execution

### Example Task with Learnings

```markdown
## Context

Handles Stripe webhook events for subscription lifecycle.

## Learnings from Spike

> Spike "Stripe webhook signature" validated:
> - MUST use raw body (not parsed JSON) for signature verification
> - Use `stripe.webhooks.constructEvent(rawBody, sig, secret)`
> - Webhook secret from `STRIPE_WEBHOOK_SECRET` env var
>
> Reference: `.spikes/20250113-billing/webhook-test/handler.ts`

## Requirements

- Webhook endpoint at `/api/webhooks/stripe`
- Signature verification before processing
- Idempotent event handling

## Acceptance Criteria

- [ ] Raw body middleware configured
- [ ] Signature verification implemented
- [ ] Events update subscription status correctly
- [ ] Passes type-check
```

## Phase 6: Validation

### Analyze Task Graph

Read all tasks and analyze the dependency graph:

```
task_list(teamName="<feature>")
```

Check for:

1. **Missing dependencies** — Are there tasks that should depend on others but don't?
2. **Circular dependencies** — Walk the `blockedBy` chains; no task should eventually block itself
3. **Priority consistency** — Higher-priority tasks should not depend on lower-priority ones
4. **Orphan tasks** — Every task should either block or be blocked by at least one other task (except the root)
5. **Completeness** — Are all components from the approach.md covered?

### Fix Issues

```
# Add missing dependency
task_update(teamName="<feature>", taskId="3", addBlockedBy="1")

# Adjust priority
task_update(teamName="<feature>", taskId="5", metadata='{"priority": 1}')

# Remove and recreate task if fundamentally wrong
task_delete(teamName="<feature>", taskId="4")
task_create(teamName="<feature>", subject="...", description="...", addBlockedBy="2")
```

### Plan Final Review

```
# Amp / hdcode
oracle(
  task: "Review plan completeness and clarity",
  context: "Plan ready. Check for gaps, unclear tasks, missing deps.",
  data: "<output of task_list>"
)

# Claude
Plan(
  task: "Review plan completeness and clarity",
  context: "Plan ready. Check for gaps, unclear tasks, missing deps.",
  data: "<output of task_list>"
)
```

### Gate 3: Approve Plan

> **Tool hint**: Use `question` / `AskUserQuestion` tool if available to present final approval as structured choices.

Present the task graph for user approval before handoff to orchestrator:

```markdown
## Final Planning Approval — Execution Handoff

**Team**: <teamName>
**Tasks**: <count> tasks
**Critical path**: <longest dependency chain>

### Task Graph

| # | Task | Blocked By | File Scope |
|---|------|------------|------------|
| 1 | ...  | —          | ...        |
| 2 | ...  | #1         | ...        |
| ...| ... | ...        | ...        |

### Open Risks / Accepted Assumptions

- <any unvalidated HIGH risks if spikes were skipped>
- <key assumptions>

Reply with one:
1. **approve** — hand off to orchestrator for execution
2. **revise** — <feedback> (loops back to Phase 5 or 6)
3. **hold** — save plan but do NOT hand off yet
```

- **approve** → Plan is ready. Orchestrator can proceed.
- **revise** → If task/dependency issue → back to Phase 5-6.
- **hold** → Plan saved but not handed off. User can resume later.

### Save Execution Plan

Save to `history/YYYYMMDD-<feature>/execution-plan.md`:

```markdown
# Execution Plan: <Feature Name>

Team: <teamName>
Spike Team: <spike-teamName or "N/A" if skipped>
Generated: <date>

## Tasks

| # | Task | Blocked By | File Scope |
|---|------|------------|------------|
| 1 | ...  | —          | ...        |
| 2 | ...  | #1         | ...        |

## Key Learnings (from Spikes)

Embedded in tasks, but summarized here for reference:

- <learning 1>
- <learning 2>
```

## Security Review Recommendation

> **Run `/hd-security-review plan-review` before handing off to workers if:**
> - Auth changes or new auth flows are included
> - PII data is collected, stored, or transmitted
> - New public API endpoints are added
> - A compliance framework is declared in project `SECURITY_STANDARDS.md`
>
> This is a suggested gate, not forced. Use judgment based on feature risk level.

## Output Artifacts

| Artifact          | Location                                      | Purpose                            |
| ----------------- | --------------------------------------------- | ---------------------------------- |
| Discovery Report  | `history/YYYYMMDD-<feature>/discovery.md`     | Codebase snapshot                  |
| Approach Document | `history/YYYYMMDD-<feature>/approach.md`      | Strategy + risks                   |
| Spike Code        | `.spikes/YYYYMMDD-<feature>/`                 | Reference implementations          |
| Spike Learnings   | Embedded in task descriptions                 | Context for workers                |
| Feature Team      | `team_status(teamName="<feature>")`           | Task graph with dependencies       |
| Execution Plan    | `history/YYYYMMDD-<feature>/execution-plan.md`| Team name + task summary           |

## Optional: Task Finalize Hook

If a Linear task URL was provided at the start of this session:
1. Load `hd-task finalize <url>`
   Pass context: outputs from this session (execution plan, team name, approach doc, PR link / branch name)
2. hd-task will: merge outputs into task template → update Linear → run hd-changelog

Skip this step if no task URL is in context, or if the task was already updated.

---

## Quick Reference

### Tool Selection

| Need                                    | Tool                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Codebase structure, definitions, search | `finder` (Amp/hdcode) / `Explore` subagent (Claude)    |
| External patterns                       | `librarian`, `exa`                                                       |
| Gap analysis                            | `oracle` (Amp/hdcode) / `Plan` subagent (Claude)                       |
| Create spike team                       | `team_create` → `task_create` → `Task()` → `team_delete`                |
| Create feature tasks                    | `team_create` → `task_create` (with `addBlockedBy`/`addBlocks`)          |
| Validate task graph                     | `task_list` + agent reasoning                                            |
| View task details                       | `task_get`                                                               |
| Check team status                       | `team_status`                                                            |
| User interaction (gates, clarification) | `question` / `AskUserQuestion` tool if available, else free-text prompt  |

### Common Mistakes

- **Skipping discovery** → Plan misses existing patterns
- **No risk assessment** → Surprises during execution
- **No spikes for HIGH risk** → Blocked workers
- **Missing learnings in tasks** → Workers re-discover same issues
- **No dependency validation** → Broken task graph, circular dependencies
- **Skipping Gate 1** → Decompose wrong approach, rework Phase 5-6
- **Auto-handoff without Gate 3** → User surprised by worker execution
