# Research Template

## Protocol: `hd-team research <topic> [--researchers N]`

### Step 1: Derive Angles

Default N=3. Derive from topic:

| Angle | Focus |
|-------|-------|
| 1 | Architecture, patterns, proven approaches |
| 2 | Alternatives, competing solutions, trade-offs |
| 3 | Risks, edge cases, failure modes, security |
| 4+ | Additional angles derived from topic context |

### Step 2: Spawn Team

Generate team name: `research-{topic-slug}` (kebab-case).

```
team_spawn(
  teamName: "research-{topic-slug}",
  template: "research",
  tasks: '[
    {"subject":"Research: <angle-1>","description":"...","owner":"researcher-1","role":"researcher"},
    {"subject":"Research: <angle-2>","description":"...","owner":"researcher-2","role":"researcher"},
    {"subject":"Research: <angle-3>","description":"...","owner":"researcher-3","role":"researcher"}
  ]'
)
```

All tasks have no blockedBy → status: "in_progress" (since owners assigned).

### Step 3: Spawn Researchers (Parallel)

For each in_progress task from team_spawn response:

```
Task(
  subagent_type="researcher",
  description="Team research-{topic-slug}/researcher-{N}: <angle-title>",
  prompt="""
You are a researcher investigating: {angle_description}

## Task
{full_task_description}

## Output
Return a structured summary:
- Executive Summary (2-3 sentences)
- Key Findings (numbered, evidence-based)
- Evidence & Sources
- Recommendations
- Open Questions

Work dir: {cwd}
"""
)
```

### Step 4: Complete Tasks

Parse all Task return values, then:

```
team_complete(
  teamName: "research-{topic-slug}",
  results: '[
    {"taskId":"<id-1>","summary":"<return value from researcher-1>","report":"<full report>"},
    {"taskId":"<id-2>","summary":"<return value from researcher-2>","report":"<full report>"},
    {"taskId":"<id-3>","summary":"<return value from researcher-3>","report":"<full report>"}
  ]'
)
```

### Step 5: Synthesize

Read reports from `.team/research-{topic-slug}/reports/`.

Save to `plans/reports/research-summary-{YYMMDD-HHMM}-{topic-slug}.md`:

```markdown
# Research Summary: <Topic>
## Executive Summary
## Key Findings
## Comparative Analysis
## Recommendations
## Unresolved Questions
## Sources
```

### Step 6: Cleanup

```
team_delete("research-{topic-slug}")
```

### Step 7: Report

Tell user: `Research complete. Summary: plans/reports/research-summary-{slug}.md. {N} reports generated.`
