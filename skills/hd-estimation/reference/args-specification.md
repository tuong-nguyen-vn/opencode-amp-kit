# Args Specification: hd-estimation

**Version:** 2.1.0

---

## Overview

Optional `--audience` arg skips only the audience question. Storage location is intentionally resolved via interactive startup questions.

**Output mode is always `triple`** (`eta.md` client-safe + `eta-agent.md` transparent agent + `eta-agent-human.md` comparison). No mode or pricing args.

Storage scope is decided interactively at runtime:
- `workspace` → save under current `<dir>/plans/...`
- `general` → save under `<base>/plans/...`, where `<base>` resolves from `HD_HOME` → `~/.hd/config.yaml: hd_data_dir` → `~/.hd`

---

## Argument

```
--audience <internal|client>    Output audience (default: ask)
```

No storage-location args by design. The skill asks a friendly startup question instead.

**Values:**
- `internal` — technical language, concise, skip explanatory sections
- `client` — professional tone, explain trade-offs, detailed rationale

**Default:** If not provided, prompted interactively.

---

## Natural Language Parsing

Detect from conversational input (confidence ≥ 70% required):

- Internal keywords: "internal", "team", "planning", "ourselves"
- Client keywords: "client", "proposal", "customer", "external"

Below 70% → fall back to interactive prompt.

---

## Examples

```bash
# Shell-style
skill("estimation", args: "--audience client")
skill("estimation", args: "--audience internal")

# Natural language
skill("estimation", args: "for client proposal")      # → audience=client
skill("estimation", args: "internal team planning")   # → audience=internal

# No args (fully interactive)
skill("estimation")
```

---

## Skill Composition

```bash
# From hd-brainstorming after consensus:
skill("estimation", args: "--audience client")
```
