# Lead Orchestration Protocol

## Lead-Only Communication

All state management and communication flows through the Lead. Workers are pure executors — they return results via Task return value. No worker-to-worker or worker-to-tool communication exists.

### Lead Protocol

```
1. team_spawn(teamName, template, tasks=[...])   ← creates team + tasks + sets in_progress
2. LOOP:
   a. Spawn Task() per in_progress task (max 4 parallel)
   b. Wait for all Task returns → parse results
   c. team_complete(teamName, results=[{taskId, summary, report}])
      ← marks completed + writes reports + auto-unblocks dependents
   d. status = team_status(teamName)
   e. if isComplete → DONE
   f. if pending (newly unblocked) → goto 2a
3. Read .team/{teamName}/reports/ for synthesis
4. team_delete(teamName)
```

### Worker Protocol (Minimal)

Workers receive only a task description. Their entire lifecycle is:

```
1. Read task description from prompt (~150 tokens)
2. Execute task
3. Return structured summary string to Lead
```

Workers communicate results **via Task return value**, not via tools.

### Message Tools (Lead-Only)

Message tools (`message_send`, `message_fetch`) are available for the Lead to annotate state or log progress. Workers do not use them.

| Type | Use Case |
|------|----------|
| `broadcast` | Lead logs progress for compaction context |
| `finding` | Lead records synthesis results |
| `blocker` | Lead notes issues during orchestration |

### Orchestrator Monitoring

```
team_status(teamName) → task summary, completion flag, report list
task_list(teamName, status: "pending") → tasks ready to spawn
task_list(teamName, status: "in_progress") → currently running tasks
```

Completion = `team_status.isComplete === true` (all tasks completed or cancelled).

### Error Handling

If a Task spawn fails or times out:
1. Use `team_complete` with `status: "cancelled"` for that task
2. Decide: retry the task, skip it, or abort the entire team
3. Cancelled tasks auto-unblock dependents (same as completed)
