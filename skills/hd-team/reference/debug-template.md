# Debug Template

## Protocol: `hd-team debug <issue> [--debuggers N]`

### Step 1: Generate Hypotheses

Default N=3. Each hypothesis must be:
- Independently testable
- Predict different observable symptoms
- Framed as: "If <cause>, then we should see <evidence>"

### Step 2: Create Team

```
team_create(
  teamName: "debug-{issue-slug}",
  template: "debug",
  agents: '[{"name":"debugger-1","role":"debugger"},{"name":"debugger-2","role":"debugger"},{"name":"debugger-3","role":"debugger"}]'
)
```

### Step 3: Create Tasks

```
task_create(teamName: "debug-{slug}", subject: "Debug: <hypothesis>", description: "...", owner: "debugger-1")
task_create(teamName: "debug-{slug}", subject: "Debug: <hypothesis>", description: "...", owner: "debugger-2")
task_create(teamName: "debug-{slug}", subject: "Debug: <hypothesis>", description: "...", owner: "debugger-3")
```

All tasks pending (no dependencies — adversarial parallel investigation).

### Step 4: Spawn Debuggers (Parallel, Adversarial)

```
pending = task_list("debug-{slug}", status: "pending")

for each task:
  task_update(teamName, task.id, status: "in_progress")

Task(
  subagent_type="debugger",
  description="Team debug-{slug}/debugger-{N}: <hypothesis>",
  prompt="""
You are debugger-{N} on team "debug-{slug}".

## Your Hypothesis
{hypothesis_description}

## The Issue
{issue_description}

## Custom Tools
- task_get("debug-{slug}", "{task-id}") → your assignment
- task_update("debug-{slug}", "{task-id}", status:"completed") → mark done
- message_send("debug-{slug}", from:"debugger-{N}", to:"all", type:"finding", content:"...") → share evidence
- message_fetch("debug-{slug}", type:"finding") → read others' evidence

## ADVERSARIAL Protocol
Your job is to PROVE or DISPROVE your hypothesis.
Also actively try to DISPROVE other hypotheses.

1. task_get for your assignment
2. Gather evidence FOR your hypothesis
3. Gather evidence AGAINST your hypothesis
4. message_send findings to share with team (type: "finding")
5. message_fetch to read other debuggers' evidence
6. Challenge other theories with specific counter-evidence
7. Write final report to .team/debug-{slug}/reports/debugger-{N}-report.md
8. task_update status: "completed"

## Report Format
# Debug: <hypothesis>
## Hypothesis
<Clear statement>
## Evidence FOR
- <evidence with file:line references>
## Evidence AGAINST
- <evidence with file:line references>
## Cross-Analysis
- Debugger X's theory is [supported|refuted] because...
## Verdict
[CONFIRMED | REFUTED | INCONCLUSIVE]
## Recommended Fix (if confirmed)

Team Context:
- Work dir: {cwd}
- Team name: debug-{slug}
- Your name: debugger-{N}
- Your role: debugger
"""
)
```

### Step 5: Monitor

```
team_status("debug-{slug}")
# Wait for isComplete
```

### Step 6: Identify Root Cause

Read all debugger reports. The surviving (non-refuted) theory = root cause.

### Step 7: Synthesize

Save to `plans/reports/debug-{issue-slug}.md`:

```markdown
# Debug Report: <Issue>
## Root Cause
## Evidence Chain
## Disproven Hypotheses
## Recommended Fix
## Prevention
```

### Step 8: Cleanup & Report

```
team_delete("debug-{slug}")
```

Tell user: `Debug complete. Root cause: <summary>. Report: {path}.`
