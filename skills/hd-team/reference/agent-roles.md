# Agent Roles & Subagent Mapping

## Role Catalog

| Role | Subagent Type | Model | Domain |
|------|--------------|-------|--------|
| **Lead** | (self — orchestrator) | opus/sonnet | Coordination, synthesis |
| **Researcher** | `researcher` | haiku | Information gathering |
| **Developer** | `fullstack-developer` | sonnet | Code implementation |
| **Tester** | `tester` | haiku | Test execution |
| **Reviewer** | `code-reviewer` | haiku | Code quality, security |
| **Debugger** | `debugger` | sonnet | Root cause analysis |
| **Planner** | `planner` | sonnet | Plan creation |

> **Workers have NO access to custom tools.** OpenCode isolates Task-spawned subagents from plugin tools. All state management is the Lead's responsibility.

## Role Responsibilities

### Lead (Orchestrator)
- Uses `team_spawn` to create team + all tasks in one call
- Spawns workers via Task with minimal prompts (task description only)
- Parses Task return values to get worker results
- Uses `team_complete` to bulk-update tasks + write reports
- Synthesizes final report from worker results
- Cleans up with `team_delete`

### Worker (All Non-Lead Roles)
- Receives task description via Task prompt (~150 tokens)
- Executes work within assigned scope
- Returns structured result via Task return value
- **Does NOT** use team/task/message tools (cannot access them)

## Spawn Template (Minimal — Lead-Only)

```
Task(
  subagent_type="{subagent_type}",
  description="Team {team_name}/{name}: {subject}",
  prompt="""
{role_instruction}

## Task
{full_task_description}

## File Scope
{file_scope or "No restrictions"}

## Output
Return a structured summary:
- Key findings/changes (top 3-5)
- Evidence/sources (if research)
- Files modified (if implementation)
- Recommendations

Work dir: {cwd}
"""
)
```

**Token savings: ~500 → ~150 tokens per worker (70% reduction)**

## Model Selection Guide

| Priority | Model | Use For |
|----------|-------|---------|
| Speed + cost | haiku | Research, review, testing |
| Quality + complexity | sonnet | Implementation, debugging |
| Deep reasoning | opus | Complex architecture, synthesis |

## Max Parallel Workers

- **Hard limit**: 4 concurrent Task spawns
- If >4 workers needed, batch in waves
- Spawn first 4, wait for 1+ to complete, spawn next
