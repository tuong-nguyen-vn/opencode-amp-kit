---
name: hd-team
description: "Orchestrate Agent Teams for parallel multi-session collaboration. Use for research, implementation, review, and debug workflows requiring independent teammates."
license: proprietary
version: 2.4.0
argument-hint: "<template> <context> [--devs|--researchers|--reviewers N] [--delegate]"
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Agent Teams - Claude Code Native Orchestration Engine

Coordinate multiple independent Claude Code sessions. Each teammate has own context window, loads project context (CLAUDE.md, skills, agents), communicates via shared task list and messaging.

**Requires:** Agent Teams enabled. Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json env.

## Usage

```
/hd-team <template> <context> [flags]
```

**Templates:** `research`, `cook`, `review`, `debug` — details in `references/template-*.md`

**Flags:**
- `--devs N` | `--researchers N` | `--reviewers N` | `--debuggers N` — team size
- `--plan-approval` / `--no-plan-approval` — plan gate (default: on for cook)
- `--delegate` — lead only coordinates, never touches code

## Pre-flight Check (Step 0)

Before ANY template execution:

1. **CALL** `TeamCreate(team_name: "preflight-<unix-epoch-seconds>")`
   - IF ERROR or tool unrecognized → STOP, output setup instructions, EXIT
2. **On SUCCESS:** `TeamDelete` immediately, then continue to template.

Do NOT fall back to subagents. `/hd-team` MUST use Agent Teams or abort.

## Execution Protocol

When activated, IMMEDIATELY execute the matching template from `references/`.
Do NOT ask for confirmation. Do NOT explain what you're about to do.
Execute tool calls in order. Report progress after each major step.

All teammate spawns MUST include `team_name` parameter.

> **API Note:** `team_name` and `name` are extended params added to `Task` tool when Agent Teams enabled.

## Templates (load from references/)

| Template | Reference | Default N | Model | Use Case |
|----------|-----------|-----------|-------|----------|
| `research <topic>` | `references/template-research.md` | 3 | haiku | Multi-angle investigation |
| `cook <path>` | `references/template-cook.md` | 2 | sonnet | Parallel implementation |
| `review <scope>` | `references/template-review.md` | 3 | haiku | Security/perf/coverage |
| `debug <issue>` | `references/template-debug.md` | 3 | sonnet | Adversarial root cause |

## Choosing the Right Skill

| Need | Skill | Why |
|------|-------|-----|
| Parallel multi-session research | **hd-team research** | Multiple agents explore angles simultaneously |
| Interactive ideation with user debate | **hd-brainstorming** | Single-session phases: context → framing → ideation → debate |
| Parallel implementation (2-3 devs, real-time) | **hd-team cook** | Agent Teams with plan approval, worktrees |
| Large epics with task tracking (>4 tasks) | **hd-orchestrator** | Agent Team Tools, lower token cost |
| Parallel code review | **hd-team review** | Multiple reviewers, different focuses |
| Adversarial debugging | **hd-team debug** | Competing hypotheses with cross-challenge |
| Focused single task (test, lint) | **Subagents (Task tool)** | Overkill for Agent Teams |
| Sequential chain (plan → code → test) | **Subagents (Task tool)** | No need for independent sessions |

## Token Budget

| Template | Estimated Tokens | Model Strategy |
|----------|-----------------|----------------|
| Research (3) | ~150K-300K | haiku for all |
| Cook (4) | ~400K-800K | sonnet for devs, haiku for tester |
| Review (3) | ~100K-200K | haiku for all |
| Debug (3) | ~200K-400K | sonnet for all |

## Error Recovery

1. **Check status**: `Shift+Up/Down` (in-process) or click pane (split)
2. **Redirect**: Send direct message with corrective instructions
3. **Replace**: Shut down failed teammate, spawn replacement for same task
4. **Reassign**: `TaskUpdate` stuck task to unblock dependents

## Abort Team

```
Shut down all teammates. Then call TeamDelete (no parameters).
```

## Agent Memory

Agents with `memory: project` retain learnings across sessions in `~/.claude/agent-memory/<name>/`.

## Rules Reference

See `~/.claude/rules/team-coordination-rules.md` for teammate behavior rules.

## Tool API

| Tool | Purpose | Key Params |
|------|---------|-----------|
| `TeamCreate` | Create team + task list | `team_name`, `description` |
| `TeamDelete` | Remove team (no params) | — |
| `TaskCreate` | Add task | `subject`, `description`, `addBlockedBy` |
| `TaskUpdate` | Update task | `task_id`, `status`, `owner` |
| `TaskList` | List all tasks | — |
| `SendMessage` | DM or broadcast | `type`, `recipient`, `content` |

## SendMessage Types

| Type | Purpose |
|------|---------|
| `message` | DM to one teammate |
| `broadcast` | Send to ALL teammates |
| `shutdown_request` | Ask teammate to exit |
| `plan_approval_response` | Approve/reject plan |

## Orchestration Paths

| Path | Skills | Token Cost | Best For |
|------|--------|-----------|----------|
| **A** (Agent Team Tools) | hd-orchestrator | Lower | Large epics, task tracking |
| **B** (Agent Teams) | hd-team | Higher | Research, review, debate |

> v2.4.0: Refactored templates to references/. Added cross-references to hd-brainstorming and hd-orchestrator. Added "Choosing the Right Skill" decision matrix.
