---
name: hd-knowledge
description: Extracts knowledge from Amp threads and updates project docs. Use when asked to document recent work, sync docs after an epic, summarize what changed, or update AGENTS.md from thread history.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

> **Note**: This skill uses Amp-specific tools (`find_thread`, `read_thread`) that are NOT available in opencode.
> **For opencode users: use `hd-docs-sync` instead** — it achieves the same result using git history.

# Knowledge Extraction & Documentation Sync

Extracts knowledge from Amp threads and synchronizes project documentation.

> **⚠️ OpenCode Compatibility**: This skill is **non-functional** in opencode because `find_thread` and `read_thread`
> are Amp-native tools with no opencode equivalent. Use `hd-docs-sync` which sources from git history instead.

## Pipeline

```
REQUEST → THREADS → TOPICS → CODE → DOCS
```

| Phase        | Action                     | Tools                  |
| ------------ | -------------------------- | ---------------------- |
| 1. Discover  | Find threads by query/time | `find_thread`          |
| 2. Extract   | Parallel topic extraction  | `Task` + `read_thread` |
| 3. Verify    | Ground topics in code      | `finder` |
| 4. Map       | Find target docs           | `finder` |
| 5. Reconcile | Compare all sources        | `oracle` |
| 6. Apply     | Surgical updates           | `Edit`   |

## Phase 1: Discover Threads

Start from user request:

```bash
# "Document last 2 weeks"
find_thread after:2w

# "Summarize auth work"
find_thread "authentication"

# "What touched the SDK?"
find_thread file:packages/sdk

# Combined
find_thread "refactor" after:1w file:packages/api
```

## Phase 2: Extract Topics

Spawn parallel `Task` agents (2-3 threads each):

```
Task prompt:
"Read threads [T-xxx, T-yyy] using read_thread.
Goal: 'Extract topics, decisions, changes'

Return JSON:
{
  'topics': [{
    'name': 'topic name',
    'threads': ['T-xxx'],
    'summary': '1-2 sentences',
    'decisions': ['...'],
    'patterns': ['...'],
    'changes': ['...']
  }]
}"
```

Collect outputs → `oracle` synthesizes:

```
oracle: "Cluster these extractions. Deduplicate.
Latest thread wins conflicts. Output unified topic list."
```

See `reference/extraction-prompts.md` for full templates.

## Phase 3: Verify Against Code

For each topic, verify claims:

```
Topic: "Added retry logic to API client"

1. finder "retry logic API client"
   → finds src/api/client.ts

2. finder "RetryPolicy"
   → RetryPolicy class at L45, 12 usages across 4 files

→ Confirmed: topic matches code
```

| Claim Type        | Verification          |
| ----------------- | --------------------- |
| "Added X"         | `finder` "X"          |
| "Refactored Y"    | `finder` "Y"          |
| "Changed pattern" | `finder` for pattern  |
| "Updated config"  | `finder` config paths |

## Phase 4: Map to Docs

Discover existing documentation:

```bash
# Find existing mentions
finder "topic keyword in docs"
finder "RetryPolicy in AGENTS.md"
```

Understand target files before updating:

```
finder "ARCHITECTURE.md structure"
→ Note structure, sections, voice
→ Identify insertion point
```

See `reference/doc-mapping.md` for target file conventions.

## Phase 5: Reconcile

`oracle` compares three sources:

```
oracle prompt:
"Compare:
1. TOPICS: [extracted]
2. CODE: [verified state]
3. DOCS: [current content]

Output:
- GAPS: topics not in docs
- STALE: docs ≠ code
- UPDATES: [{file, section, change, rationale}]"
```

## Phase 6: Apply Updates

**Text updates**:

```
Read target → Edit with precise changes
Preserve structure and voice
```

**Architecture diagrams**:

```
mermaid with citations:
{
  "code": "flowchart LR\n  A[Client] --> B[RetryPolicy]",
  "citations": {
    "Client": "file:///src/api/client.ts#L10",
    "RetryPolicy": "file:///src/api/retry.ts#L45"
  }
}
```

**Parallel updates**: Multiple unrelated files → spawn Task per file.

## Concrete Example

User: "Document the auth refactor from last week"

```
1. find_thread "auth" after:7d
   → [T-abc, T-def, T-ghi]

2. Task agents extract (parallel):
   Agent A: T-abc → {topics: [{name: "JWT migration"}]}
   Agent B: T-def, T-ghi → {topics: [{name: "session cleanup"}]}

3. oracle clusters:
   → "Auth Refactor" with sub-topics

4. Verify:
   finder "JWTService"
   → confirmed at packages/auth/jwt.ts

5. Map docs:
   finder "authentication in AGENTS.md"
   → Section exists at line 45

6. oracle reconciles:
   → Gap: JWT migration not documented
   → Update: AGENTS.md auth section

7. Apply:
   Edit to AGENTS.md add JWT details
   mermaid auth flow diagram
```

## Tool Quick Reference

| Goal                | Tool                                     |
| ------------------- | ---------------------------------------- |
| Find threads        | `find_thread query\|after:Xd\|file:path` |
| Read thread         | `read_thread` with focused goal          |
| Parallel extraction | `Task` (spawn multiple)                  |
| Find code/docs      | `finder`                                     |
| Synthesis           | `oracle`                                         |

## Quality Checklist

```
- [ ] Topics verified against code (`finder`)
- [ ] Existing docs read before updating
- [ ] Changes surgical, not wholesale
- [ ] Mermaid diagrams have citations
- [ ] Terminology matches existing docs
```

## Troubleshooting

**Thread not found**: Try topic keywords, widen date range

**Too many threads**: Add `file:` filter, narrow dates

**Topic ≠ code**: Code is truth; note as "planned" or "historical"

**Doc structure unclear**: Read first, match existing patterns
