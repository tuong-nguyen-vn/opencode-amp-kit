# Template: Review

`/hd-team review <scope>` [--reviewers N]

Parallel code review — security, performance, test coverage.

## Execution Steps

1. **DERIVE** N review focuses from `<scope>` (default N=3):
   - Focus 1: Security — vulnerabilities, auth, input validation, OWASP
   - Focus 2: Performance — bottlenecks, memory, complexity, scaling
   - Focus 3: Test coverage — gaps, edge cases, error paths
   - (If N>3, derive from scope: architecture, DX, accessibility, etc.)

2. **CALL** `TeamCreate(team_name: "review-<scope-slug>")`

3. **CALL** `TaskCreate` x N — one per focus:
   - Subject: `Review: <focus-title>`
   - Description: `Review <scope> for <focus>. Output severity-rated findings only. Format: [CRITICAL|IMPORTANT|MODERATE] <finding> — <evidence> — <recommendation>. No "seems" or "probably" — concrete evidence only. Save to: plans/reports/reviewer-{N}-<scope-slug>.md. Mark task completed when done.`

4. **CALL** `Task` x N to spawn reviewers:
   - `subagent_type: "code-reviewer"`, `model: "haiku"`, `name: "reviewer-{N}"`
   - Prompt: task description + team context (peers, task summary)

5. **MONITOR** via TaskList polling:
   - Check TaskList every 60s until all tasks completed

6. **SYNTHESIZE** into: `plans/reports/review-<scope-slug>.md`
   - Deduplicate findings across reviewers
   - Prioritize by severity: CRITICAL > IMPORTANT > MODERATE
   - Create action items list with owners

7. **SHUTDOWN** all teammates via `SendMessage(type: "shutdown_request")`
   - If rejected: wait 30s, retry once

8. **CLEANUP**: `TeamDelete` (no parameters — only after all teammates idle)

9. **REPORT**: Tell user `Review complete. {X} findings ({Y} critical). Report: {path}.`
