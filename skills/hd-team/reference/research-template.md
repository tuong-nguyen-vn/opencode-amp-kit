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

### Step 2: Create Team

Generate team name: `research-{topic-slug}` (kebab-case).

```bash
mkdir -p .team/research-{topic-slug}/{tasks,messages,status,reports}
```

Write `.team/research-{topic-slug}/config.json`:
```json
{
  "team_name": "research-{topic-slug}",
  "template": "research",
  "mode": "LITE",
  "created": "<ISO timestamp>",
  "agents": [
    {"name": "researcher-1", "role": "researcher", "status": "active"},
    {"name": "researcher-2", "role": "researcher", "status": "active"},
    {"name": "researcher-3", "role": "researcher", "status": "active"}
  ]
}
```

### Step 3: Create Tasks

Write `.team/research-{topic-slug}/tasks/task-{N}.json` for each researcher:
```json
{
  "id": "task-001",
  "subject": "Research: <angle-title>",
  "description": "Investigate <angle> for topic: <topic>. Save report to .team/research-{topic-slug}/reports/researcher-{N}-report.md. Format: Executive summary, key findings, evidence, recommendations.",
  "status": "pending",
  "owner": "researcher-{N}",
  "blockedBy": [],
  "created": "<ISO timestamp>"
}
```

### Step 4: Spawn Researchers (Parallel)

Spawn N researchers simultaneously via Task tool:

```
Task(
  subagent_type="researcher",
  description="Team research-{topic-slug}/researcher-{N}: <angle-title>",
  prompt="""
You are researcher-{N} on team "research-{topic-slug}".

## Your Angle
{angle_description}

## Protocol
1. Read .team/research-{topic-slug}/tasks/task-{N}.json for your assignment
2. Write .team/research-{topic-slug}/status/researcher-{N}.json: {"status": "working"}
3. Research your angle thoroughly using available tools
4. Write findings to .team/research-{topic-slug}/messages/{seq}-researcher-{N}-findings.md
5. Read .team/research-{topic-slug}/messages/ for other researchers' findings (cross-pollinate)
6. Write final report to .team/research-{topic-slug}/reports/researcher-{N}-report.md
7. Update .team/research-{topic-slug}/status/researcher-{N}.json: {"status": "done"}

## Report Format
# Research: <angle-title>
## Executive Summary (2-3 sentences)
## Key Findings (numbered, evidence-based)
## Evidence & Sources
## Recommendations
## Open Questions

Team Context:
- Work dir: {cwd}
- Team name: research-{topic-slug}
- Team dir: {cwd}/.team/research-{topic-slug}/
- Mode: LITE
- Your name: researcher-{N}
- Your role: researcher
"""
)
```

### Step 5: Monitor

Wait for all `researcher-*-report.md` files in `.team/research-{topic-slug}/reports/`.

```bash
# Check completion
ls .team/research-{topic-slug}/reports/researcher-*-report.md | wc -l
# Expected: N
```

### Step 6: Synthesize

Read all researcher reports. Create synthesis:

Save to `plans/reports/research-summary-{YYMMDD-HHMM}-{topic-slug}.md`:

```markdown
# Research Summary: <Topic>

## Executive Summary
<Synthesis of all findings>

## Key Findings
<Merged, deduplicated findings from all angles>

## Comparative Analysis
<Cross-angle insights>

## Recommendations
<Prioritized recommendations>

## Unresolved Questions
<Questions that remain open>

## Sources
- Researcher 1: <angle 1>
- Researcher 2: <angle 2>
- Researcher 3: <angle 3>
```

### Step 7: Cleanup

```bash
rm -rf .team/research-{topic-slug}/
```

### Step 8: Report

Tell user: `Research complete. Summary: plans/reports/research-summary-{slug}.md. {N} reports generated.`
