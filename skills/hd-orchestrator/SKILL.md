---
name: hd-orchestrator
description: Coordinate multi-agent task execution. Use when starting feature execution, spawning workers for ready tasks, or monitoring parallel work progress.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Orchestrator Skill: Autonomous Multi-Agent Coordination

This skill spawns and monitors parallel worker agents that execute tasks from a feature team created by the `hd-planning` skill. Each task is assigned to one worker — no tracks, no grouping.

**Prerequisite**: Run the `hd-planning` skill first to generate a feature team with tasks and `history/<feature>/execution-plan.md`.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORCHESTRATOR                                   │
│                              (This Agent)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Read execution-plan.md + verify team                                    │
│  2. Loop: find ready tasks → spawn 1 worker per task (max 4 parallel)       │
│  3. Worker completes → auto-unblocks dependents → repeat                    │
│  4. Handle blockers                                                         │
│  5. All tasks done → announce completion                                    │
└─────────────────────────────────────────────────────────────────────────────┘
           │
           │ Task tool spawns workers dynamically
           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Worker A │  │ Worker B │  │ Worker C │  │ Worker D │
│ Task #1  │  │ Task #2  │  │ Task #4  │  │ Task #5  │
│ (done)   │  │ (done)   │  │ (working)│  │ (working)│
└──────────┘  └──────────┘  └──────────┘  └──────────┘
           │                   │
           └───────────────────┘
                    ▼
         ┌─────────────────────┐
         │   Agent Team Tools   │
         │  • task_list/get     │
         │  • task_update       │
         │  • message_send/fetch│
         │  • file_reserve/     │
         │    release/check     │
         │  • team_status       │
         └─────────────────────┘
```

---

## Phase 1: Read Plan & Verify Team

Use the **Read** tool to load the execution plan:

- **path**: `history/<feature>/execution-plan.md`

Extract:

- `TEAM_NAME` - the feature team name

Verify the team exists and tasks are ready:

```
team_status(teamName="<TEAM_NAME>")
task_list(teamName="<TEAM_NAME>")
```

---

## Phase 2: Execute Tasks (Dynamic Loop)

**Maximum 4 workers running in parallel at any time.**

### The Loop

```
WHILE there are pending/in_progress tasks:
  1. task_list(teamName) → find tasks where status="pending" AND all blockedBy tasks are completed
  2. Count currently in_progress tasks (workers running)
  3. For each ready task (up to 4 - running_count):
     → Spawn 1 worker via Agent("worker") or Task("worker")
  4. Wait for any worker to complete
  5. Repeat
```

### Spawning a Worker

For each ready task, spawn one worker using `Agent("worker")` (Claude) or `Task("worker")` (Amp/hdcode):

| Parameter     | Value                                             |
| ------------- | ------------------------------------------------- |
| `description` | `Worker for task #<id>: <task subject>`           |
| `prompt`      | Full prompt from `reference/worker-template.md`   |

### Example prompt for a single task

```
You are a worker agent executing task #3 in team "billing".

## Setup
1. Read /path/to/project/AGENTS.md for tool preferences

## Your Task
- Team: billing
- Task ID: 3
- File scope: packages/infrastructure/**

## Protocol

### 1. Start
- task_get(teamName="billing", taskId="3") — read full task details
- task_update(teamName="billing", taskId="3", status="in_progress")
- file_reserve(teamName="billing", agentId="worker-3", globs="packages/infrastructure/**", taskId="3", reason="task #3")
- message_fetch(teamName="billing", agent="worker-3") — check for messages

### 2. Work
- Implement the task requirements from task description
- Use preferred tools from AGENTS.md
- Run type-check + build from AGENTS.md ## Worker Config after edits
- Periodically: message_fetch(teamName="billing", agent="worker-3")

### 3. Complete
- Run verification (type-check + build from AGENTS.md ## Worker Config)
- task_update(teamName="billing", taskId="3", status="completed",
    description="<append completion summary and learnings>")
- message_send(teamName="billing", type="message", from="worker-3",
    recipient="orchestrator", content="[#3] COMPLETE: <summary>")
- file_release(teamName="billing", agentId="worker-3")

### 4. Done
- Return summary of work completed

## Important
- If file_reserve conflicts, message orchestrator and wait
- Report blockers immediately via message_send
```

---

## Phase 3: Monitor Progress

While workers execute, monitor via team tools.

### Check Task Progress

```
task_list(teamName="<TEAM_NAME>")
```

Look at task statuses:
- `pending` — not started yet (may be blocked by dependencies)
- `in_progress` — worker is currently working on it
- `completed` — done

### Check for Messages from Workers

```
message_fetch(teamName="<TEAM_NAME>", agent="orchestrator")
```

Workers send messages when:
- A task is completed
- A blocker is encountered

### Check Team Status Overview

```
team_status(teamName="<TEAM_NAME>")
```

---

## Phase 4: Handle Issues

### If Worker Reports Blocker

```
message_send(
  teamName="<TEAM_NAME>",
  type="message",
  from="orchestrator",
  recipient="<worker-id>",
  content="Resolution for blocker: <details>"
)
```

### If File Conflict

Check which agent holds the reservation:

```
file_check(teamName="<TEAM_NAME>", path="<conflicted-file>")
```

Ask the holder to release:

```
message_send(
  teamName="<TEAM_NAME>",
  type="message",
  from="orchestrator",
  recipient="<holder-agent>",
  content="worker-N needs <files>. Please release when done."
)
```

---

## Phase 5: Completion

When all tasks are completed:

### Verify All Done

```
task_list(teamName="<TEAM_NAME>")
```

All tasks should have `status: "completed"`. If any remain `pending` or `in_progress`, investigate.

### Broadcast Completion

```
message_send(
  teamName="<TEAM_NAME>",
  type="broadcast",
  from="orchestrator",
  content="## Feature Complete: <title>\n\n### Summary\n- <N> tasks completed\n\n### Deliverables\n- <what was built>\n\n### Learnings\n- <key insights>"
)
```

### Changelog Aggregation (Optional)

> **Tool hint**: Use `question` / `AskUserQuestion` tool if available.

**Summary**: N tasks completed

Would you like to generate changelog entries?
- **Yes** — run `/hd-changelog` with task summaries
- **No** — skip, user handles manually

---

## Quick Reference

| Phase      | Tool / Command                                                                |
| ---------- | ----------------------------------------------------------------------------- |
| Read Plan  | `Read` tool → `history/<feature>/execution-plan.md`                           |
| Verify Team| `team_status(teamName)`, `task_list(teamName)`                                |
| Find Ready | `task_list` → filter pending tasks with all blockers completed                |
| Spawn      | `Agent("worker")` (Claude) / `Task("worker")` (Amp/hdcode) — 1 per task, max 4 |
| Monitor    | `task_list`, `message_fetch(agent="orchestrator")`, `team_status`             |
| Resolve    | `message_send` to worker, `file_check` for conflicts                          |
| Complete   | Verify all tasks completed, `message_send(type="broadcast")` summary          |

---

## Additional Resources

- **Worker Prompt Template**: See `reference/worker-template.md` for the full template with variable substitution
- **Worker Agent (Claude)**: See `.claude/agents/worker.md` — pre-configured agent with sonnet model and all tools
