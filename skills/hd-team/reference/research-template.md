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

```
team_create(
  teamName: "research-{topic-slug}",
  template: "research",
  agents: '[{"name":"researcher-1","role":"researcher"},{"name":"researcher-2","role":"researcher"},{"name":"researcher-3","role":"researcher"}]'
)
```

### Step 3: Create Tasks

```
task_create(teamName: "research-{topic-slug}", subject: "Research: <angle>", description: "...", owner: "researcher-1")
task_create(teamName: "research-{topic-slug}", subject: "Research: <angle>", description: "...", owner: "researcher-2")
task_create(teamName: "research-{topic-slug}", subject: "Research: <angle>", description: "...", owner: "researcher-3")
```

All tasks have no blockedBy → status: "pending" automatically.

### Step 4: Spawn Researchers (Parallel)

```
# Get pending tasks
task_list(teamName: "research-{topic-slug}", status: "pending")

# For each pending task, claim + spawn:
task_update(teamName, taskId, status: "in_progress")

Task(
  subagent_type="researcher",
  description="Team research-{topic-slug}/researcher-{N}: <angle-title>",
  prompt="""
You are researcher-{N} on team "research-{topic-slug}".

## Your Angle
{angle_description}

## Custom Tools
- task_get("research-{topic-slug}", "{task-id}") → your assignment
- message_send("research-{topic-slug}", from:"researcher-{N}", to:"all", type:"finding", content:"...") → share findings
- message_fetch("research-{topic-slug}", to:"researcher-{N}") → read others' findings
- task_update("research-{topic-slug}", "{task-id}", status:"completed") → mark done

## Protocol
1. task_get to read your assignment
2. Research your angle thoroughly
3. message_send findings to team (type: "finding")
4. message_fetch to cross-pollinate with other researchers
5. Write final report to .team/research-{topic-slug}/reports/researcher-{N}-report.md
6. task_update status: "completed"

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
- Your name: researcher-{N}
- Your role: researcher
"""
)
```

### Step 5: Monitor

```
team_status("research-{topic-slug}")
# Check isComplete flag
```

### Step 6: Synthesize

Read all researcher reports from `.team/research-{topic-slug}/reports/`.

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

### Step 7: Cleanup

```
team_delete("research-{topic-slug}")
```

### Step 8: Report

Tell user: `Research complete. Summary: plans/reports/research-summary-{slug}.md. {N} reports generated.`
