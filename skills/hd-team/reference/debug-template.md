# Debug Template

## Protocol: `hd-team debug <issue> [--debuggers N]`

### Step 1: Generate Hypotheses

Default N=3. Each hypothesis must be:
- Independently testable
- Predict different observable symptoms
- Framed as: "If <cause>, then we should see <evidence>"

### Step 2: Spawn Team

```
team_spawn(
  teamName: "debug-{issue-slug}",
  template: "debug",
  tasks: '[
    {"subject":"Debug: <hypothesis-1>","description":"...","owner":"debugger-1","role":"debugger"},
    {"subject":"Debug: <hypothesis-2>","description":"...","owner":"debugger-2","role":"debugger"},
    {"subject":"Debug: <hypothesis-3>","description":"...","owner":"debugger-3","role":"debugger"}
  ]'
)
```

All tasks with owners → status "in_progress" (adversarial parallel investigation).

### Step 3: Spawn Debuggers (Parallel, Adversarial)

```
Task(
  subagent_type="debugger",
  description="Team debug-{slug}/debugger-{N}: <hypothesis>",
  prompt="""
You are investigating hypothesis: {hypothesis_description}

## The Issue
{issue_description}

## ADVERSARIAL Protocol
Your job is to PROVE or DISPROVE your hypothesis.
- Gather evidence FOR your hypothesis
- Gather evidence AGAINST your hypothesis

## Output
Return a structured report:
# Debug: <hypothesis>
## Hypothesis
<Clear statement>
## Evidence FOR
- <evidence with file:line references>
## Evidence AGAINST
- <evidence with file:line references>
## Verdict
[CONFIRMED | REFUTED | INCONCLUSIVE]
## Recommended Fix (if confirmed)

Work dir: {cwd}
"""
)
```

### Step 4: Complete Tasks

```
team_complete(
  teamName: "debug-{slug}",
  results: '[
    {"taskId":"<id-1>","summary":"<return value>","report":"<full report>"},
    {"taskId":"<id-2>","summary":"<return value>","report":"<full report>"},
    {"taskId":"<id-3>","summary":"<return value>","report":"<full report>"}
  ]'
)
```

### Step 5: Identify Root Cause

Read all debugger reports from `.team/debug-{slug}/reports/`. The surviving (non-refuted) theory = root cause.

### Step 6: Synthesize

Save to `plans/reports/debug-{issue-slug}.md`:

```markdown
# Debug Report: <Issue>
## Root Cause
## Evidence Chain
## Disproven Hypotheses
## Recommended Fix
## Prevention
```

### Step 7: Cleanup & Report

```
team_delete("debug-{slug}")
```

Tell user: `Debug complete. Root cause: <summary>. Report: {path}.`
