# Phase 5: Update hd-team Skill

## Overview
- **Priority**: P1 | **Effort**: 3h

Rewrite hd-team skill to use custom tools. Remove ALL Agent Mail/FULL/LITE mode references. Add dependency-aware spawn loop.

## Files to Update

### 1. `SKILL.md` — Major rewrite
- Remove Communication Protocol section (FULL/LITE modes)
- Remove "Mode: {FULL|LITE}" from spawn template
- Add dependency-aware spawn loop as core pattern
- Update all template references to use tools
- Keep file ≤150 lines

### 2. `reference/communication-protocol.md` — Full rewrite
- Remove FULL mode (Agent Mail) entirely
- Remove LITE mode label (it's just "the mode" now)
- Worker protocol: `task_get` → work → `message_send` → `task_update(completed)` → return
- Lead protocol: `team_create` → `task_create` × N → spawn loop → `team_delete`
- No more `mkdir`, `ls`, `cat .team/` commands

### 3. `reference/agent-roles.md` — Update spawn template
- Workers receive tool instructions in prompt
- Workers call: `task_get`, `task_update`, `message_send`
- Lead calls: `team_create`, `task_create`, `task_list`, `team_status`, `team_delete`
- Remove Mode from Team Context block

### 4. `reference/research-template.md` — Update
- Step 2: `team_create()` instead of `mkdir`
- Step 3: `task_create()` instead of manual JSON write
- Step 5: `team_status()` instead of `ls .team/*/reports/`
- Step 7: `team_delete()` instead of `rm -rf`
- Worker prompt: use `task_update(status: "completed")` when done

### 5. `reference/cook-template.md` — Update (most complex)
- Tester task uses `blockedBy: ["dev-001", "dev-002", ...]`
- **Spawn loop**: Lead calls `task_list(status: "pending")` → spawn pending tasks → wait → repeat
- Tester auto-unblocks when all dev tasks complete
- No more manual monitoring or separate tester spawn step

### 6. `reference/review-template.md` — Update
- Same pattern as research: `team_create` → `task_create` → spawn → `team_status` → `team_delete`

### 7. `reference/debug-template.md` — Update
- Same pattern, workers use `message_send(type: "finding")` for cross-agent sharing

## Key Pattern: Dependency-Aware Spawn Loop

All templates use this core loop (replaces polling):

```
# Lead creates team + tasks (some with blockedBy)
team_create(...)
task_create(..., blockedBy: [])       # wave 1
task_create(..., blockedBy: [])       # wave 1
task_create(..., blockedBy: [...])    # wave 2 (auto-blocked)

# Lead spawn loop
while true:
  pending = task_list(teamName, status: "pending")
  in_progress = task_list(teamName, status: "in_progress")
  if pending.length == 0 AND in_progress.length == 0:
    break  # all done
  for task in pending:
    task_update(task.id, status: "in_progress", owner: task.owner)
    spawn Task(subagent_type=..., prompt=includes task.id)
  # spawned agents call task_update(status: "completed") when done
  # tools auto-unblock dependents → become "pending"
  # next iteration picks them up
```

## Success Criteria
- [x] All 7 files updated
  - [x] SKILL.md (121 lines)
  - [x] communication-protocol.md (60 lines)
  - [x] agent-roles.md (87 lines)
  - [x] research-template.md (118 lines)
  - [x] cook-template.md (131 lines)
  - [x] review-template.md (120 lines)
  - [x] debug-template.md (124 lines)
- [x] Zero references to Agent Mail, am, br, FULL mode, LITE mode
- [x] All templates use custom tools (no mkdir, no manual JSON writes)
- [x] Cook template demonstrates dependency-based spawn (tester blocked by devs)
- [x] All files ≤150 lines
