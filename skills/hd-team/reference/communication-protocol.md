# Communication Protocol

## Mode Detection

At team creation, detect available communication infrastructure:

```bash
# Check if Agent Mail MCP is available
am --version 2>/dev/null && AM_AVAILABLE=true || AM_AVAILABLE=false
```

| Agent Mail | Mode | Communication |
|------------|------|---------------|
| Available | **FULL** | Agent Mail MCP + file status |
| Unavailable | **LITE** | File-based `.team/<team-name>/` directory only |

## LITE Mode (File-Based — Always Available)

### Directory Structure

```
.team/<team-name>/
├── config.json
│   {
│     "team_name": "<team-name>",
│     "template": "research|cook|review|debug",
│     "mode": "LITE",
│     "created": "<ISO timestamp>",
│     "agents": [
│       {"name": "researcher-1", "role": "researcher", "status": "active"}
│     ]
│   }
├── tasks/
│   └── task-001.json
│       {
│         "id": "task-001",
│         "subject": "Research: Architecture patterns",
│         "description": "Full task description...",
│         "status": "pending|in_progress|completed",
│         "owner": null | "researcher-1",
│         "blockedBy": [],
│         "created": "<ISO timestamp>",
│         "updated": "<ISO timestamp>"
│       }
├── messages/
│   └── 001-researcher-1-findings.md
│       # Messages are markdown files
│       # Naming: {seq}-{sender}-{subject-slug}.md
│       # All agents can read all messages (shared inbox)
├── status/
│   └── researcher-1.json
│       {
│         "agent": "researcher-1",
│         "status": "working|idle|done|error",
│         "current_task": "task-001",
│         "last_update": "<ISO timestamp>",
│         "progress": "Analyzing architecture patterns..."
│       }
└── reports/
    └── researcher-1-report.md
        # Final deliverable. Presence = task complete.
```

### Worker Protocol (LITE)

Each worker subagent follows this lifecycle:

```
1. Read .team/<team-name>/tasks/ → find assigned task
2. Write .team/<team-name>/status/{name}.json (status: "working")
3. Execute task
4. Write findings to .team/<team-name>/messages/{seq}-{name}-{slug}.md
5. Write final report to .team/<team-name>/reports/{name}-report.md
6. Update .team/<team-name>/status/{name}.json (status: "done")
7. Return summary string to orchestrator
```

### Cross-Agent Reading (LITE)

Workers CAN read other workers' messages:

```
# Worker reads messages from other agents for context
Read .team/<team-name>/messages/  → list all messages
Read .team/<team-name>/messages/001-debugger-2-hypothesis.md → read specific finding
```

This enables adversarial debate (debug template) and collaborative synthesis.

### Orchestrator Monitoring (LITE)

```
# Poll every 30s
ls .team/<team-name>/reports/    → count completed reports
ls .team/<team-name>/status/     → check for stuck agents
cat .team/<team-name>/status/*.json | jq '.status' → aggregate status
```

Completion = all expected report files present.

## FULL Mode (Agent Mail + File Status)

Extends LITE with Agent Mail MCP for richer messaging.

### Additional Setup

```bash
# Register orchestrator
am register_agent '{"project_key": "<path>", "program": "amp", "model": "<model>", "task_description": "Team orchestrator"}'

# Pre-establish contacts with all workers
am macro_contact_handshake '{"project_key": "<path>", "requester": "lead", "target": "researcher-1", "auto_accept": true}'
```

### Worker Protocol (FULL)

Extends LITE protocol with Agent Mail messaging:

```
1. Register with Agent Mail: mcp__mcp_agent_mail__register_agent
2. Establish contact: mcp__mcp_agent_mail__macro_contact_handshake
3. Read .team/<team-name>/tasks/ → find assigned task
4. Update status via both Agent Mail + .team/<team-name>/status/
5. Send progress messages via Agent Mail
6. Check inbox periodically: mcp__mcp_agent_mail__fetch_inbox
7. Write report to .team/<team-name>/reports/ (same as LITE)
8. Send completion message via Agent Mail
```

### Message Types (FULL)

| Type | From | To | Purpose |
|------|------|-----|---------|
| Progress | Worker | Orchestrator | Status update |
| Finding | Worker | All workers | Shared discovery |
| Blocker | Worker | Orchestrator | Needs help |
| Interface | Worker | Affected workers | API change |
| Complete | Worker | Orchestrator | Task done |

## Comparison

| Feature | LITE | FULL |
|---------|------|------|
| Always available | Yes | No (needs MCP) |
| Cross-agent messages | File read | Real-time inbox |
| File reservations | Convention-based | MCP-enforced |
| Progress monitoring | File polling | Inbox + polling |
| Setup complexity | None | MCP registration |
| Debugging | Read files | CLI + files |
