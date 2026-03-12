# Debug Template

## Protocol: `hd-team debug <issue> [--debuggers N]`

### Step 1: Generate Hypotheses

Default N=3. Each hypothesis must be:
- Independently testable
- Predict different observable symptoms
- Framed as: "If <cause>, then we should see <evidence>"

### Step 2: Create Team

Generate team name: `debug-{issue-slug}` (kebab-case).

```bash
mkdir -p .team/debug-{issue-slug}/{tasks,messages,status,reports}
```

Write `.team/debug-{issue-slug}/config.json`:
```json
{
  "team_name": "debug-{issue-slug}",
  "template": "debug",
  "mode": "LITE",
  "created": "<ISO timestamp>",
  "agents": [
    {"name": "debugger-1", "role": "debugger", "status": "active"}
  ]
}
```

### Step 3: Create Tasks

Write `.team/debug-{issue-slug}/tasks/debugger-{N}.json` for each:
```json
{
  "id": "debugger-001",
  "subject": "Debug: <hypothesis-title>",
  "description": "Test hypothesis: <hypothesis>...",
  "status": "pending",
  "owner": "debugger-{N}",
  "blockedBy": [],
  "created": "<ISO timestamp>"
}
```

### Step 4: Spawn Debuggers (Parallel, Adversarial)

```
Task(
  subagent_type="debugger",
  description="Team debug-{issue-slug}/debugger-{N}: <hypothesis>",
  prompt="""
You are debugger-{N} on team "debug-{issue-slug}".

## Your Hypothesis
{hypothesis_description}

## The Issue
{issue_description}

## ADVERSARIAL Protocol
Your job is to PROVE or DISPROVE your hypothesis.
Also actively try to DISPROVE other hypotheses.

1. Read .team/debug-{issue-slug}/tasks/debugger-{N}.json
2. Write .team/debug-{issue-slug}/status/debugger-{N}.json: {"status": "working"}
3. Gather evidence FOR your hypothesis
4. Gather evidence AGAINST your hypothesis
5. Read .team/debug-{issue-slug}/messages/ for other debuggers' findings
6. Write counter-evidence to .team/debug-{issue-slug}/messages/{seq}-debugger-{N}-evidence.md
7. Challenge other debuggers' theories with specific evidence
8. Write final report to .team/debug-{issue-slug}/reports/debugger-{N}-report.md
9. Update .team/debug-{issue-slug}/status/debugger-{N}.json: {"status": "done"}

## Report Format
# Debug: <hypothesis>

## Hypothesis
<Clear statement>

## Evidence FOR
- <evidence with file:line references>

## Evidence AGAINST
- <evidence with file:line references>

## Cross-Analysis
- Debugger X's theory about Y is [supported|refuted] because...

## Verdict
[CONFIRMED | REFUTED | INCONCLUSIVE]

## Recommended Fix (if confirmed)
<Fix approach>

Team Context:
- Work dir: {cwd}
- Team name: debug-{issue-slug}
- Team dir: {cwd}/.team/debug-{issue-slug}/
- Mode: LITE
- Your name: debugger-{N}
- Your role: debugger
"""
)
```

### Step 5: Monitor

Wait for all `debugger-*-report.md` files.
Debuggers should naturally cross-read `.team/debug-{issue-slug}/messages/` for adversarial debate.

### Step 6: Identify Root Cause

Read all debugger reports. The surviving (non-refuted) theory = root cause.

### Step 7: Synthesize

Save to `plans/reports/debug-{issue-slug}.md`:

```markdown
# Debug Report: <Issue>

## Root Cause
<Clear statement of confirmed root cause>

## Evidence Chain
1. <Evidence 1>
2. <Evidence 2>
3. <Conclusion>

## Disproven Hypotheses
### Hypothesis A: <description> — Refuted by: <evidence>
### Hypothesis B: <description> — Refuted by: <evidence>

## Recommended Fix
<Fix approach with file references>

## Prevention
<How to prevent similar bugs>
```

### Step 8: Cleanup & Report

```bash
rm -rf .team/debug-{issue-slug}/
```

Tell user: `Debug complete. Root cause: <summary>. Report: {path}.`
