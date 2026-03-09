# Args Specification: hd-estimation

**Version:** 2.0.0

---

## Overview

Optional `--audience` arg skips the interactive prompt. Useful for skill-to-skill composition.

**Mode is always `both`** (agent vs human-only dual-column). No mode or pricing args.

---

## Argument

```
--audience <internal|client>    Output audience (default: ask)
```

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
