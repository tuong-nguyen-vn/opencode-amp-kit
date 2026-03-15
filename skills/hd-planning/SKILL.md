---
name: hd-planning
description: Generate comprehensive plans for new features by exploring the codebase, synthesizing approaches, validating with spikes, and decomposing into beads. Use when asked to plan a feature, create a roadmap, or design an implementation approach.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Feature Planning Pipeline

> **[IMPORTANT]** This skill is for PLANNING ONLY. Do NOT implement any code during this phase. All implementation will be handled by worker agents in the execution phase after the plan is approved.

Generate quality plans through systematic discovery, synthesis, verification, and decomposition.

## Pipeline Overview

```
USER REQUEST → Discovery → Clarification → Synthesis → Verification → Decomposition → Validation → Track Planning → Ready Plan
```

| Phase              | Tool                                                 | Output                              |
| ------------------ | ---------------------------------------------------- | ----------------------------------- |
| 1. Discovery       | `finder`, `librarian`, exa                           | Discovery Report                    |
| 2. Clarification   | Interactive Q&A with user                            | Validated Requirements              |
| 3. Synthesis       | `oracle`                                             | Approach + Risk Map                 |
| 4. Verification    | Spikes via `Task`                                    | Validated Approach + Learnings      |
| 5. Decomposition   | hd-plan-to-beads skill                               | .beads/\*.md files                  |
| 6. Validation      | bv + `oracle`                                        | Validated dependency graph          |
| 7. Track Planning  | bv --robot-plan                                      | Execution plan with parallel tracks |

## Phase 1: Discovery (Parallel Exploration)

Launch parallel sub-agents to gather codebase intelligence:

```
Task() → Agent A: Architecture snapshot
Task() → Agent B: Pattern search (find similar existing code)
Task() → Agent C: Constraints (package.json, tsconfig, deps)
finder → "Find all authentication middleware implementations"
finder → "Where is the database connection configured?"
finder → "Find how API routes are organized"
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
  (Look for: page components, form files, table/list components, bead descriptions mentioning "page", "form", "view", "layout", "UI", "component", "screen", "modal", "dialog", "dashboard")
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

```
1. Synthesize points needing clarification from Discovery Report
2. Present question list (max 3-5 most important questions)
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
   - **B**: Describe the standard inline (I'll embed it in each UI bead's Technical Notes)
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
| UI standard (list view) | `docs/ui-standards/list-view.md` | Embedded in UI bead Technical Notes |
| UI standard (form layout) | [inline description] | Embedded in UI bead Technical Notes |

**User Confirmation**: [timestamp]
```

## Phase 3: Synthesis (Plan)

Feed Discovery Report to `oracle` for gap analysis:

```
oracle(
  task: "Analyze gap between current codebase and feature requirements",
  context: "Discovery report attached. User wants: <feature>",
  files: ["history/<feature>/discovery.md"]
)
```

`oracle` produces:

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

## Phase 4: Verification (Risk-Based)

### For HIGH Risk Items → Create Spike Beads

Spikes are mini-plans executed via `Task`:

```bash
br create "Spike: <question to answer>" -t epic -p 0
br create "Spike: Test X" -t task --blocks <spike-epic>
br create "Spike: Verify Y" -t task --blocks <spike-epic>
```

### Spike Bead Template

```markdown
# Spike: <specific question>

**Time-box**: 30 minutes
**Output location**: .spikes/<spike-id>/

## Question

Can we <specific technical question>?

## Success Criteria

- [ ] Working throwaway code exists
- [ ] Answer documented (yes/no + details)
- [ ] Learnings captured for main plan

## On Completion

Close with: `br close <id> --reason "YES: <approach>" or "NO: <blocker>"`
```

### Execute Spikes

Use the `Task` tool:

1. `bv --robot-plan` to parallelize spikes
2. `Task()` per spike with time-box
3. Workers write to `.spikes/YYYYMMDD-<feature>/<spike-id>/`
4. Close with learnings: `br close <id> --reason "<result>"`

### Aggregate Spike Results

```
oracle(
  task: "Synthesize spike results and update approach",
  context: "Spikes completed. Results: ...",
  files: ["history/<feature>/approach.md"]
)
```

Update approach.md with validated learnings.

## Phase 5: Decomposition (hd-plan-to-beads skill)

### Extract UI Standards for Beads

Before loading `hd-plan-to-beads`, extract UI standard answers from `history/<feature>/discovery.md` Clarifications section.

Build a UI standards map:
```
UI_STANDARDS = {
  "<pattern>": "<file path or inline standard text>",
  // e.g. "list-view": "docs/ui-standards/list-view.md"
  // e.g. "form": "[inline: always use 2-column layout, labels above fields, ...]"
}
```

Pass this as explicit context when the `hd-plan-to-beads` skill loads:
> "For any UI bead (pages, forms, views, dashboards), embed the relevant entry from this UI standards map in the bead's Technical Notes."

If no UI work was detected or user answered C (no standard), pass an empty map — `hd-plan-to-beads` will note "no standard defined" in UI bead Technical Notes.

### Security Pre-Check (before hd-plan-to-beads)

Scan `approach.md` and bead descriptions for security signals:

| Signal Category | Keywords |
|-----------------|----------|
| PII | user, profile, email, phone, SSN, passport, health, address, DOB, identity |
| API surface | endpoint, API, REST, GraphQL, webhook, public, external |
| Auth | auth, login, session, token, JWT, OAuth, permission, role, access control |
| Payment/sensitive data | payment, card, bank, transaction, billing, encrypt, vault, secret |
| Multi-tenancy | tenant, organization, workspace, account isolation |

If ANY signal triggered, auto-include applicable security beads in decomposition:

- `"Security: Input validation & injection hardening"` — if API surface signals
- `"Security: Auth/authz review for [feature name]"` — if auth signals
- `"Security: PII handling, data minimization & retention"` — if PII signals
- `"Security: API field exposure audit & rate limiting"` — if API surface signals
- `"Security: Payment data flow & compliance check"` — if payment signals

> When in doubt about data sensitivity, include security beads. Cost of an extra bead is lower than a missed vulnerability.

Load the hd-plan-to-beads skill and create beads with embedded learnings:

```bash
skill("hd-plan-to-beads")
```

### Bead Requirements

Each bead MUST include:

- **Spike learnings** embedded in description (if applicable)
- **Reference to .spikes/ code** for HIGH risk items
- **Clear acceptance criteria**
- **File scope** for track assignment

### Example Bead with Learnings

```markdown
# Implement Stripe webhook handler

## Context

Spike bd-12 validated: Stripe SDK works with our Node version.
See `.spikes/20250113-billing/webhook-test/` for working example.

## Learnings from Spike

- Must use `stripe.webhooks.constructEvent()` for signature verification
- Webhook secret stored in `STRIPE_WEBHOOK_SECRET` env var
- Raw body required (not parsed JSON)

## Acceptance Criteria

- [ ] Webhook endpoint at `/api/webhooks/stripe`
- [ ] Signature verification implemented
- [ ] Events: `checkout.session.completed`, `invoice.paid`
```

## Phase 6: Validation

### Run bv Analysis

```bash
bv --robot-suggest   # Find missing dependencies
bv --robot-insights  # Detect cycles, bottlenecks
bv --robot-priority  # Validate priorities
```

### Fix Issues

```bash
br dep add <from> <to>      # Add missing deps
br dep remove <from> <to>   # Break cycles
br update <id> --priority X # Adjust priorities
```

### Plan Final Review

```
oracle(
  task: "Review plan completeness and clarity",
  context: "Plan ready. Check for gaps, unclear beads, missing deps.",
  files: [".beads/"]
)
```

## Phase 7: Track Planning

This phase creates an **execution-ready plan** so the orchestrator can spawn workers immediately without re-analyzing beads.

### Step 1: Get Parallel Tracks

```bash
bv --robot-plan 2>/dev/null | jq '.plan.tracks'
```

### Step 2: Assign File Scopes

For each track, determine the file scope based on beads in that track:

```bash
# For each bead, check which files it touches
br show <bead-id>  # Look at description for file hints
```

**Rules:**

- File scopes must NOT overlap between tracks
- Use glob patterns: `packages/sdk/**`, `apps/server/**`
- If overlap unavoidable, merge into single track
- **Max 3 beads per track** - If more, split into sequential tracks
- **High file-touch beads get isolated tracks** - Beads updating many files should be in their own track to avoid conflicts

### Step 3: Generate Agent Names

Assign unique adjective+noun names to each track:

- BlueLake, GreenCastle, RedStone, PurpleBear, etc.
- Names are memorable identifiers, NOT role descriptions

### Step 4: Create Execution Plan

Save to `history/YYYYMMDD-<feature>/execution-plan.md`:

```markdown
# Execution Plan: <Feature Name>

Epic: <epic-id>
Generated: <date>

## Tracks

| Track | Agent       | Beads (in order)      | File Scope        |
| ----- | ----------- | --------------------- | ----------------- |
| 1     | BlueLake    | bd-10 → bd-11 → bd-12 | `packages/sdk/**` |
| 2     | GreenCastle | bd-20 → bd-21         | `packages/cli/**` |
| 3     | RedStone    | bd-30 → bd-31 → bd-32 | `apps/server/**`  |

## Track Details

### Track 1: BlueLake - <track-description>

**File scope**: `packages/sdk/**`
**Beads**:

1. `bd-10`: <title> - <brief description>
2. `bd-11`: <title> - <brief description>
3. `bd-12`: <title> - <brief description>

### Track 2: GreenCastle - <track-description>

**File scope**: `packages/cli/**`
**Beads**:

1. `bd-20`: <title> - <brief description>
2. `bd-21`: <title> - <brief description>

### Track 3: RedStone - <track-description>

**File scope**: `apps/server/**`
**Beads**:

1. `bd-30`: <title> - <brief description>
2. `bd-31`: <title> - <brief description>
3. `bd-32`: <title> - <brief description>

## Cross-Track Dependencies

- Track 2 can start after bd-11 (Track 1) completes
- Track 3 has no cross-track dependencies

## Key Learnings (from Spikes)

Embedded in beads, but summarized here for orchestrator reference:

- <learning 1>
- <learning 2>
```

### Validation

Before finalizing, verify:

```bash
# No cycles in the graph
bv --robot-insights 2>/dev/null | jq '.Cycles'

# All beads assigned to tracks
bv --robot-plan 2>/dev/null | jq '.plan.unassigned'
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
| Spike Learnings   | Embedded in beads                             | Context for workers                |
| Beads             | `.beads/*.md`                                 | Executable work items              |
| Execution Plan    | `history/YYYYMMDD-<feature>/execution-plan.md`| Track assignments for orchestrator |

## Optional: Task Finalize Hook

If a Linear task URL was provided at the start of this session:
1. Load `hd-task finalize <url>`
   Pass context: outputs from this session (execution plan, bead list, approach doc, PR link / branch name)
2. hd-task will: merge outputs into task template → update Linear → run hd-changelog

Skip this step if no task URL is in context, or if the task was already updated.

---

## Quick Reference

### Tool Selection

| Need                                    | Tool                                     |
| --------------------------------------- | ---------------------------------------- |
| Codebase structure, definitions, search | `finder`                                 |
| External patterns                       | `librarian`                              |
| Web research                            | `mcp__exa__web_search_exa`               |
| Gap analysis                            | `oracle`                                 |
| Create beads                            | `skill("hd-plan-to-beads")` + `br create` |
| Validate graph                          | `bv --robot-*`                           |

### Common Mistakes

- **Skipping discovery** → Plan misses existing patterns
- **No risk assessment** → Surprises during execution
- **No spikes for HIGH risk** → Blocked workers
- **Missing learnings in beads** → Workers re-discover same issues
- **No bv validation** → Broken dependency graph
