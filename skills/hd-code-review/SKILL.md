---
name: hd-code-review
description: "Review code changes between branches with a skeptical gatekeeper mindset. Reviews git diff across 12 aspects (requirements, correctness, possible breakage, better approach, redundancy, tests, security, breaking changes, implication assessment, code quality, completeness, architecture & design). Reads CODING_STANDARDS.md for project-specific style rules and REVIEW_STANDARDS.md for tech-stack presets, aspect escalations, and custom aspects. Outputs Approved / Approved with Comments / Changes Requested verdict."
license: proprietary
metadata:
  version: "1.0.0"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Code Review Skill

> [IMPORTANT] This skill orchestrates 3 parallel subagents (`code-review-security`, `code-review-logic`, `code-review-quality`)
> that each embed the relevant aspect checklists from `reference/review-checklist.md`.
> It does NOT replace `hd-security-review` for deep security analysis.
> For comprehensive security review, run `/hd-security-review code-review` separately.

## Pipeline

```
INPUT → Arg Parse → Standards Load → Diff Fetch → Task Context →
Context Assembly → [code-review-security ‖ code-review-logic ‖ code-review-quality] → Gate → Verdict → File Output → (TODO: Post to VCS)
```

---

## Phase 0: Argument Parse

Parse the invocation:

```
/hd-code-review [task-url-or-description] [--source=<branch>] [--target=<branch>]
```

| Argument | Required | Default | Notes |
|----------|----------|---------|-------|
| `--source` | No | `HEAD` (current branch) | Branch being reviewed |
| `--target` | No | `main` | Base branch to diff against |
| first non-flag arg | No | absent | Task URL or plain-text description |

### Natural Language Resolution

Extract branch names from patterns like "against `<b>`", "vs `<b>`", "from `<b>`", "`<s>` against `<t>`". Remaining text = task context (Path B); empty remainder = Path C. Explicit flags always take precedence.

Determine:
- `SOURCE_BRANCH` — from `--source` flag, natural language, or `git branch --show-current`
- `TARGET_BRANCH` — from `--target` flag, natural language, or default `main`
- `TASK_CONTEXT` — URL, plain-text description (after branch extraction), or absent

Display: `Reviewing \`<SOURCE_BRANCH>\` → \`<TARGET_BRANCH>\``

---

## Phase 1: Standards Load

Load `CODING_STANDARDS.md` via two-layer inheritance:

| Layer | Path | Role |
|-------|------|------|
| Layer 1 (always) | `skills/hd-code-review/CODING_STANDARDS.md` | Generic baseline — naming, patterns, policy templates |
| Layer 2 (override if exists) | `<project-root>/docs/CODING_STANDARDS.md` | Project-specific — overrides base; project values win |

Effective standards = Layer 1 + Layer 2 overrides. Project values WIN where both layers define the same section or field. Sections absent from Layer 2 fall back to Layer 1.

Extract: active Project Policies (Section 3) and their `required:` status from the merged result.

Display: `Standards loaded. Active policies: [comma-separated list of policies with required:yes, or 'none']`

---

## Phase 1.5: Review Standards Load

Load `REVIEW_STANDARDS.md` via two-layer inheritance:

| Layer | Path | Role |
|-------|------|------|
| Layer 1 (always) | `skills/hd-code-review/REVIEW_STANDARDS.md` | Schema + empty defaults |
| Layer 2 (if exists) | `<project-root>/docs/REVIEW_STANDARDS.md` | Project overrides — wins on conflict |

Extract:
- `TECH_STACK` — from `tech_stack:` field (`~` = none)
- `ASPECT_ESCALATIONS` — aspects promoted from Tier 2 advisory to Tier 1 blocker
- `CUSTOM_ASPECTS` — project-specific review dimensions

If `TECH_STACK` is explicitly set (not `~`): record it as the forced stack — skip auto-detection in Phase 4.

Apply `ASPECT_ESCALATIONS`: escalated aspect numbers are passed to agents via the Review Context payload; agents mark those findings as 🔴 Blocker. The skill also checks ALL agent outputs (including quality) for 🔴 markers when escalations are active.

Display: `Review standards loaded. Stack: <explicit value or 'auto-detect'> | Escalations: <count> | Custom aspects: <count>`

---

## Phase 2: Diff Fetch

Run:

```bash
git diff <TARGET_BRANCH>..<SOURCE_BRANCH>
```

Assess diff size:
- **< 500 lines:** proceed to Phase 3.
- **≥ 500 lines:** warn the user. Offer to scope the diff:
  ```bash
  git diff <TARGET_BRANCH>..<SOURCE_BRANCH> -- <path>
  ```
  Accept a path scope from the user, or proceed with the full diff if the user confirms.

Display: `Diff: <N> lines changed across <M> files`

---

## Phase 3: Task Context

**Path A — URL provided:** Detect platform (Linear `linear.app`, Jira `atlassian.net`, ClickUp `app.clickup.com`, Asana `app.asana.com`). Fetch title + description + labels via MCP; if MCP inactive, ask user to paste.

Detect task type:
| Signal | Type |
|--------|------|
| Labels: `bug`/`defect`/`regression`/`hotfix` | Bug |
| Branch prefix: `fix/` `hotfix/` `bugfix/` `patch/` | Bug |
| Otherwise | Feature (default) |

**Feature:** Parse `- [ ]`/`- [x]` items as ACs; fall back to full description if none. Display: `Task context loaded: <title> — <N> ACs`. Aspects 1 + 11: cross-reference each AC.

**Bug:** Fetch comments + priority via MCP. Display: `Task context loaded: <title> — Bug (Priority: <P>) | Repro: <first comment or "none">`. Elevate Aspects 2, 3, 6 (require regression test).

**Path B — Plain text:** Use as-is for Aspects 1 and 11.

**Path C — None:** Aspects 1 and 11 → N/A; continue with 9 remaining.

---

## Phase 4: Context Assembly

**Step 1 — Stack detection:** If `TECH_STACK` was explicitly set in Phase 1.5, use it. Otherwise, auto-detect from the diff's changed file extensions:

| Extensions / path signals in diff | Stack preset(s) loaded |
|-----------------------------------|----------------------|
| `.cs` `.csproj` `.sln` `.razor` | `dotnet` |
| `.ts` `.js` `.mjs` `.cjs` `package.json` (no `.tsx`/`.jsx`, no RN signals) | `nodejs` |
| `.tsx` `.jsx` (no RN signals) | `react` |
| `.ts` `.js` + `.tsx` `.jsx` (no RN signals) | `nodejs` + `react` |
| `.vue` | `vuejs` |
| `.native.ts/tsx/js` OR `react-native` in `package.json`, `android/`/`ios/` paths (no Expo) | `reactnative` |
| RN signals + `expo` in `package.json` / `app.json` / `app.config.*` | `reactnative` + `expo` |
| `.dart` `pubspec.yaml` | `flutter` |
| `.go` `go.mod` | `go` |
| `.py` (no Django path signals) | `python` |
| `.py` + Django paths (`views.py` `models.py` `urls.py` `serializers.py` `migrations/`) | `python` + `django` |
| `.php` (no framework signals) | `php` |
| `.php` + Laravel signals (`artisan`, `app/Http/Controllers/`, `routes/web.php`) | `php` + `laravel` |
| `.php` + CakePHP signals (`src/Controller/`, `config/routes.php`, `"cakephp/cakephp"` in `composer.json`) | `php` + `cakephp` |
| `.php` + WordPress signals (`wp-config.php`, `wp-content/`, `functions.php`, WP function calls) | `php` + `wordpress` |
| `.scala` `build.sbt` | `scala` |
| Multiple sets present | all matching presets — checks scoped to relevant file types |
| None of the above | none |

Read `reference/stacks/<stack>.md` for each detected stack.

**Step 2 — Build the Review Context payload** (used as the prompt for all 3 agents):

```markdown
## Review Context

### Diff
```diff
<full git diff>
```

### Task
- Title: <title or "No task context provided">
- Type: Bug | Feature | N/A
- Acceptance Criteria:
  <AC list, or "No task context provided">

### Coding Standards
<merged CODING_STANDARDS content>

### Tech Stack
<detected stack(s), or "none">

### Stack-Specific Checks
<full content of reference/stacks/<stack>.md for each detected stack, or "none">
When multiple stacks are active, scope each stack's checks to files of that type.

### Escalated Aspects
<comma-separated aspect numbers from ASPECT_ESCALATIONS, or "none">

### Custom Aspects (Tier 1)
<CUSTOM_ASPECTS entries with tier: 1, or "none">

### Custom Aspects (Tier 2)
<CUSTOM_ASPECTS entries with tier: 2, or "none">
```

---

## Phase 4.5: Parallel Agent Review

Print the review header before spawning agents:

```
## Code Review: `<SOURCE_BRANCH>` → `<TARGET_BRANCH>`
**Reviewed:** <YYYY-MM-DD>
**Task:** <task title or 'No task context'>
**Standards:** <comma-separated required policies, or 'defaults only'>

---
⏳ Running parallel review (security · logic · quality)...
```

Record `T1_START` = current timestamp (seconds).

**Spawn all 3 agents simultaneously** (single parallel tool call):

| Agent | Aspects | Model | Context |
|-------|---------|-------|---------|
| `code-review-security` | 3, 7, 8 + Tier 1 custom | sonnet | Review Context payload |
| `code-review-logic` | 2, 6, 1, 11 + Tier 1 custom | sonnet | Review Context payload |
| `code-review-quality` | 4, 5, 9, 10, 12 + Tier 2 custom | haiku | Review Context payload |

Wait for all 3 agents to complete. Record `T1_END` = current timestamp (seconds).

**Print results:** Output each agent's full response **verbatim** (do NOT reconstruct, summarize, or reformat findings — preserve the original finding headings, description, suggestion, and the fenced `markdown` copy block exactly as the agent emitted them):
1. `code-review-security` output (Tier 1 — security & safety)
2. `code-review-logic` output (Tier 1 — correctness & coverage)
3. *(hold `code-review-quality` output — apply gate first)*

**Gate check:** Scan the combined security + logic outputs for any 🔴 marker.

If blockers found:

```
---
⏱ Tier 1 completed in <T1_END - T1_START>s
**Tier 1 complete.** 🔴 Blocker(s) found — this branch needs rework before advisories matter.
Continue to advisory aspects (better approach, redundancy, implications, quality, architecture)? [y/n]
```

Wait for user input. If **n** → skip to Phase 6 immediately.

If no blockers (or user says **y**):

```
---
⏱ Tier 1 completed in <T1_END - T1_START>s · no blockers — continuing to advisory aspects...
```

Record `T2_START` = current timestamp (seconds).

Print `code-review-quality` output now.

Record `T2_END` = current timestamp (seconds). Print timing line:

```
⏱ Tier 2 completed in <T2_END - T2_START>s
```

**Track state from agent outputs:**
- `has_blocker` — `true` if any 🔴 found across all agent outputs
- `has_advisory` — `true` if any 🟡 found across all agent outputs
- `findings[]` — collect all findings from all agents; assign global sequential IDs (F:1, F:2, …) mapping from agent-local IDs (SEC:N, LOG:N, QUA:N). These global IDs are used **only** in Phase 7 file output (HTML comment markers) and Phase 8 copy menu — the live display above prints verbatim agent output with original IDs

Print total timing:

```
⏱ Total review: <(T1_END - T1_START) + (T2_END - T2_START)>s (Tier 1: <T1_END - T1_START>s · Tier 2: <T2_END - T2_START>s)
```

---

## Phase 6: Verdict

Determine verdict from tracked state:

```
has_blocker = true                              →  ❌ Changes Requested
has_blocker = false AND has_advisory = true     →  ⚠️ Approved with Comments
has_blocker = false AND has_advisory = false    →  ✅ Approved
```

Print the closing verdict (aspects were already printed progressively — do NOT re-list them):

```markdown
---
## Verdict: ❌ Changes Requested
Fix all 🔴 Blocker findings before merging.

---
> This is AI-assisted code review. It complements but does not replace human review,
> automated testing, and security scanning.
```

Verdict line variants:
- `❌ Changes Requested` → `Fix all 🔴 Blocker findings before merging.`
- `⚠️ Approved with Comments` → `Address 🟡 advisory findings where practical.`
- `✅ Approved` → `No blocking issues found.`

---

## Phase 7: File Output

Determine output path:

| Condition | Path |
|-----------|------|
| Task ID known (from URL or task fetch) | `history/tasks/<task-id>/code-review.md` |
| No task ID | `history/<YYYYMMDD>-<source-branch-slug>/code-review.md` |

Write the full verdict output to the file. Create intermediate directories as needed.

When writing findings to the file, wrap each finding block with HTML comment markers so they can be extracted individually:
```
<!-- F:1 -->
### 🔴 Correctness · `src/auth.ts:42`
...finding content...

<!-- F:2 -->
### 🟡 Security · `src/api.ts:15`
...finding content...
```

The markers are hidden when rendered on GitHub/GitLab — safe to paste as-is.

Display: `Review saved to <path>`

Then output:

```
💡 Optional: Deep Security Review
This review includes a quick security pass (Aspect 7).
For full OWASP Top 10, PII audit, compliance gate, and tenant isolation — scoped to these changes:

  /hd-security-review code-review --source=<SOURCE_BRANCH> --target=<TARGET_BRANCH>
```

---

## Phase 8: Interactive Finding Copy

Only enter this phase if `findings[]` is non-empty.

Display the findings menu:

```
📋 Copy a finding to clipboard — paste directly into GitHub/GitLab:

  [1] 🔴 Correctness · src/auth.ts:42
  [2] 🟡 Security · src/api.ts:15
  [3] 🟡 Code Quality · src/utils.ts:88

Enter number to copy, or Enter to skip:
```

Wait for user input.

**On a valid number N:**

Run via Bash — extract finding block N from the saved file and copy to clipboard:

```bash
# Extract block between <!-- F:N --> and next <!-- F: --> marker (or EOF)
# Windows
awk '/<!-- F:N -->/{found=1;next} /<!-- F:[0-9]/{if(found)exit} found{print}' "<path>" | clip

# macOS
awk '/<!-- F:N -->/{found=1;next} /<!-- F:[0-9]/{if(found)exit} found{print}' "<path>" | pbcopy

# Linux
awk '/<!-- F:N -->/{found=1;next} /<!-- F:[0-9]/{if(found)exit} found{print}' "<path>" | xclip -sel clip
```

Replace `N` with the actual finding number. Use the platform detected during Phase 7.

Display: `Finding [N] copied ✓ — paste into your PR comment`

Then prompt again (loop until empty input).

**On empty input / Enter:** Exit the loop silently.

