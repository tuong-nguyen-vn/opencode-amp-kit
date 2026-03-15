# Template: Cook

`/hd-team cook <path>` [--devs N]

Parallel implementation from execution-plan.md or description.

## Input Validation

- IF path ends with `execution-plan.md`: Parse structured plan from hd-planning
- IF path is other `.md`: Treat as generic plan
- IF description only: Ask user to run `/hd-planning` first

## Execution Steps

1. **READ** plan (if path provided) OR create via planner teammate:
   - If `execution-plan.md`: Extract tracks table (agent names, beads, file scopes)
   - Validate: no file scope overlap, beads exist
   - **If overlap detected: STOP** — report which scopes conflict to user, do NOT proceed until resolved
   - If description only: spawn `Task(subagent_type: "planner")` to create plan first
   - Parse plan into N independent task groups with file ownership boundaries

2. **CALL** `TeamCreate(team_name: "<feature-slug>")`

2b. **WORKTREE SETUP** (if N > 1 devs):
   - Run per developer: `git worktree add ../worktrees/<feature-slug>-dev-{N} -b feat/<feature-slug>-dev-{N}`
   - Each developer works in their own worktree — eliminates git conflicts
   - Post-completion: lead merges branches, then `git worktree remove ../worktrees/<feature-slug>-dev-{N}`

3. **CALL** `TaskCreate` x (N + 1) — N dev tasks + 1 tester task:
   - Dev tasks: `File ownership: <glob patterns>`, `Worktree: ../worktrees/<feature-slug>-dev-{N}`
   - NO file scope overlap between devs
   - Tester task: `addBlockedBy` all dev task IDs
   - Each task description includes: implementation scope, file ownership, acceptance criteria

4. **CALL** `Task` x N to spawn developer teammates:
   - `subagent_type: "fullstack-developer"`, `mode: "plan"`
   - `model: "sonnet"`, `name: "dev-{N}"`
   - Prompt: task description + team context (peers, task summary, worktree path)
   - REVIEW and APPROVE each developer's plan via `plan_approval_response`
   - **Approve if:** file ownership respected, scope matches task, tests included in plan
   - **Reject if:** plans edits outside owned files, no test plan, scope creep detected

5. **MONITOR** dev completion via TaskList polling:
   - Check TaskList every 60s until all N dev tasks completed
   - When all completed, spawn tester immediately:
   - `Task(subagent_type: "tester", model: "haiku", name: "tester", team_name: "<feature-slug>")`
   - Tester runs full test suite, reports pass/fail

6. **DOCS SYNC EVAL** (MANDATORY for cook):
   ```
   Docs impact: [none|minor|major]
   Action: [no update needed — <reason>] | [updated <page>] | [needs separate PR]
   ```

7. **SHUTDOWN** all teammates via `SendMessage(type: "shutdown_request")`
   - If rejected: wait 30s for teammate to finish, retry once before proceeding

8. **CLEANUP**: `TeamDelete` (no parameters — only after all teammates idle)

9. **REPORT**: Tell user what was cooked, test results, docs impact.

## Relationship to hd-orchestrator

- `/hd-team cook` = **Agent Teams** (native multi-session, higher token cost, real-time communication)
- `/hd-orchestrator` = **Agent Mail + Beads CLI** (subagent-based, lower token cost, async messaging)
- For 2-3 devs with real-time plan approval → use `/hd-team cook`
- For large epics with bead tracking and >4 tracks → use `/hd-orchestrator`
