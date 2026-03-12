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

```
team_create(
  teamName: "review-{scope-slug}",
  template: "review",
  agents: '[{"name":"reviewer-1","role":"reviewer"},{"name":"reviewer-2","role":"reviewer"},{"name":"reviewer-3","role":"reviewer"}]'
)
```

### Step 3: Create Tasks

```
task_create(teamName: "review-{slug}", subject: "Review: Security", description: "...", owner: "reviewer-1")
task_create(teamName: "review-{slug}", subject: "Review: Performance", description: "...", owner: "reviewer-2")
task_create(teamName: "review-{slug}", subject: "Review: Test Coverage", description: "...", owner: "reviewer-3")
```

All tasks pending (no dependencies).

### Step 4: Spawn Reviewers (Parallel)

```
pending = task_list("review-{slug}", status: "pending")

for each task:
  task_update(teamName, task.id, status: "in_progress")

Task(
  subagent_type="code-reviewer",
  description="Team review-{slug}/reviewer-{N}: <focus>",
  prompt="""
You are reviewer-{N} on team "review-{slug}".

## Your Focus
{focus_description}

## Scope to Review
{scope_description}

## Custom Tools
- task_get("review-{slug}", "{task-id}") → your assignment
- task_update("review-{slug}", "{task-id}", status:"completed") → mark done
- message_send("review-{slug}", from:"reviewer-{N}", to:"all", type:"finding", content:"...") → share findings

## Protocol
1. task_get for your assignment
2. Review the scope for your specific focus area
3. Rate findings by severity: CRITICAL | IMPORTANT | MODERATE
4. Each finding must include:
   - Severity rating
   - Concrete evidence (file, line, code snippet)
   - Recommendation
5. NO "seems" or "probably" — concrete evidence only
6. Write report to .team/review-{slug}/reports/reviewer-{N}-report.md
7. task_update status: "completed"

## Report Format
# Review: <focus>
## CRITICAL Findings
- [CRITICAL] <finding> — <evidence> — <recommendation>
## IMPORTANT Findings
## MODERATE Findings
## Summary

Team Context:
- Work dir: {cwd}
- Team name: review-{slug}
- Your name: reviewer-{N}
- Your role: reviewer
"""
)
```

### Step 5: Monitor

```
team_status("review-{slug}")
# Wait for isComplete
```

### Step 6: Synthesize

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

### Step 7: Cleanup & Report

```
team_delete("review-{slug}")
```

Tell user: `Review complete. {X} findings ({Y} critical). Report: {path}.`
