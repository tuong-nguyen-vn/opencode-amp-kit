# Communication Protocol

## Custom Tools Communication

All inter-agent communication uses custom tools in `.opencode/tools/`. No external dependencies required.

### Worker Protocol

Each worker subagent follows this lifecycle:

```
1. task_get(teamName, taskId) → read assigned task
2. task_update(teamName, taskId, status: "in_progress", owner: agentName)
3. Execute task
4. message_send(teamName, from: name, to: "all", type: "finding", content: "...")
5. Write final report to .team/{teamName}/reports/{name}-report.md
6. task_update(teamName, taskId, status: "completed")
7. Return summary string to orchestrator
```

### Lead Protocol

```
1. team_create(teamName, template, agents)
2. task_create(...) × N  (with blockedBy dependencies)
3. Spawn loop (see SKILL.md core pattern)
4. Read .team/{teamName}/reports/ for synthesis
5. team_delete(teamName)
```

### Message Types

| Type | Use Case |
|------|----------|
| `message` | DM between agents |
| `broadcast` | All agents (to: "all") |
| `finding` | Share discovery with team |
| `blocker` | Report blocker to lead |
| `complete` | Notify task completion |

### Cross-Agent Reading

Workers can read other workers' findings:

```
message_fetch(teamName, to: myName)  → messages addressed to me + broadcasts
message_fetch(teamName, type: "finding") → all findings from all agents
```

This enables adversarial debate (debug template) and collaborative synthesis.

### Orchestrator Monitoring

```
team_status(teamName) → task summary, completion flag, report list
task_list(teamName, status: "pending") → tasks ready to spawn
task_list(teamName, status: "in_progress") → currently running tasks
```

Completion = `team_status.isComplete === true` (all tasks completed or cancelled).
