# Template: Debug

`/hd-team debug <issue>` [--debuggers N]

Adversarial debugging — competing hypotheses, disprove to converge.

## Execution Steps

1. **GENERATE** N competing hypotheses from `<issue>` (default N=3):
   - Each hypothesis must be independently testable
   - Each must predict different observable symptoms
   - Frame as: "If <cause>, then we should see <evidence>"

2. **CALL** `TeamCreate(team_name: "debug-<issue-slug>")`

3. **CALL** `TaskCreate` x N — one per hypothesis:
   - Subject: `Debug: Test hypothesis — <theory>`
   - Description: `Investigate hypothesis: <theory>. For issue: <issue>. ADVERSARIAL: actively try to disprove other theories. Message other debuggers to challenge findings. Report evidence FOR and AGAINST your theory. Save findings to: plans/reports/debugger-{N}-<issue-slug>.md. Mark task completed when done.`

4. **CALL** `Task` x N to spawn debugger teammates:
   - `subagent_type: "debugger"`, `model: "sonnet"`, `name: "debugger-{N}"`
   - Prompt: task description + team context (peers, task summary)

5. **MONITOR** via TaskList polling. Debuggers should message each other — let them converge.
   - Check TaskList every 60s as hypotheses are tested
   - If debugger seems stuck, message them directly

6. **READ** all debugger reports. Identify surviving theory as root cause.

7. **WRITE** root cause report: `plans/reports/debug-<issue-slug>.md`
   Format: Root cause, evidence chain, disproven hypotheses, recommended fix.

8. **SHUTDOWN** all teammates via `SendMessage(type: "shutdown_request")`
   - If rejected: wait 30s, retry once

9. **CLEANUP**: `TeamDelete` (no parameters — only after all teammates idle)

10. **REPORT**: Tell user `Debug complete. Root cause: <summary>. Report: {path}.`
