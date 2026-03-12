# Cook Template

## Protocol: `hd-team cook <plan-path-or-description> [--devs N]`

### Step 1: Read Plan

If path provided → Read and parse.
If description only → Spawn planner subagent first:

```
Task(
  subagent_type="planner",
  description="Create implementation plan",
  prompt="Create a plan for: <description>. Output: task breakdown with file scopes."
)
```

Parse plan into N independent task groups with file ownership boundaries.

### Step 2: Create Team

Generate team name: `cook-{plan-slug}` (kebab-case).

```bash
mkdir -p .team/cook-{plan-slug}/{tasks,messages,status,reports}
```

Write `.team/cook-{plan-slug}/config.json` with all agents (N devs + 1 tester).

### Step 3: Create Tasks

For each developer — write `.team/cook-{plan-slug}/tasks/dev-{N}.json`:
```json
{
  "id": "dev-001",
  "subject": "Implement: <scope description>",
  "description": "Full implementation requirements...",
  "status": "pending",
  "owner": "dev-{N}",
  "blockedBy": [],
  "file_scope": "<glob patterns>",
  "created": "<ISO timestamp>"
}
```

For tester — write `.team/cook-{plan-slug}/tasks/tester.json`:
```json
{
  "id": "tester-001",
  "subject": "Test: Full test suite",
  "description": "Run all tests, validate acceptance criteria...",
  "status": "pending",
  "owner": "tester",
  "blockedBy": ["dev-001", "dev-002", "dev-003"],
  "created": "<ISO timestamp>"
}
```

### Step 4: Spawn Developers (Parallel)

Spawn up to 4 devs simultaneously. Each dev prompt includes:

```
Task(
  subagent_type="fullstack-developer",
  description="Team cook-{plan-slug}/dev-{N}: <scope>",
  prompt="""
You are dev-{N} on team "cook-{plan-slug}".

## Your Scope
{task_description}

## File Ownership (CRITICAL)
You ONLY modify files matching: {file_scope}
DO NOT touch files outside your scope.

## Protocol
1. Read .team/cook-{plan-slug}/tasks/dev-{N}.json
2. Write .team/cook-{plan-slug}/status/dev-{N}.json: {"status": "working"}
3. Implement your scope
4. Run type-check and build commands from AGENTS.md
5. Write implementation summary to .team/cook-{plan-slug}/messages/{seq}-dev-{N}-done.md
6. Write report to .team/cook-{plan-slug}/reports/dev-{N}-report.md
7. Update status: {"status": "done"}

## Plan Approval
Before implementing, write your plan to .team/cook-{plan-slug}/messages/{seq}-dev-{N}-plan.md
Then set status: {"status": "awaiting_approval", "plan": ".team/cook-{plan-slug}/messages/..."}
Wait for .team/cook-{plan-slug}/messages/approval-dev-{N}.md before proceeding.

Team Context:
- Work dir: {cwd}
- Team name: cook-{plan-slug}
- Team dir: {cwd}/.team/cook-{plan-slug}/
- Mode: LITE
- Your name: dev-{N}
- Your role: developer
"""
)
```

### Step 5: Plan Approval

Lead reads each dev's plan from `.team/cook-{plan-slug}/messages/`:
- If approved → write `.team/cook-{plan-slug}/messages/approval-dev-{N}.md` with "APPROVED"
- If rejected → write with "REJECTED: <feedback>"

### Step 6: Monitor & Spawn Tester

Wait for all `dev-*-report.md` files. Then spawn tester:

```
Task(
  subagent_type="tester",
  description="Team cook-{plan-slug}/tester: Run test suite",
  prompt="""
You are tester on team "cook-{plan-slug}".

## Task
Run full test suite. Validate all acceptance criteria.
Read .team/cook-{plan-slug}/reports/dev-*-report.md for what was implemented.

## Protocol
1. Run tests from AGENTS.md Worker Config
2. Write test results to .team/cook-{plan-slug}/reports/tester-report.md
3. Report pass/fail with evidence

Team Context:
- Work dir: {cwd}
- Team name: cook-{plan-slug}
- Team dir: {cwd}/.team/cook-{plan-slug}/
- Mode: LITE
- Your name: tester
- Your role: tester
"""
)
```

### Step 7: Synthesize & Report

Read all reports. Assess docs impact:

```
Docs impact: [none|minor|major]
Action: [no update needed] | [updated <page>] | [needs separate PR]
```

Cleanup `.team/cook-{plan-slug}/`. Report to user: what was built, test results, docs impact.
