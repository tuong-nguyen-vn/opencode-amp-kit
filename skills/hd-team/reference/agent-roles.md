# Agent Roles & Subagent Mapping

## Role Catalog

| Role | Subagent Type | Model | Tools | Domain |
|------|--------------|-------|-------|--------|
| **Lead** | (self — orchestrator) | opus/sonnet | all + custom tools | Coordination, synthesis |
| **Researcher** | `researcher` | haiku | read, grep, glob, web + custom tools | Information gathering |
| **Developer** | `fullstack-developer` | sonnet | all + custom tools | Code implementation |
| **Tester** | `tester` | haiku | read, grep, bash + custom tools | Test execution |
| **Reviewer** | `code-reviewer` | haiku | read, grep, glob + custom tools | Code quality, security |
| **Debugger** | `debugger` | sonnet | all + custom tools | Root cause analysis |
| **Planner** | `planner` | sonnet | read, grep, glob, web | Plan creation |

## Role Responsibilities

### Lead (Orchestrator)
- Uses `team_create` to set up team
- Uses `task_create` to assign tasks with dependencies
- Runs spawn loop with `task_list(status: "pending")`
- Monitors via `team_status`
- Synthesizes results from reports
- Cleans up with `team_delete`

### Worker (All Non-Lead Roles)
- Uses `task_get` to read assignment
- Uses `task_update(status: "in_progress")` to claim task
- Executes work within assigned scope
- Uses `message_send` to share findings/blockers
- Writes report to `.team/{teamName}/reports/{name}-report.md`
- Uses `task_update(status: "completed")` when done

## Spawn Template

```
Task(
  subagent_type="{subagent_type}",
  description="Team {team_name}/{name}: {subject}",
  prompt="""
You are {name}, a {role} on team "{team_name}".

## Setup
1. Read the project AGENTS.md for conventions
2. Your task ID: {task_id}

## Custom Tools Available
- task_get(teamName, taskId) → read your task details
- task_update(teamName, taskId, status, owner) → update your status
- message_send(teamName, from, to, type, content) → send messages
- message_fetch(teamName, to, type, since) → read messages

## Task Assignment
{full_task_description}

## File Ownership
{file_scope}

## When Done
1. Write final report to .team/{team_name}/reports/{name}-report.md
2. task_update("{team_name}", "{task_id}", status: "completed")
3. Return a summary of your work

Team Context:
- Work dir: {cwd}
- Team name: {team_name}
- Team dir: {cwd}/.team/{team_name}/
- Reports: {cwd}/.team/{team_name}/reports/
- Your name: {name}
- Your role: {role}
- Orchestrator: lead
"""
)
```

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
