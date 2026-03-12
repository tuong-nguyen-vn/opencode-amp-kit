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

### Step 2: Spawn Team

```
team_spawn(
  teamName: "review-{scope-slug}",
  template: "review",
  tasks: '[
    {"subject":"Review: Security","description":"...","owner":"reviewer-1","role":"reviewer"},
    {"subject":"Review: Performance","description":"...","owner":"reviewer-2","role":"reviewer"},
    {"subject":"Review: Test Coverage","description":"...","owner":"reviewer-3","role":"reviewer"}
  ]'
)
```

All tasks have owners + no blockers → status "in_progress" (set automatically by team_spawn).

### Step 3: Spawn Reviewers (Parallel)

```
Task(
  subagent_type="code-reviewer",
  description="Team review-{slug}/reviewer-{N}: <focus>",
  prompt="""
You are a code reviewer focusing on: {focus_description}

## Scope to Review
{scope_description}

## Protocol
- Rate findings by severity: CRITICAL | IMPORTANT | MODERATE
- Each finding must include:
  - Severity rating
  - Concrete evidence (file, line, code snippet)
  - Recommendation
- NO "seems" or "probably" — concrete evidence only

## Output
Return a structured report:
# Review: <focus>
## CRITICAL Findings
- [CRITICAL] <finding> — <evidence> — <recommendation>
## IMPORTANT Findings
## MODERATE Findings
## Summary

Work dir: {cwd}
"""
)
```

### Step 4: Complete Tasks

```
team_complete(
  teamName: "review-{slug}",
  results: '[
    {"taskId":"<id-1>","summary":"<return value>","report":"<full report>"},
    {"taskId":"<id-2>","summary":"<return value>","report":"<full report>"},
    {"taskId":"<id-3>","summary":"<return value>","report":"<full report>"}
  ]'
)
```

### Step 5: Synthesize

Read all reviewer reports. Deduplicate findings across reviewers.

Save to `plans/reports/review-{scope-slug}.md`:

```markdown
# Review: <Scope>
## Summary
{X} findings ({Y} critical, {Z} important, {W} moderate)
## CRITICAL Findings
## IMPORTANT Findings
## MODERATE Findings
## Action Items
| # | Finding | Owner | Priority |
```

### Step 6: Cleanup & Report

```
team_delete("review-{slug}")
```

Tell user: `Review complete. {X} findings ({Y} critical). Report: {path}.`
