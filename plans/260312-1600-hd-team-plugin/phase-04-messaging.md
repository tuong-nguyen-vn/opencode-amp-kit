# Phase 4: Message Tools

## Overview
- **Priority**: P2 | **Effort**: 2h

Inter-agent messaging in `.opencode/tools/message.ts`. 2 tools.

## Tools

### `message_send`
```
Args: teamName, from, to (agent name or "all"), type, content
Logic:
  1. Auto-generate ID (msg-001, msg-002, ...)
  2. Write .team/{teamName}/messages/{id}.json
  3. Return message confirmation
```

### `message_fetch`
```
Args: teamName, to? (filter by recipient), type?, since? (ISO timestamp)
Logic:
  1. Read all .json in .team/{teamName}/messages/
  2. Filter: include messages where to == arg OR to == "all"
  3. Filter by type if provided
  4. Filter by since if provided
  5. Return sorted by created timestamp
```

## Message Types

| Type | Use Case |
|------|----------|
| `message` | DM between agents |
| `broadcast` | All agents (to: "all") |
| `finding` | Share discovery with team |
| `blocker` | Report blocker to lead |
| `complete` | Notify task completion |

## Success Criteria
- [x] 2 tools exported from message.ts
- [x] Broadcast visible to all, DM visible to sender + recipient
- [x] Chronological ordering with since filter
- [x] Enum validation on type arg
