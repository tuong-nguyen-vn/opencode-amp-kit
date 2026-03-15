---
name: hd-worker
description: Execute beads autonomously within a track. Handles bead-to-bead context persistence via Agent Mail, uses preferred tools from AGENTS.md, and reports progress to orchestrator.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Worker Skill: Autonomous Bead Execution

Executes beads within an assigned track, maintaining context via Agent Mail.

> **Agent Mail CLI**: All `am` commands use JSON args, NOT flags:
> `am <cmd> '{"key": "value"}'` (correct) | `am <cmd> --key value` (wrong)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRACK LOOP (repeat for each bead in track)                                 │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                     │
│  │ START BEAD   │ → │ WORK ON BEAD │ → │ COMPLETE     │ ───┐                │
│  │              │   │              │   │ BEAD         │    │                │
│  │ • Read ctx   │   │ • Implement  │   │ • Report     │    │                │
│  │ • Reserve    │   │ • Use tools  │   │ • Save ctx   │    │                │
│  │ • Claim      │   │ • Check mail │   │ • Release    │    │                │
│  └──────────────┘   └──────────────┘   └──────────────┘    │                │
│         ▲                                                  │                │
│         └──────────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Mail: Optional

Agent Mail provides cross-bead context, file reservations, and orchestrator communication. It is **optional** — the worker executes beads without it.

### With Agent Mail (full mode)

All steps in Initial Setup and Bead Execution Loop apply as documented.

### Without Agent Mail (degraded mode)

Skip all `mcp__mcp_agent_mail__*` steps. Bead lifecycle runs via `br` only:

```
START:  br update <bead-id> --status in_progress
WORK:   implement → run type-check and build from AGENTS.md ## Worker Config
DONE:   br close <bead-id> --reason "<summary>"
NEXT:   loop to next bead
```

**What is lost without Agent Mail**:
- Cross-bead context (each bead starts cold — no previous learnings available)
- File conflict detection between parallel workers
- Orchestrator progress reports
- Inbox (can't receive blocker or interface-change notifications)

**Suitable for**: single-track epics, simple projects, or projects without Agent Mail MCP configured.

---

## Initial Setup (Once Per Track)

### 1. Register Agent Identity

**Tool**: `mcp__mcp_agent_mail__register_agent`

| Parameter          | Required | Value                     |
| ------------------ | -------- | ------------------------- |
| `project_key`      | Yes      | `<absolute-project-path>` |
| `program`          | Yes      | `opencode`                |
| `model`            | Yes      | `<your-model>`            |
| `task_description` | Yes      | `Track N: <description>`  |
| `name`             | No       | Auto-generated if omitted |

### 2. Establish Contact with Orchestrator (REQUIRED)

After registering, establish contact with the orchestrator to enable messaging.

**Tool**: `mcp__mcp_agent_mail__macro_contact_handshake`

| Parameter     | Value                    |
| ------------- | ------------------------ |
| `project_key` | `<path>`                 |
| `requester`   | `<YourAgentName>`        |
| `target`      | `<OrchestratorName>`     |
| `auto_accept` | `true`                   |

**Note**: The orchestrator should have already pre-established contact from their side, but this ensures bidirectional approval.

### 3. Understand Your Assignment

From orchestrator: **Track number**, **Beads (in order)**, **File scope**, **Epic thread** (`<epic-id>`), **Track thread** (`track:<AgentName>:<epic-id>`)

---

## Bead Execution Loop

### Step 1: Start Bead

#### 1.1 Read Context from Previous Bead

**Tool**: `mcp__mcp_agent_mail__summarize_thread`

| Parameter          | Value                         |
| ------------------ | ----------------------------- |
| `project_key`      | `<path>`                      |
| `thread_id`        | `track:<AgentName>:<epic-id>` |
| `include_examples` | `true`                        |

#### 1.2 Check Inbox

**Tool**: `mcp__mcp_agent_mail__fetch_inbox`

| Parameter        | Value         |
| ---------------- | ------------- |
| `project_key`    | `<path>`      |
| `agent_name`     | `<AgentName>` |
| `include_bodies` | `true`        |

#### 1.3 Reserve Files

**Tool**: `mcp__mcp_agent_mail__file_reservation_paths`

| Parameter     | Value                      |
| ------------- | -------------------------- |
| `project_key` | `<path>`                   |
| `agent_name`  | `<AgentName>`              |
| `paths`       | `["<your-file-scope>/**"]` |
| `ttl_seconds` | `7200`                     |
| `exclusive`   | `true`                     |
| `reason`      | `<bead-id>`                |

If conflict → report blocker (see `reference/message-templates.md`)

#### 1.4 Claim Bead

```bash
br update <bead-id> --status in_progress
br show <bead-id>
```

---

### Step 2: Work on Bead

#### 2.1 Explore Codebase

**Tool**: `finder`

Use `finder` for semantic/conceptual searches. Use `Grep` for exact text matches.

#### 2.2 Make Changes

**Tool**: `Edit`

| Parameter   | Value                                      |
| ----------- | ------------------------------------------ |
| `filePath`  | Absolute path to file                      |
| `oldString` | Exact text to replace (must match exactly) |
| `newString` | New text to replace with                   |

After edits: run the type-check command from `AGENTS.md ## Worker Config → Build Commands`.

#### 2.3 For UI Work

Check `AGENTS.md ## Worker Config → UI Stack` for:
- Which component library to use
- Which skill to load before UI work (if any)
- Use MCP tools configured in the project (e.g., `mcp__shadcn__*` for shadcn/ui if available)

If no `### UI Stack` section is defined in AGENTS.md, no UI-specific tooling is needed for this project — implement using standard tools.

#### 2.4 Check Inbox Periodically

Use `mcp__mcp_agent_mail__fetch_inbox` with `since_ts` parameter.

#### 2.5 If Blocker or Interface Change

See `reference/message-templates.md` for message formats.

---

### Step 3: Complete Bead

#### 3.1 Verify & Check

```
Run commands from AGENTS.md ## Worker Config → Build Commands:
- Type check command
- Build command
```

**Amp**: Also run `get_diagnostics` on changed files/directories to catch errors and warnings.

*(If `get_diagnostics` is unavailable, rely on build commands from AGENTS.md)*

#### 3.2 Close Bead

```bash
br close <bead-id> --reason "<concise summary>"
```

#### 3.2.5 Changelog Reminder (Optional)

After successfully closing the bead:

💡 **Reminder**: Don't forget to update the changelog!

Add an entry to CHANGELOG.md summarizing the work done for this bead. This can also be deferred until epic completion.

*(This is a reminder only, not required for bead completion)*

#### 3.3 Report to Orchestrator

**Tool**: `mcp__mcp_agent_mail__send_message`

| Parameter     | Value                                |
| ------------- | ------------------------------------ |
| `project_key` | `<path>`                             |
| `sender_name` | `<AgentName>`                        |
| `to`          | `["<OrchestratorName>"]`             |
| `thread_id`   | `<epic-id>`                          |
| `subject`     | `[<bead-id>] COMPLETE`               |
| `body_md`     | See `reference/message-templates.md` |

#### 3.4 Save Context for Next Bead

Self-addressed message to track thread. See `reference/message-templates.md`.

#### 3.5 Release Reservations

**Tool**: `mcp__mcp_agent_mail__release_file_reservations`

| Parameter     | Value         |
| ------------- | ------------- |
| `project_key` | `<path>`      |
| `agent_name`  | `<AgentName>` |

---

### Step 4: Continue to Next Bead

Loop back to Step 1. Context from Step 3.4 available via track thread.

---

## Track Completion

When all beads done, send track complete message (see `reference/message-templates.md`), then return:

```
Track N (<AgentName>) Complete:
- Completed beads: a, b, c
- Summary: <what was built>
- All acceptance criteria met
```

---

## Quick Reference

### Bead Lifecycle Checklist

```
SETUP: register_agent → macro_contact_handshake (with orchestrator)
START: summarize_thread → fetch_inbox → file_reservation_paths → br update
WORK:  finder → Edit → get_diagnostics / build commands → check inbox
DONE:  verify → br close → send_message (orchestrator) → send_message (self) → release
NEXT:  loop to START
```

> **No Agent Mail?** Skip all `mcp__mcp_agent_mail__*` steps. Use `br` only: update → work → close → loop.

### Thread Reference

| Thread                        | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `<epic-id>`                   | Cross-agent, orchestrator communication |
| `track:<AgentName>:<epic-id>` | Your personal context persistence       |

### Tool Reference

| Task                 | Tool                                      |
| -------------------- | ----------------------------------------- |
| Find code            | `finder`                                  |
| Edit files           | `Edit`                                    |
| Check diagnostics    | `get_diagnostics` or build commands       |
| UI component tools   | MCP tools from project config (if avail.) |

---

## Additional Resources

- **Message Templates**: `reference/message-templates.md` for all Agent Mail message formats
