# Cook Template

## Protocol: `hd-team cook <plan-path-or-description> [--devs N]`

### Step 1: Read Plan

If path provided → Read and parse.
If description only → Spawn planner subagent first.

Parse plan into N independent task groups with file ownership boundaries.

### Step 2: Create Team

```
team_create(
  teamName: "cook-{plan-slug}",
  template: "cook",
  agents: '[{"name":"dev-1","role":"developer"},{"name":"dev-2","role":"developer"},{"name":"tester","role":"tester"}]'
)
```

### Step 3: Create Tasks with Dependencies

Dev tasks — no blockers (parallel):
```
task_create(teamName: "cook-{slug}", subject: "Implement: <scope>", description: "...", owner: "dev-1", fileScope: '["src/auth/**"]')
→ task-001 (pending)

task_create(teamName: "cook-{slug}", subject: "Implement: <scope>", description: "...", owner: "dev-2", fileScope: '["src/api/**"]')
→ task-002 (pending)
```

Tester task — **blocked by all dev tasks**:
```
task_create(teamName: "cook-{slug}", subject: "Test: Full test suite", description: "...", owner: "tester", blockedBy: '["task-001","task-002"]')
→ task-003 (blocked)
```

### Step 4: Dependency-Aware Spawn Loop

```
LOOP:
  pending = task_list("cook-{slug}", status: "pending")
  # First iteration: [task-001, task-002] (devs)
  # After devs complete: [task-003] (tester auto-unblocked)

  for each pending task (max 4):
    task_update(teamName, task.id, status: "in_progress")
    spawn Task(subagent_type=..., prompt=...)

  wait for all spawned agents to return
  # Workers call task_update(status: "completed") → auto-unblock dependents

  status = team_status("cook-{slug}")
  if status.isComplete → break
```

### Step 5: Developer Spawn Prompt

```
Task(
  subagent_type="fullstack-developer",
  description="Team cook-{slug}/dev-{N}: <scope>",
  prompt="""
You are dev-{N} on team "cook-{slug}".

## Your Scope
{task_description}

## File Ownership (CRITICAL)
You ONLY modify files matching: {file_scope}
DO NOT touch files outside your scope.

## Custom Tools
- task_get("cook-{slug}", "{task-id}") → your assignment
- task_update("cook-{slug}", "{task-id}", status:"completed") → mark done
- message_send("cook-{slug}", from:"dev-{N}", to:"all", type:"finding", content:"...") → share info
- message_fetch("cook-{slug}", to:"dev-{N}") → read messages

## Protocol
1. task_get to read your assignment
2. Implement your scope
3. Run type-check and build commands
4. message_send your implementation summary
5. Write report to .team/cook-{slug}/reports/dev-{N}-report.md
6. task_update status: "completed"

Team Context:
- Work dir: {cwd}
- Team name: cook-{slug}
- Your name: dev-{N}
- Your role: developer
"""
)
```

### Step 6: Tester Auto-Spawns

When all dev tasks complete, `task_update` auto-unblocks the tester task to "pending". Next loop iteration picks it up:

```
Task(
  subagent_type="tester",
  description="Team cook-{slug}/tester: Run test suite",
  prompt="""
You are tester on team "cook-{slug}".

## Custom Tools
- task_get("cook-{slug}", "{task-id}") → your assignment
- task_update("cook-{slug}", "{task-id}", status:"completed") → mark done
- message_fetch("cook-{slug}", type:"finding") → read dev findings

## Protocol
1. task_get for your assignment
2. Read .team/cook-{slug}/reports/dev-*-report.md for context
3. Run full test suite
4. Write results to .team/cook-{slug}/reports/tester-report.md
5. task_update status: "completed"

Team Context:
- Work dir: {cwd}
- Team name: cook-{slug}
- Your name: tester
- Your role: tester
"""
)
```

### Step 7: Synthesize & Report

Read all reports. Assess docs impact. `team_delete("cook-{slug}")`. Report to user.
