# Review Template

## Protocol: `hd-team review <scope> [--reviewers N]`

### Step 1: Derive Review Focuses

Default N=3:

| Focus | Area |
|-------|------|
| 1 | Security — vulnerabilities, auth, input validation, OWASP |
| 2 | Performance — bottlenecks, memory, complexity, scaling |
| 3 | Test coverage — gaps, edge cases, error paths |
| 4+ | Derive from scope: architecture, DX, accessibility |

### Step 2: Create Team

Generate team name: `review-{scope-slug}` (kebab-case).

```bash
mkdir -p .team/review-{scope-slug}/{tasks,messages,status,reports}
```

Write `.team/review-{scope-slug}/config.json`:
```json
{
  "team_name": "review-{scope-slug}",
  "template": "review",
  "mode": "LITE",
  "created": "<ISO timestamp>",
  "agents": [
    {"name": "reviewer-1", "role": "reviewer", "status": "active"}
  ]
}
```

### Step 3: Create Tasks

Write `.team/review-{scope-slug}/tasks/reviewer-{N}.json` for each reviewer:
```json
{
  "id": "reviewer-001",
  "subject": "Review: <focus-title>",
  "description": "Review <scope> for <focus>...",
  "status": "pending",
  "owner": "reviewer-{N}",
  "blockedBy": [],
  "created": "<ISO timestamp>"
}
```

### Step 4: Spawn Reviewers (Parallel)

```
Task(
  subagent_type="code-reviewer",
  description="Team review-{scope-slug}/reviewer-{N}: <focus>",
  prompt="""
You are reviewer-{N} on team "review-{scope-slug}".

## Your Focus
{focus_description}

## Scope to Review
{scope_description}

## Protocol
1. Read .team/review-{scope-slug}/tasks/reviewer-{N}.json
2. Write .team/review-{scope-slug}/status/reviewer-{N}.json: {"status": "working"}
3. Review the scope for your specific focus area
4. Rate findings by severity: CRITICAL | IMPORTANT | MODERATE
5. Each finding must include:
   - Severity rating
   - Concrete evidence (file, line, code snippet)
   - Recommendation
6. NO "seems" or "probably" — concrete evidence only
7. Write report to .team/review-{scope-slug}/reports/reviewer-{N}-report.md
8. Update .team/review-{scope-slug}/status/reviewer-{N}.json: {"status": "done"}

## Report Format
# Review: <focus>
## CRITICAL Findings
- [CRITICAL] <finding> — <evidence> — <recommendation>
## IMPORTANT Findings
- [IMPORTANT] <finding> — <evidence> — <recommendation>
## MODERATE Findings
- [MODERATE] <finding> — <evidence> — <recommendation>
## Summary
{total_findings} findings ({critical} critical, {important} important)

Team Context:
- Work dir: {cwd}
- Team name: review-{scope-slug}
- Team dir: {cwd}/.team/review-{scope-slug}/
- Mode: LITE
- Your name: reviewer-{N}
- Your role: reviewer
"""
)
```

### Step 5: Monitor

Wait for all `reviewer-*-report.md` files.

### Step 6: Synthesize

Read all reviewer reports. Deduplicate findings across reviewers.

Save to `plans/reports/review-{scope-slug}.md`:

```markdown
# Review: <Scope>

## Summary
{X} findings ({Y} critical, {Z} important, {W} moderate)

## CRITICAL Findings
1. <finding> — <evidence> — <recommendation> (reviewer-{N})

## IMPORTANT Findings
1. <finding> ...

## MODERATE Findings
1. <finding> ...

## Action Items
| # | Finding | Owner | Priority |
|---|---------|-------|----------|
```

### Step 7: Cleanup & Report

```bash
rm -rf .team/review-{scope-slug}/
```

Tell user: `Review complete. {X} findings ({Y} critical). Report: {path}.`
