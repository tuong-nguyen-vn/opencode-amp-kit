# Phase 3: Task Tools (CRUD + Dependency Resolution)

## Overview
- **Priority**: P1 | **Effort**: 4h

Most critical phase. 4 tools in `.opencode/tools/task.ts` with **automatic dependency resolution** and **cycle detection**.

## Tools

### `task_create`
```
Args: teamName, subject, description, owner?, blockedBy?, fileScope?
Logic:
  1. Auto-generate ID (task-001, task-002, ...)
  2. Validate blockedBy IDs exist in team's tasks/
  3. **Cycle detection**: Traverse blockedBy chain — if any path leads back to this task → reject with error
  4. status = blockedBy.length > 0 ? "blocked" : "pending"
  5. Write task JSON atomically
  6. Return created task
```

### `task_update`
```
Args: teamName, taskId, status?, owner?
Logic:
  1. Read current task JSON
  2. Validate status transition:
     - blocked → pending (only via auto-unblock, not manual)
     - pending → in_progress (claiming)
     - in_progress → completed | cancelled
     - Cannot: blocked → completed (must unblock first)
  3. Apply updates + set updated timestamp
  4. **IF status → "completed" OR "cancelled":**
     a. Scan ALL tasks in .team/{teamName}/tasks/
     b. For each task with this taskId in blockedBy:
        - Remove this taskId from blockedBy array
        - If blockedBy becomes empty → set status to "pending"
        - Write updated task atomically
  5. Write this task atomically
  6. Return { task, unblocked: string[] } (list of newly unblocked task IDs)
```

**Key mechanism**: When dev-001 completes, tester's `blockedBy: ["dev-001", "dev-002"]` becomes `["dev-002"]`. When dev-002 also completes, tester becomes `blockedBy: []` → auto-set `"pending"`. Lead's next `task_list(status: "pending")` picks it up.

### `task_get`
```
Args: teamName, taskId
Logic: Read .team/{teamName}/tasks/{taskId}.json, return Task
```

### `task_list`
```
Args: teamName, status?, owner?
Logic:
  1. Read all JSON files in .team/{teamName}/tasks/
  2. Filter by status if provided
  3. Filter by owner if provided
  4. Return sorted array (by ID)
```

## Cycle Detection Algorithm

```
function hasCycle(newTaskId, blockedBy, allTasks):
  visited = Set()
  queue = [...blockedBy]
  while queue.length > 0:
    current = queue.shift()
    if current == newTaskId → CYCLE DETECTED, reject
    if visited.has(current) → skip
    visited.add(current)
    task = allTasks[current]
    if task → queue.push(...task.blockedBy)
  return false  // no cycle
```

## Dependency Resolution Flow Example

```
task_create(cook-auth, "Backend API",   blockedBy: [])                → task-001 (pending)
task_create(cook-auth, "Frontend UI",   blockedBy: [])                → task-002 (pending)
task_create(cook-auth, "Integration",   blockedBy: ["task-001","task-002"]) → task-003 (blocked)
task_create(cook-auth, "Testing",       blockedBy: ["task-003"])      → task-004 (blocked)

# Lead spawns: task_list(status: "pending") → [task-001, task-002]
# Both agents complete → task-003 auto-unblocks to "pending"
# Lead spawns task-003 → completes → task-004 auto-unblocks
# Lead spawns task-004 → completes → team_status.isComplete = true
```

## Error Recovery

- If Task() returns error for a spawned agent → lead calls `task_update(taskId, status: "pending")` to reset
- Lead can optionally re-spawn with retry limit (max 2 retries per task)

## Success Criteria
- [x] 4 tools exported from task.ts
- [x] Dependency auto-unblock works (completing a task unblocks dependents)
- [x] Cancelled tasks also unblock dependents
- [x] Cycle detection prevents circular dependencies
- [x] Status transitions validated (can't go blocked → completed directly)
- [x] task_list filters correctly by status/owner
- [x] Atomic writes prevent corruption
- [x] Enum validation on status arg
