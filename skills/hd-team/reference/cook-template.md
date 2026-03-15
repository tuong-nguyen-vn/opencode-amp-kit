# Cook Template

## Protocol: `hd-team cook <plan-path-or-description> [--devs N]`

### Step 1: Read Plan

If path provided → Read and parse.
If description only → Spawn planner subagent first.

Parse plan into N independent task groups with file ownership boundaries.

### Step 2: Spawn Team with Dependencies

```
team_spawn(
  teamName: "cook-{plan-slug}",
  template: "cook",
  tasks: '[
    {"subject":"Implement: <scope-1>","description":"...","owner":"dev-1","role":"developer","fileScope":["src/auth/**"]},
    {"subject":"Implement: <scope-2>","description":"...","owner":"dev-2","role":"developer","fileScope":["src/api/**"]},
    {"subject":"Test: Full test suite","description":"...","owner":"tester","role":"tester","blockedBy":["0","1"]}
  ]'
)
```

Dev tasks: no blockers → status "in_progress" (owners assigned).
Tester task: blockedBy devs (index refs "0","1") → status "blocked".

### Step 3: Spawn Developers (Parallel)

For each in_progress task:

```
Task(
  subagent_type="fullstack-developer",
  description="Team cook-{slug}/dev-{N}: <scope>",
  prompt="""
You are a developer implementing: {task_description}

## File Ownership (CRITICAL)
You ONLY modify files matching: {file_scope}
DO NOT touch files outside your scope.

## Output
Return a structured summary:
- Files modified (with brief description)
- Implementation approach
- Any issues encountered
- Build/type-check status

Work dir: {cwd}
"""
)
```

### Step 4: Complete Dev Tasks

```
team_complete(
  teamName: "cook-{slug}",
  results: '[
    {"taskId":"<dev-1-id>","summary":"<return value>","report":"<full report>"},
    {"taskId":"<dev-2-id>","summary":"<return value>","report":"<full report>"}
  ]'
)
```

This auto-unblocks the tester task (blockedBy resolved → status changes to "pending").

### Step 5: Spawn Tester

Check `team_status` or the `unblocked` list from `team_complete`. Spawn tester for newly pending task.

> **NOTE**: `unblockDependents` sets status to "pending", not "in_progress". Manual promotion required before spawning.

```
task_update("cook-{slug}", "<tester-id>", status: "in_progress")

Task(
  subagent_type="tester",
  description="Team cook-{slug}/tester: Run test suite",
  prompt="""
You are a tester. Run the full test suite for recent changes.

## Context
{dev_summaries_from_reports}

## Output
Return:
- Test results (pass/fail counts)
- Failed test details (if any)
- Coverage summary
- Recommendations

Work dir: {cwd}
"""
)
```

### Step 6: Complete Tester + Finalize

```
team_complete(
  teamName: "cook-{slug}",
  results: '[{"taskId":"<tester-id>","summary":"<return value>","report":"<full report>"}]'
)
```

Verify `isComplete: true` in response.

### Step 7: Synthesize & Report

Read all reports. Assess docs impact. `team_delete("cook-{slug}")`. Report to user.
