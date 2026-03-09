# Collection Prompt Templates

Prompt templates for Phase 2 (Collect) and Phase 5 (Reconcile) in hd-docs-sync.

---

## Stream Synthesis Prompt (oracle (Amp) / Plan subagent (Claude))

Use after collecting all three streams. Paste raw content from each.

```
Synthesize these sources into a unified topic list for documentation.

GIT LOG:
<paste: git log --since=<date> --oneline --no-merges output>

CHANGED FILES:
<paste: git log --since=<date> --name-only --no-merges --pretty=format:"" output>

HISTORY ENTRIES:
<paste: contents of all history/*.md files in range>

PLANS:
<paste: contents of plans/*.md files in range, or "none">

Rules:
- Cluster related items into named topics
- Deduplicate overlapping content
- Latest/verified info wins on conflicts
- If verification-report.md is present for an entry → status: "completed"
- If only execution-plan.md exists (no verification) → status: "planned"

Output JSON:
[
  {
    "name": "short topic name",
    "status": "completed | planned | in-progress",
    "summary": "1-2 sentences",
    "decisions": ["decision made"],
    "patterns": ["pattern established"],
    "changes": ["what changed"],
    "files_touched": ["file paths from git log"]
  }
]

Be precise. Only include what is explicitly evidenced in the sources.
```

---

## Code Verification Prompt (finder (Amp) / Explore subagent (Claude))

Use in Phase 3. One prompt per topic.

```
Verify this claim exists in the codebase:

CLAIM: "<topic summary>"
EXPECTED FILES: <files_touched from topic JSON>

Search for:
1. Key terms from the claim (function names, class names, config keys)
2. Check the expected files for the relevant implementation

Output:
- CONFIRMED: <what was found, file path, line number if relevant>
- NOT FOUND: <claim couldn't be verified — list what was searched>
- PARTIAL: <found but differs from claim — describe discrepancy>
```

---

## Reconciliation Prompt (oracle (Amp) / Plan subagent (Claude))

Use in Phase 5. Input is the verified topic list + current doc contents.

```
Compare these sources and identify what needs updating in documentation.

VERIFIED TOPICS:
<paste: JSON topic list from synthesis, annotated with CONFIRMED/NOT FOUND/PARTIAL>

CURRENT DOC CONTENT:
<paste: relevant sections from existing docs (AGENTS.md, SKILL.md, etc.)>

Output JSON:
{
  "gaps": [
    {
      "topic": "topic name",
      "target_file": "path/to/doc.md",
      "section": "section to add to"
    }
  ],
  "stale": [
    {
      "file": "path/to/doc.md",
      "issue": "what is outdated",
      "correction": "what it should say"
    }
  ],
  "updates": [
    {
      "file": "path/to/doc.md",
      "action": "add | update | remove",
      "section": "section name",
      "content": "what to write",
      "rationale": "why this change"
    }
  ]
}

Priority order for updates: stale fixes first (correctness), then gaps (completeness).
```

---

## Git Parsing Guide

How to interpret raw `git log` output for topic extraction.

### Commit message → topic signals

| Commit prefix | Topic type |
| ------------- | ---------- |
| `feat:` | New feature → document in AGENTS.md or SKILL.md |
| `fix:` | Bug fix → document in TROUBLESHOOTING.md if recurring |
| `refactor:` | Pattern change → update patterns section |
| `chore:` | Config/tooling → update README.md or INSTALL.md |
| `docs:` | Doc update → verify existing docs are current |
| `breaking:` | Breaking change → MIGRATION.md required |

### File path → doc-target signals

| Changed path pattern | Auto-target |
| -------------------- | ----------- |
| `claude/skills/*/` | Relevant `SKILL.md` |
| `packages/cli/` | `packages/cli/AGENTS.md` |
| `packages/sdk/` | `packages/sdk/AGENTS.md` |
| `docs/` | Review existing docs in `docs/` |
| `CHANGELOG.md` | Already documented — skip |
| Root config files | `README.md`, `docs/INSTALL.md` |
