---
name: hd-docs-sync
description: Sync project docs from recent work. Discovers changes via git history and history/ folder entries, then surgically updates relevant docs. Use after completing epics, finishing features, or when docs feel stale.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Documentation Sync

Keeps project docs current by extracting knowledge from git history and workflow `history/` entries, then applying surgical updates.

## Pipeline

```
REQUEST → ASK → COLLECT → VERIFY → MAP → RECONCILE → APPLY → STANDARDS DELTA
```

| Phase              | Action                                  | Tools (Amp / Claude)                                          |
| ------------------ | --------------------------------------- | ------------------------------------------------------------- |
| 1. Ask             | Scope + start date from user            | (interactive)                                                 |
| 2. Collect         | git log + history/ + plans/ (parallel)  | `Bash`, `Glob`, `Read`, `oracle` (Amp) / `Plan` subagent (Claude) |
| 3. Verify          | Ground topics in code                   | `finder` (Amp) / `Explore` subagent (Claude)                  |
| 4. Map             | Auto-detect target docs                 | `finder` (Amp) / `Explore` subagent (Claude)                  |
| 5. Reconcile       | Topics vs code vs docs                  | `oracle` (Amp) / `Plan` subagent (Claude)                     |
| 6. Apply           | Surgical updates                        | `edit_file` (Amp) / `Edit` (Claude), `create_file` (Amp) / `Write` (Claude) |
| 7. Standards Delta | Compare base vs project standards; offer create or diff+suggest | `Read`, `AskUserQuestion`, `Edit` / `Write` (Claude) |

## Phase 1: Ask

Two questions before starting:

1. **Scope** — What to sync? (topic name, feature, or "all recent work")
2. **Since** — Start date? (e.g. `2026-02-10`, `last 2 weeks`, `since the auth refactor`)

Parse date to ISO format for git commands.

## Phase 2: Collect

Run three streams in parallel, then synthesize.

### Stream A — Git History

```bash
# Commit messages (topics)
git log --since="<date>" --oneline --no-merges

# Changed file paths (doc-target signals)
git log --since="<date>" --name-only --no-merges --pretty=format:""
```

Extract from output:
- Commit message keywords → topic names
- File paths → which doc targets to consider (see Phase 4)

### Stream B — History Folder

```bash
# Find all entries in date range
# Entries follow naming: history/YYYYMMDD-<topic>/
```

1. `Glob` all `history/*/` folders
2. Filter: keep entries where `YYYYMMDD` prefix >= start date
3. `Read` all `.md` files in each matching entry:

| File | Signals |
| ---- | ------- |
| `brainstorm.md` | Decisions, approaches, trade-offs |
| `discovery.md` | Technical findings, constraints |
| `execution-plan.md` | What was planned |
| `verification-report.md` | What was confirmed done (✅ = completed) |

### Stream C — Plans Folder

1. `Glob` all `plans/*/` folders
2. Filter by date prefix >= start date
3. `Read` any `.md` files found

### Synthesis

`oracle` (Amp) / `Plan` subagent (Claude) clusters all three streams into a unified topic list.
See `reference/collection-prompts.md` → **Stream Synthesis Prompt**.

## Phase 3: Verify Against Code

For each topic, confirm it exists in the codebase:

```
finder (Amp) / Explore subagent (Claude): "Verify: '<topic claim>'"
→ Grep/glob for changed symbols, files, patterns
```

| Claim | Verification |
| ----- | ------------ |
| "Added X" | `finder` (Amp) / `Explore` (Claude) "X" in codebase |
| "Refactored Y" | `finder` (Amp) / `Explore` (Claude) current state of Y |
| "Changed pattern" | `finder` (Amp) / `Explore` (Claude) for pattern usage |
| "Updated config" | `finder` (Amp) / `Explore` (Claude) config file paths |

**Code is truth.** If not found: mark as `"planned"` or `"historical"` — do not document as current.

See `reference/collection-prompts.md` → **Code Verification Prompt**.

## Phase 4: Map to Docs (Auto-detect)

Discover existing documentation before choosing targets:

```
finder (Amp) / Explore subagent (Claude): "topic keyword in existing docs"
finder (Amp) / Explore subagent (Claude): "AGENTS.md structure and sections"
```

Use file-change signals from Stream A to auto-target:

| Changed Area | Primary Target | Secondary |
| ------------ | -------------- | --------- |
| Core architecture / modules | `AGENTS.md` | `docs/ARCHITECTURE.md` |
| CLI commands | `AGENTS.md` commands table | `README.md` |
| Patterns / conventions | `AGENTS.md` patterns section | Relevant `SKILL.md` |
| Config / setup | `README.md` | `docs/INSTALL.md` |
| Skills / workflows | Relevant `SKILL.md` | `AGENTS.md` |
| Release-worthy changes | `CHANGELOG.md` | — |
| SDK / public API | Package-level `AGENTS.md` | — |
| Troubleshooting insight | `docs/TROUBLESHOOTING.md` | — |
| Auth / PII / payment / compliance changes | `SECURITY_STANDARDS.md` (suggest review only) | — |
| Code style / patterns / convention changes | `docs/CODING_STANDARDS.md` — suggest review only | — |

> **CLAUDE.md**: This file is a short pointer to `AGENTS.md` and rarely needs updating. Only touch it if the project structure changes significantly (e.g., AGENTS.md is moved or renamed).
>
> **CLAUDE.md Handling Rules:**
> | Situation | Action |
> | --------- | ------ |
> | CLAUDE.md missing | Offer to create (same as Standards Delta sub-flow A) |
> | CLAUDE.md exists, already references `AGENTS.md` | Skip — no-op |
> | CLAUDE.md exists, does not reference `AGENTS.md` | Read first, append a minimal pointer block at the bottom — preserve all existing content |

See `reference/doc-mapping.md` for full conventions.

## Phase 5: Reconcile

`oracle` (Amp) / `Plan` subagent (Claude) compares three sources:

```
1. TOPICS: [verified topic list]
2. CODE:   [current state from finder / Explore]
3. DOCS:   [existing doc content]
```

Output:
- **GAPS** — topics not documented anywhere
- **STALE** — docs that contradict current code
- **UPDATES** — `[{file, action, section, content, rationale}]`

See `reference/collection-prompts.md` → **Reconciliation Prompt**.

## Phase 6: Apply

Read each target doc first, then edit:

```
Read → understand structure, voice, existing sections
edit_file (Amp) / Edit (Claude) → surgical changes only (preserve style and tone)
create_file (Amp) / Write (Claude) → only for brand-new doc files
```

For multiple unrelated files: spawn parallel `Task` per file.

**Never wholesale replace** — extend, update sections, or add new ones.

### Standards Delta Check

→ See **Phase 7** below. Runs automatically after Apply.

## Phase 7: Standards Delta Check

Runs at end of every `hd-docs-sync` execution — after Phase 6, independent of topic detection.
Checks both standards pairs. If no delta on either: silent.

### Standards pairs

| Base (read-only) | Project target |
| ---------------- | -------------- |
| `skills/hd-security-review/SECURITY_STANDARDS.md` | `docs/SECURITY_STANDARDS.md` |
| `skills/hd-code-review/CODING_STANDARDS.md` | `docs/CODING_STANDARDS.md` |

For each pair, run Sub-flow A or B:

### Sub-flow A: Project file missing → offer to create

```
> No docs/SECURITY_STANDARDS.md found.
> Base standard lives in .claude/ (hidden from workspace).
> Create docs/SECURITY_STANDARDS.md to make it visible and editable in your project? (y/n)
```

On **yes**: `Read` base file → extract the project override scaffold (schema section) →
`Write` `docs/SECURITY_STANDARDS.md` with the scaffold as a starting template
(blank `applicable_compliance` list + empty `project_rules` array, with inline comments).

On **no**: skip silently.

### Sub-flow B: Project file exists → semantic diff + suggest

1. `Read` base file → extract semantic units (section rule titles + first sentence)
2. `Read` project file → extract same
3. Identify: units in base **not referenced** in project (by section heading match)
4. If delta empty → silent
5. If delta found → present as numbered list, short labels:

```
> Base SECURITY_STANDARDS.md has 2 new points not in your project standard:
>   [1] §3.9 Logging: audit logs must be tamper-evident
>   [2] §4 CRITICAL gate: Zero compliance violations check
> Add any to docs/SECURITY_STANDARDS.md? (1, 2, all, skip)
```

On approval: `Read` project file → `Edit` to append confirmed points under a
`## Additions from base standard` heading.

Manual edit always allowed — developer may prefer to copy-paste directly.

### Semantic parse rules

| Standards file | Parse units as |
| -------------- | -------------- |
| `SECURITY_STANDARDS.md` | Section 3.x rule headings + Section 4 CRITICAL gate table rows |
| `CODING_STANDARDS.md` | Section 2.x bullet-point groups (2.2, 2.3) + Section 3.x policy names |

Match criterion: project file contains the **section heading** (e.g. `3.9` or `Logging`) →
consider that rule "present". No deep content comparison needed.

### Never auto-write

Both sub-flows require explicit developer confirmation before any write.
Developer can always skip or edit manually instead.

---

## Concrete Example

User: "Sync docs for the estimation enhancements from last 2 weeks"

```
1. Ask:
   Scope: "estimation enhancements"
   Since: "2026-02-10"

2. Collect (parallel):
   Git:     12 commits, touched skills/hd-estimation/**
   History: history/20260210-estimation-enhancements/ → 5 .md files read
   Plans:   plans/20260210-*/ → no .md files found

3. oracle (Amp) / Plan subagent (Claude) synthesizes:
   → Topic: "Dual-column estimation format" (status: completed ✅)
   → Topic: "Flexible pricing tiers" (status: completed ✅)
   → Topic: "Args parsing" (status: completed ✅)

4. Verify:
   finder / Explore "dual column estimation" → confirmed in SKILL.md L45
   finder / Explore "pricing tiers"         → confirmed in reference/pricing.md

5. Map:
   Git touched skills/hd-estimation/** → target: ~/.claude/skills/hd-estimation/SKILL.md
   finder / Explore "estimation in AGENTS.md" → section exists at L23

6. Reconcile:
   GAPS:  pricing tiers not in AGENTS.md
   STALE: AGENTS.md still shows old single-column format
   UPDATES: [{AGENTS.md, update, estimation section, dual-column + tiers}]

7. Apply:
   Read AGENTS.md → note structure and voice
   edit_file / Edit estimation section → update format, add pricing tiers
```

## Tool Quick Reference

| Goal | Tool (Amp / Claude) |
| ---- | ------------------- |
| Ask scope + date | `AskUserQuestion` |
| Git log / file changes | `Bash` |
| List history/ entries | `Glob` |
| Read history files | `Read` |
| Verify topics in code | `finder` (Amp) / `Explore` subagent (Claude) |
| Find doc sections | `finder` (Amp) / `Explore` subagent (Claude) |
| Synthesize + reconcile | `oracle` (Amp) / `Plan` subagent (Claude) |
| Update existing docs | `edit_file` (Amp) / `Edit` (Claude) |
| Create new docs | `create_file` (Amp) / `Write` (Claude) |
| Parallel file updates | `Task` |

## Quality Checklist

```
- [ ] Scope and date confirmed with user
- [ ] All history/ entries in date range collected
- [ ] Git commits analyzed for changed files
- [ ] Topics verified against current code
- [ ] Existing docs read before editing
- [ ] Changes surgical (not wholesale)
- [ ] Terminology matches existing docs
- [ ] Code-is-truth rule applied (planned ≠ implemented)
- [ ] Standards delta check completed (create or diff+suggest for both pairs)
```

## Troubleshooting

**No history/ entries in range** — Rely on git log alone; note in output that context is limited

**Git log too noisy** — Add file path filter: `git log --since=<date> -- <path>`

**Topic ≠ code** — Document as "planned" not "implemented"; do not update code docs

**Target doc unclear** — Default to `AGENTS.md` with an appropriate new section

**Too many changes** — Scope down: ask user to pick one topic or feature area
