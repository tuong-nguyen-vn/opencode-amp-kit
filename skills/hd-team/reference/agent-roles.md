# Agent Roles & Subagent Mapping

## Role Catalog

Each role maps to an OpenCode subagent type with specific model and tool constraints.

| Role | Subagent Type | Model | Tools | Domain |
|------|--------------|-------|-------|--------|
| **Lead** | (self — orchestrator) | opus/sonnet | all | Coordination, synthesis |
| **Researcher** | `researcher` | haiku | read, grep, glob, web | Information gathering |
| **Developer** | `fullstack-developer` | sonnet | all | Code implementation |
| **Tester** | `tester` | haiku | read, grep, bash | Test execution, validation |
| **Reviewer** | `code-reviewer` | haiku | read, grep, glob | Code quality, security |
| **Debugger** | `debugger` | sonnet | all | Root cause analysis |
| **Planner** | `planner` | sonnet | read, grep, glob, web | Plan creation |

## Role Responsibilities

### Lead (Orchestrator)

- Creates team structure (`.team/<team-name>/`)
- Assigns tasks with clear scope
- Spawns teammates via Task tool
- Monitors progress via `.team/<team-name>/status/` and `.team/<team-name>/reports/`
- Synthesizes results from all teammates
- Handles cross-agent conflicts
- Cleans up team artifacts

### Researcher

- Investigates a specific angle of a topic
- Gathers evidence from codebase + external sources
- Writes findings to `.team/<team-name>/messages/{seq}-{name}-findings.md`
- Produces final report: `.team/<team-name>/reports/{name}-report.md`
- Reads other researchers' findings for cross-pollination

### Developer

- Implements code within assigned file scope
- Follows file ownership boundaries strictly
- Writes implementation summary to `.team/<team-name>/messages/`
- Reports blockers immediately via status file
- Produces completion report: `.team/<team-name>/reports/{name}-report.md`

### Tester

- Blocked until all dev tasks complete
- Runs full test suite on final code
- Validates acceptance criteria
- Reports pass/fail with evidence
- Produces test report: `.team/<team-name>/reports/tester-report.md`

### Reviewer

- Reviews code within assigned focus area
- Rates findings by severity: CRITICAL > IMPORTANT > MODERATE
- Provides concrete evidence for each finding
- Produces review report: `.team/<team-name>/reports/{name}-report.md`

### Debugger

- Tests a specific hypothesis about a bug
- Gathers evidence FOR and AGAINST their theory
- Reads other debuggers' findings (adversarial cross-validation)
- Writes hypothesis evidence to `.team/<team-name>/messages/`
- Produces debug report: `.team/<team-name>/reports/{name}-report.md`

## Spawn Template

```
Task(
  subagent_type="{subagent_type}",
  description="Team {team_name}/{name}: {subject}",
  prompt="""
You are {name}, a {role} on team "{team_name}".

## Setup
1. Read the project AGENTS.md for conventions
2. Your task: {task_description}

## Team Protocol
- Team dir: {cwd}/.team/{team_name}/
- Write status: .team/{team_name}/status/{name}.json
- Write messages: .team/{team_name}/messages/{seq}-{name}-{slug}.md
- Write report: .team/{team_name}/reports/{name}-report.md
- Read others: .team/{team_name}/messages/ (for cross-agent context)

## Task Assignment
{full_task_description}

## File Ownership
{file_scope}

## Acceptance Criteria
{acceptance_criteria}

## When Done
1. Write final report to .team/{team_name}/reports/{name}-report.md
2. Update .team/{team_name}/status/{name}.json → status: "done"
3. Return a summary of your work

Team Context:
- Work dir: {cwd}
- Team name: {team_name}
- Team dir: {cwd}/.team/{team_name}/
- Reports: {cwd}/.team/{team_name}/reports/
- Mode: {mode}
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
