---
name: hd-issue-resolution
description: Systematically diagnose and fix bugs through triage, reproduction, root cause analysis, and verified fixes. Use when resolving bugs, errors, failing tests, or investigating unexpected behavior.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Issue Resolution Pipeline

Systematically resolve issues through iterative diagnosis and verified fixes. A single agent runs the entire pipeline — no team creation or worker spawning needed.

> **User Confirmation Gates:**
> - **Gate 1 (after Phase 2)** — User confirms root cause and approves fix approach before implementation.
> - **Gate 2 (after Phase 3)** — User confirms blast radius and approves proceeding with fix.

## Pipeline Overview

```
INPUT → Triage → Reproduction → Root Cause Analysis → [Gate 1: Confirm RCA] → Impact → [Gate 2: Approve Fix] → Fix → Verify
                ◄──────────────►◄────────────────────►
                      (Iterative loops allowed)
```

| Phase                  | Purpose                            | Output              |
| ---------------------- | ---------------------------------- | ------------------- |
| 0. Triage              | Normalize input, classify severity | Issue Brief         |
| 1. Reproduction        | Prove the bug, trace code path     | Repro Report + Test |
| 2. Root Cause Analysis | Find WHY, not just WHERE           | RCA Report          |
| 3. Impact Assessment   | Blast radius, regression risk      | Impact Report       |
| 4. Fix                 | Implement the fix                  | Code changes        |
| 5. Verification        | Prove fix works, no regressions    | Passing tests       |

## Phase 0: Triage

Normalize different input types to a structured Issue Brief.

### Input Types

| Type                  | Triage Strategy                       |
| --------------------- | ------------------------------------- |
| **Vague report**      | Clarify → Explore → Reproduce         |
| **Error/Stack trace** | Parse trace → Locate code → Reproduce |
| **Failing test**      | Run test → Extract assertion → Trace  |

### Vague Report Triage

> **Tool hint**: Use `question` / `AskUserQuestion` tool if available for clarification questions.

```
User: "Login is broken"
         │
         ▼
Ask clarification questions:
• What error do you see?
• When did it start working / stop working?
• What steps trigger it?
• Specific user/browser/environment?
         │
         ▼ (if user can't clarify)
Explore:
• finder / Explore subagent: Find auth/login related code
• git log: Recent changes in area
• Check logs if available
```

### Error/Stack Trace Triage

```
Parse the stack trace:
• Extract file:line locations
• finder / Explore subagent on functions in trace
• Understand surrounding context
         │
         ▼
Identify reproduction conditions:
• What input caused this?
• Can we write a test?
```

### Failing Test Triage

```
Run test in isolation:
• bun test <file> --filter "<test name>"
• Understand test setup/assertions
• Check git log: was it passing before?
         │
         ▼
Trace implementation:
• What code does test exercise?
• finder / Explore subagent on tested function
• Recent changes to implementation?
```

### Severity Classification

Determines reproduction requirements:

| Severity                            | Reproduction Required  |
| ----------------------------------- | ---------------------- |
| **CRITICAL** (production, security) | Failing test REQUIRED  |
| **REGRESSION** (was working)        | Failing test REQUIRED  |
| **RACE CONDITION** (timing)         | Failing test REQUIRED  |
| **LOGIC BUG**                       | Failing test PREFERRED |
| **UI/VISUAL**                       | Manual + screenshot OK |
| **PERFORMANCE**                     | Benchmark/profile OK   |
| **QUICK FIX** (obvious cause)       | Manual repro OK        |

### Issue Brief Template

Save to `history/issues/<id>/brief.md`:

```markdown
# Issue Brief: <Short Title>

**Severity**: CRITICAL / HIGH / MEDIUM / LOW
**Type**: Regression / Edge case / Race condition / UI / Performance / Other
**Repro Required**: Failing test / Manual OK

## Symptom

<What is happening>

## Expected Behavior

<What should happen>

## Reproduction

<Steps, test command, or code path>

## Evidence

<Error message, stack trace, test output>

## Affected Area

<Files, modules, features involved>

## Timeline

<When started, recent changes if known>
```

## Phase 1: Reproduction

Prove the bug exists and trace the code path.

### If Failing Test Required

```bash
# Create test file
# packages/<area>/src/__tests__/<feature>.regression.test.ts

# Test should:
# 1. Set up conditions that trigger bug
# 2. Assert expected behavior (currently fails)
# 3. Be deterministic
```

### Reproduction Checklist

- [ ] Bug is reproducible on demand
- [ ] Exact error/behavior captured
- [ ] Minimal reproduction (simplest case that fails)
- [ ] Code path identified (stack trace or tracing)

### Code Path Tracing

```
finder / Explore subagent → Find where error originates, find callers
git blame <file>           → Who changed it, when
git log -p <file>          → What changed recently
```

### Repro Report Template

Save to `history/issues/<id>/repro.md`:

```markdown
# Reproduction Report: <Issue Title>

## Reproduction Method

☐ Failing test: `<test file and name>`
☐ Manual: <steps>

## Error/Behavior Captured

<Exact error message, stack trace>

## Code Path

1. Entry: `<file>:<line>` - <function>
2. Calls: `<file>:<line>` - <function>
3. Fails at: `<file>:<line>` - <reason>

## Recent Changes (if relevant)

- <commit>: <summary>
```

## Phase 2: Root Cause Analysis

Find WHY the bug happens, not just WHERE.

### RCA Framework

```
STEP 1: Generate hypotheses (3-5)
         │
         ▼
STEP 2: Gather evidence for/against each
         │
         ▼
STEP 3: Eliminate hypotheses
         │
         ▼
STEP 4: Confirm root cause
```

### Bug Type → RCA Strategy

| Bug Type            | Strategy                  | Key Tools                       |
| ------------------- | ------------------------- | ------------------------------- |
| **Regression**      | Find breaking change      | `git bisect`, `git blame`       |
| **Edge case**       | Analyze boundary inputs   | Type inspection, boundary tests |
| **Race condition**  | Trace async flow          | Timing logs, async analysis     |
| **Data corruption** | Trace state changes       | Data flow analysis              |
| **External dep**    | Check version/API changes | Changelogs, API docs            |

### oracle (Amp/hdcode) / Plan subagent (Claude) for RCA

**Hypothesis Generation:**

```
# Amp / hdcode
oracle(
  task: "Generate root cause hypotheses",
  context: """
    Symptom: <error>
    Code path: <trace>
    Recent changes: <git log>

    Generate 3-5 hypotheses ranked by likelihood.
    For each, what evidence would support/refute it?
  """,
  files: ["<affected files>"]
)

# Claude
Plan(
  task: "Generate root cause hypotheses",
  context: """
    Symptom: <error>
    Code path: <trace>
    Recent changes: <git log>

    Generate 3-5 hypotheses ranked by likelihood.
    For each, what evidence would support/refute it?
  """,
  files: ["<affected files>"]
)
```

**Hypothesis Validation:**

```
# Amp / hdcode
oracle(
  task: "Validate root cause hypothesis",
  context: """
    Hypothesis: <proposed cause>
    Evidence: <gathered evidence>

    1. Does evidence support or refute?
    2. Explain causal chain: cause → symptom
    3. What would confirm this?
  """,
  files: ["<relevant files>"]
)

# Claude
Plan(
  task: "Validate root cause hypothesis",
  context: """
    Hypothesis: <proposed cause>
    Evidence: <gathered evidence>

    1. Does evidence support or refute?
    2. Explain causal chain: cause → symptom
    3. What would confirm this?
  """,
  files: ["<relevant files>"]
)
```

### Iteration: RCA → Reproduction Loop

If hypothesis needs more evidence:

```
IN RCA: "Need timing logs to confirm race condition"
    │
    ▼
BACK TO REPRO:
• Add instrumentation
• Run with specific conditions
• Capture new evidence
    │
    ▼
RETURN TO RCA with new evidence
```

### RCA Report Template

Save to `history/issues/<id>/rca.md`:

```markdown
# Root Cause Analysis: <Issue Title>

## Iteration: <N>

## Hypotheses Considered

### Hypothesis A: <Description>

- **Likelihood**: HIGH / MEDIUM / LOW
- **Supporting evidence**: ...
- **Refuting evidence**: ...
- **Verdict**: ✓ CONFIRMED / ✗ ELIMINATED

### Hypothesis B: ...

## Root Cause (Confirmed)

**Cause**: <Clear statement>

**Causal chain**:

1. <Step> leads to
2. <Step> leads to
3. <Symptom>

## Why This Happened

<Underlying reason - missing validation, wrong assumption, etc.>

## Fix Approach

**Immediate**: <What to change>
**Preventive**: <How to prevent similar bugs>
```

### Gate 1: Confirm Root Cause & Fix Approach

> **Tool hint**: Use `question` / `AskUserQuestion` tool if available to present options as structured choices.

Present the RCA findings and proposed fix for user approval:

```markdown
## Root Cause Confirmed

**Cause**: <clear statement>
**Causal chain**: <brief chain>
**Proposed fix**: <what to change>
**Alternative approaches**: <if any>

Reply with one:
1. **approve** — proceed with this fix approach
2. **revise** — <feedback on root cause or fix approach>
3. **stop** — end investigation here
```

- **approve** → Continue to Phase 3 (Impact Assessment)
- **revise** → Back to Phase 2 with new direction, or adjust fix approach
- **stop** → Save RCA report as deliverable, no fix applied

## Phase 3: Impact Assessment

Before fixing, understand blast radius.

### Impact Analysis

```
finder / Explore subagent <affected function>
    → Who else calls this?
    → Similar code that might have same bug?

Review test coverage
    → What tests cover this area?
```

### Regression Risk

| Factor              | Risk Level |
| ------------------- | ---------- |
| High usage function | HIGH       |
| Shared utility      | HIGH       |
| Public API change   | HIGH       |
| Internal helper     | LOW        |
| Isolated module     | LOW        |

### Spike for Complex Fixes

If fix approach is uncertain, run a quick spike directly:

1. Create throwaway code in `.spikes/<issue-id>/`
2. Validate the approach works
3. Document learnings
4. Delete spike code after confirming approach

### Impact Report Template

Save to `history/issues/<id>/impact.md`:

```markdown
# Impact Assessment: <Issue Title>

## Blast Radius

### Direct Impact

- <File/function directly changed>

### Callers Affected

- <List from finder / Explore subagent>

### Related Code

- <Similar patterns that may need same fix>

## Regression Risk

**Level**: HIGH / MEDIUM / LOW
**Reason**: <Why this risk level>

## Test Coverage

- Existing tests: <list>
- Tests to add: <list>

## Fix Validation

☐ Spike completed (if needed): `.spikes/<id>/`
☐ Fix approach validated
```

### Gate 2: Approve Fix

> **Tool hint**: Use `question` / `AskUserQuestion` tool if available to present options as structured choices.

Present the impact assessment for user approval before implementing the fix:

```markdown
## Impact Assessment Complete

**Blast radius**: <N files directly, M callers affected>
**Regression risk**: HIGH / MEDIUM / LOW
**Fix approach**: <brief description>
**Files to modify**: <list>
**Tests to add**: <list>

Reply with one:
1. **approve** — proceed with fix implementation
2. **revise** — <feedback on approach or scope>
3. **stop** — save assessment, do not fix
```

- **approve** → Continue to Phase 4 (Fix)
- **revise** → Adjust fix approach or scope, back to Phase 3
- **stop** → Save impact report as deliverable, no fix applied

## Phase 4: Fix

Implement the fix directly. The agent handles all code changes.

### Simple Fix

1. Write/update regression test (failing → will pass after fix)
2. Implement the fix
3. Run type-check + build from AGENTS.md ## Worker Config

### Complex Fix (Multiple Files)

1. Write regression tests first
2. Fix each affected file
3. Run type-check + build after each significant change
4. If related code has the same bug pattern, fix those too (from Impact Assessment)

### What to Include

- **Regression test** — test that fails before fix, passes after
- **The fix itself** — minimal change that addresses root cause
- **Related fixes** — same bug pattern in other files (from Impact Assessment)
- **Docs update** — if behavior change affects documentation

## Phase 5: Verification

Prove fix works and nothing else broke.

### Verification Checklist

```bash
# 1. Regression test passes
bun test <regression-test-file>

# 2. Original symptom gone
<manual verification or test>

# 3. No new failures
bun run test

# 4. Types and build
bun run check-types
bun run build
```

### Iteration: Verify → RCA Loop

If fix doesn't work:

```
Test still fails after fix
    │
    ▼
Root cause was wrong or incomplete
    │
    ▼
BACK TO RCA:
• Eliminate current hypothesis
• Generate new hypotheses
• Update RCA Report with iteration
```

### Verify → Impact Loop

If fix causes regressions:

```
New test failures after fix
    │
    ▼
Fix has unintended side effects
    │
    ▼
BACK TO IMPACT:
• Reassess blast radius
• Consider alternative fix approach
```

## Loop Limits

Prevent infinite iteration:

| Loop         | Soft Limit | Hard Limit | At Hard Limit               |
| ------------ | ---------- | ---------- | --------------------------- |
| RCA → Repro  | 2          | 4          | Escalate / pair debug       |
| RCA → Triage | 1          | 2          | Re-evaluate original report |
| Verify → RCA | 2          | 3          | `oracle` (Amp/hdcode) / `Plan` subagent (Claude) deep review |

## Optional: Task Finalize Hook

If a Linear task URL was provided at the start of this session:
1. Load `hd-task finalize <url>`
   Pass context: outputs from this session (fix summary, PR link / branch name, root cause)
2. hd-task will: merge outputs into task template → update Linear → run hd-changelog

Skip this step if no task URL is in context, or if the task was already updated.

## Known Issues Suggestion Hook

After resolution, check if the fix involved accepting or deferring the underlying issue rather than fully resolving it.

**Trigger signals** (in fix summary, root cause, or verification notes):
- "workaround", "temporary fix", "partial fix", "deferred", "can't fix now", "won't fix"
- "known limitation", "accepted", "acknowledged", "expected behavior"
- "TODO", "FIXME", "tech debt", "legacy constraint"

If any trigger signal is present and no matching KI entry exists in `docs/KNOWN_ISSUES.md`:

```
> This resolution appears to involve accepted/deferred debt: "<matched phrase>".
> Add to docs/KNOWN_ISSUES.md as a known issue? (y/n)
```

On **yes**: append a new KI entry with auto-assigned next sequential ID, title from the issue summary, scope from affected files, today's date, and `<fill in>` placeholders for Reason, Accepted-by, and Target-fix. Display: `KI-NNN added — fill in the remaining fields.`

On **no**: skip silently.

---

## Quick Reference

### Tool Selection

| Need                  | Tool                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| Parse stack trace     | `finder` (Amp/hdcode) / `Explore` subagent (Claude)   |
| Find callers          | `finder` (Amp/hdcode) / `Explore` subagent (Claude)   |
| Recent changes        | git log, git blame                                                       |
| Binary search commits | git bisect                                                               |
| Reasoning about cause | `oracle` (Amp/hdcode) / `Plan` subagent (Claude)                       |
| Validate fix approach | Spike in `.spikes/<issue-id>/` (agent runs directly)                     |
| User interaction      | `question` / `AskUserQuestion` tool if available                         |

### Common Mistakes

- **Fixing symptom, not cause** → Leads to recurrence
- **Skipping reproduction** → Can't verify fix
- **No regression test** → Bug returns later
- **Ignoring impact** → Fix breaks other things
- **Not iterating** → Wrong diagnosis persists
- **Skipping Gate 1** → Fix wrong root cause, wasted effort
- **Skipping Gate 2** → Underestimate blast radius, regressions
