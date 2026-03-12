---
title: "OpenCode Agent Team Plugin"
description: "Built-in agent team orchestration via OpenCode custom tools — task CRUD, dependency resolution, smart spawn, messaging"
status: completed
priority: P1
effort: 15h
tags: [plugin, agent-teams, custom-tools, orchestration]
created: 2026-03-12
completed: 2026-03-12
---

# OpenCode Agent Team Plugin

## Overview

Build a **native agent team system for OpenCode** using Custom Tools plugin. Similar to Claude Code's Agent Teams (TeamCreate, TaskCreate, TaskUpdate, TaskGet, TaskList, SendMessage) but implemented as OpenCode custom tools in `.opencode/tools/`.

**Core flow**: Lead creates team → creates tasks with dependencies → tools auto-resolve blocked/pending status → lead spawns agents only for unblocked tasks → workers call task_update on completion → tools auto-unblock dependents → lead spawns next wave → repeat until all done.

## Why Custom Tools (not MCP)

- In-process, near-zero latency, no external process
- Auto-inherited by Task-spawned subagents
- Shared state (no file locking needed)
- Single TypeScript codebase

## Architecture

```
.opencode/
├── package.json                # @opencode-ai/plugin dependency
└── tools/
    ├── lib/
    │   ├── types.ts            # Task, Team, Message interfaces
    │   └── store.ts            # JSON file read/write helpers, atomic ops
    ├── team.ts                 # team_create, team_status, team_list, team_delete
    ├── task.ts                 # task_create, task_update, task_get, task_list
    └── message.ts              # message_send, message_fetch

.team/<team-name>/              # Persistent storage (managed by tools)
├── config.json
├── tasks/task-001.json
├── messages/msg-001.json
└── reports/                    # Final deliverables (written by agents directly)
```

## Task Lifecycle & Dependency Resolution

```
                  ┌─────────┐
                  │ CREATED │ (task_create with blockedBy=[])
                  └────┬────┘
                       │ auto
                  ┌────▼────┐
           ┌──────│ pending │◄──── auto-unblocked when all blockers complete
           │      └────┬────┘
           │           │ task_update(status: in_progress, owner: agent)
           │      ┌────▼────────┐
           │      │ in_progress │
           │      └────┬────────┘
           │           │ task_update(status: completed)
           │      ┌────▼───────┐
           │      │ completed  │──── triggers: scan all tasks, remove this ID from blockedBy
           │      └────────────┘     if blockedBy becomes [] → auto-set to "pending"
           │
           │ (task_create with blockedBy=["task-001"])
           │      ┌─────────┐
           └──────│ blocked │──── waiting for blockers to complete
                  └─────────┘
```

**Key rule**: Lead calls `task_list(status: "pending")` to find tasks ready to spawn. Only `pending` tasks get spawned. `blocked` tasks wait automatically.

## Lead Spawn Loop

```
1. team_create(name, template, agents)
2. task_create(...) × N  (with blockedBy dependencies)
3. LOOP:
   a. status = team_status(teamName)
   b. if status.isComplete → DONE
   c. if status.pending == 0 AND status.in_progress == 0 AND status.blocked > 0 → DEADLOCK ERROR
   d. pending = task_list(teamName, status: "pending")
   e. for each pending task (max 4 per batch):
      - task_update(task.id, status: "in_progress")
      - spawn Task(subagent_type=..., prompt=includes task.id)
      (all Task() calls in SINGLE message → parallel execution)
   f. wait for ALL spawned agents to return
   g. if any Task() returned error → task_update(taskId, status: "pending") (reset for retry)
   h. (workers called task_update(status: "completed") → auto-unblock dependents)
   i. goto 3a
4. Synthesize reports
5. team_delete(name)
```

## Phases

| # | Phase | Effort | Link |
|---|-------|--------|------|
| 0 | **POC — verify platform assumptions** | 1h | [phase-00](./phase-00-poc.md) |
| 1 | Scaffold + lib | 1h | [phase-01](./phase-01-scaffold.md) |
| 2 | Team tools (lifecycle) | 2h | [phase-02](./phase-02-team-tools.md) |
| 3 | Task tools (CRUD + dependency resolution + cycle detection) | 4h | [phase-03](./phase-03-task-tools.md) |
| 4 | Message tools | 2h | [phase-04](./phase-04-messaging.md) |
| 5 | Update hd-team skill | 3h | [phase-05](./phase-05-skill-update.md) |
| 6 | E2E testing | 2h | [phase-06](./phase-06-testing.md) |

## Design Decisions

- **Cooperative ownership**: Agents are trusted (like Claude Code). No tool-level enforcement of task ownership or fileScope — enforced via prompt instructions.
- **Parallel spawn**: Lead issues multiple Task() calls in ONE message → OpenCode executes them in parallel (max 4 per batch).
- **Implicit serialization**: Bun is single-threaded JS — custom tool executions are serialized by the event loop. No explicit file locking needed.
- **Reports via standard write tool**: Agents write reports using built-in `write` tool, not a custom tool. Reports archived before team_delete.
- **Communication**: File-based polling via message_send/fetch. Workers instructed to check messages at checkpoints (before final report). No real-time push.

## Risks

- **GATING**: Subagent tool inheritance — if Task-spawned subagents can't see `.opencode/tools/`, architecture fails → POC required
- **GATING**: Shared lib/ imports — if tools can't import from `./lib/`, need inline types → POC required
- Custom tools API stability (OpenCode is evolving)

## Validation

See `plans/reports/260312-plan-validation-report.md` for full Oracle red-team review and independent assessment.

---

## 🎉 Completion Summary

**Status**: ✅ COMPLETED (all 7 phases)

### Delivery
- **10 custom tools** operational: team_create, team_status, team_list, team_delete, task_create, task_update, task_get, task_list, message_send, message_fetch
- **Automatic dependency resolution** with cycle detection
- **Atomic writes** with path validation (no corruption, no traversal exploits)
- **Full skill integration** (hd-team updated with 7 new documents, 0 Agent Mail references)

### Quality Assurance
- **30/30 E2E tests PASS** (100%)
- **7 code review issues fixed** (2 CRITICAL + 5 IMPORTANT)
  - Path traversal mitigation
  - `.gitignore` hardening
  - Atomic write atomicity
  - Type safety (enum validation)
  - Injection prevention
  - JSON structure validation

### Phases Completed
| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 0 | POC | ✅ | 3 assumptions verified; POC files cleaned |
| 1 | Scaffold + lib | ✅ | types.ts, store.ts, atomic I/O |
| 2 | Team tools | ✅ | 4 tools, full lifecycle |
| 3 | Task tools | ✅ | 4 tools, dependency auto-unblock, cycle detection |
| 4 | Message tools | ✅ | 2 tools, broadcast + DM filtering |
| 5 | Skill update | ✅ | 7 files updated, dependency-aware spawn loop |
| 6 | E2E Testing | ✅ | 30 tests, code review + fixes |

### Effort Tracking
- Planned: 15h
- Delivered: On schedule

### Ready for Production
- ✅ All acceptance criteria met
- ✅ No open blockers
- ✅ Full integration with hd-team skill
- ✅ Security & stability validated
