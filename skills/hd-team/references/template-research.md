# Template: Research

`/hd-team research <topic>` [--researchers N]

Parallel research with N angles — architecture, alternatives, risks.

## Execution Steps

1. **Derive N angles** from `<topic>` (default N=3):
   - Angle 1: Architecture, patterns, proven approaches
   - Angle 2: Alternatives, competing solutions, trade-offs
   - Angle 3: Risks, edge cases, failure modes, security
   - (If N>3, derive additional angles from topic context)

2. **CALL** `TeamCreate(team_name: "<topic-slug>")`

3. **CALL** `TaskCreate` x N — one per angle:
   - Subject: `Research: <angle-title>`
   - Description: `Investigate <angle> for topic: <topic>. Save report to: plans/reports/researcher-{N}-<topic-slug>.md. Format: Executive summary, key findings, evidence, recommendations. Mark task completed when done. Send findings summary to lead.`

4. **CALL** `Task` x N to spawn researcher teammates:
   - `subagent_type: "researcher"`, `team_name: "<topic-slug>"`, `model: "haiku"`
   - `name: "researcher-{N}"`
   - Prompt: task description + team context (peers, task summary)

5. **MONITOR** via TaskList polling:
   - Check TaskList every 60s until all tasks completed
   - If stuck >5 min, message teammate directly

6. **READ** all researcher reports from `plans/reports/`

7. **SYNTHESIZE** into: `plans/reports/research-summary-<topic-slug>.md`
   Format: exec summary, key findings, comparative analysis, recommendations, unresolved questions.

8. **SHUTDOWN**: `SendMessage(type: "shutdown_request")` to each teammate
   - If rejected: wait 30s for teammate to finish current operation, retry once

9. **CLEANUP**: `TeamDelete` (no parameters — only after all teammates idle)

10. **REPORT**: Tell user `Research complete. Summary: {path}. N reports generated.`

## Relationship to hd-brainstorming

- `/hd-team research` = **parallel multi-session** research (multiple agents each explore one angle)
- `/hd-brainstorming` = **interactive single-session** brainstorming (phases: context → framing → ideation → debate → report)
- For deep research needing multiple angles simultaneously → use `/hd-team research`
- For interactive ideation with user debate → use `/hd-brainstorming`
- Can chain: `/hd-team research` first, then feed results into `/hd-brainstorming` for debate
