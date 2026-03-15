---
name: hd-code-review
description: "Review code changes between branches with a skeptical gatekeeper mindset. Reviews git diff across 12 aspects (requirements, correctness, possible breakage, better approach, redundancy, tests, security, breaking changes, implication assessment, code quality, completeness, architecture & design). Reads CODING_STANDARDS.md for project-specific style rules and REVIEW_STANDARDS.md for tech-stack presets, aspect escalations, and custom aspects. Outputs Approved / Approved with Comments / Changes Requested verdict."
license: proprietary
metadata:
  version: "2.0.0"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Code Review Skill

> [IMPORTANT] This skill orchestrates 3 parallel reviewer agents via **Agent Team Tools**
> (`team_create`, `task_create`, `task_list`, `message_send/fetch`, `team_delete`).
> Each reviewer runs as an independent worker with its own context, communicating findings
> back to the lead via the team messaging system.
> It does NOT replace `hd-security-review` for deep security analysis.
> For comprehensive security review, run `/hd-security-review code-review` separately.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CODE REVIEW LEAD                            │
│                         (This Agent)                                │
├─────────────────────────────────────────────────────────────────────┤
│  Phases 0-4: Arg parse, standards, diff, task context, assembly     │
│  Phase 4.5:  Create team → create 3 tasks → spawn 3 workers        │
│  Phase 5:    Collect results via message_fetch → gate check         │
│  Phase 6+:   Verdict, file output, copy menu                       │
└─────────────────────────────────────────────────────────────────────┘
           │  team_create + task_create + Task("worker") × 3
           ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  reviewer-sec│  │  reviewer-log│  │  reviewer-qua│
│  Aspects:    │  │  Aspects:    │  │  Aspects:    │
│  3, 7, 8     │  │  2, 6, 1, 11 │  │  4,5,9,10,12 │
│  + T1 custom │  │  + T1 custom │  │  + T2 custom │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
              ┌─────────────────────┐
              │  Agent Team Tools    │
              │  • task_update       │
              │  • message_send      │
              │  • message_fetch     │
              │  • team_status       │
              └─────────────────────┘
```

## Pipeline

```
INPUT → Arg Parse → Standards Load → Diff Fetch → Task Context →
Context Assembly → Team Create → [reviewer-sec ‖ reviewer-log ‖ reviewer-qua] → Gate → Verdict → File Output → Team Cleanup
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

## Phase 1.6: Known Issues Load

Load `docs/KNOWN_ISSUES.md` if it exists in the project root:

| Condition | Action |
|-----------|--------|
| File exists | Parse all `## KI-NNN` entries into `KNOWN_ISSUES` list. Each entry captures: ID, title, scope, reason, accepted-on, target-fix. |
| File does not exist | `KNOWN_ISSUES` = empty list. |

Display: `Known issues loaded: <N> entries.` or `Known issues: none (docs/KNOWN_ISSUES.md not found).`

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

**Remote URL detection** (run in parallel with diff, does not block):

```bash
git remote get-url origin
```

Parse the output into `PLATFORM_LINK_BASE`:

| Remote URL pattern | Platform | `PLATFORM_LINK_BASE` |
|--------------------|----------|----------------------|
| `https://github.com/<owner>/<repo>[.git]` | GitHub | `https://github.com/<owner>/<repo>/blob/<SOURCE_BRANCH>` |
| `git@github.com:<owner>/<repo>.git` | GitHub | `https://github.com/<owner>/<repo>/blob/<SOURCE_BRANCH>` |
| `https://gitlab.com/<owner>/<repo>[.git]` | GitLab | `https://gitlab.com/<owner>/<repo>/-/blob/<SOURCE_BRANCH>` |
| `git@gitlab.com:<owner>/<repo>.git` | GitLab | `https://gitlab.com/<owner>/<repo>/-/blob/<SOURCE_BRANCH>` |
| `https://bitbucket.org/<owner>/<repo>[.git]` | Bitbucket | `https://bitbucket.org/<owner>/<repo>/src/<SOURCE_BRANCH>` |
| Any other host (self-hosted) | unknown | `~` |
| Command fails / no remote | none | `~` |

If `REVIEW_STANDARDS.md` has `remote_url` set (Layer 2 override), use it instead and skip `git remote get-url origin` parsing. The `remote_url` value IS the `PLATFORM_LINK_BASE` (append `/<SOURCE_BRANCH>` if the value ends with the repo path and has no branch segment, or use as-is if it already includes the branch path).

Store as `PLATFORM_LINK_BASE` (`~` = unavailable — fall back to IDE-only links).

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
| `.cls` `.trigger` `.apex` | `apex` |
| `.html` or `.js` under `lwc/` path | `lwc` |
| `.cls` + `.html`/`.js` under `lwc/` path | `apex` + `lwc` |
| `.cmp` `.app` `.evt` `.intf` | `aura` |
| `.page` or `.component` under `pages/` path | `visualforce` |
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

### Known Issues
<KNOWN_ISSUES list (ID, title, scope, reason, target-fix for each entry), or "none">

### Cross-Reference Instruction
When generating findings: if a finding topic or file scope overlaps with a known issue entry above, append `[Known Issue: KI-NNN — <title>]` to that finding and downgrade its severity to **INFO**. Do NOT omit the finding — preserve full visibility. A finding can match at most one KI entry.

### Platform Link Base
<PLATFORM_LINK_BASE value, or "~" if unavailable>

### Finding Format (REQUIRED)
Every finding header MUST include the affected file AND line number as clickable links.

**When `Platform Link Base` is set (not `~`)** — produce dual links: IDE link + platform link:
```
**<PREFIX>:<N>** — <🔴/🟡> <Label> · [<file>:<line>](<file>#L<line>) · [↗](<PLATFORM_LINK_BASE>/<file>#L<line>)
**<PREFIX>:<N>** — <🔴/🟡> <Label> · [<file>:<start>-<end>](<file>#L<start>-L<end>) · [↗](<PLATFORM_LINK_BASE>/<file>#L<start>-L<end>)
```

**When `Platform Link Base` is `~`** — IDE link only:
```
**<PREFIX>:<N>** — <🔴/🟡> <Label> · [<file>:<line>](<file>#L<line>)
**<PREFIX>:<N>** — <🔴/🟡> <Label> · [<file>:<start>-<end>](<file>#L<start>-L<end>)
```

Rules:
- Extract line numbers from the diff `@@` hunk headers and `+`/`-` line markers
- Use the **new file** (post-patch) line number where the issue appears
- For a range, use `start-end` in display text and `#L<start>-L<end>` as the anchor
- The anchor MUST be `#L<line>` (e.g., `#L140`) — never `#<line>` or `:<line>`
- If no specific line can be determined, omit the line number rather than guess
```

---

## Phase 4.5: Parallel Agent Team Review

Print the review header before creating the team:

```
## Code Review: `<SOURCE_BRANCH>` → `<TARGET_BRANCH>`
**Reviewed:** <YYYY-MM-DD>
**Task:** <task title or 'No task context'>
**Standards:** <comma-separated required policies, or 'defaults only'>

---
⏳ Creating review team (security · logic · quality)...
```

Record `T1_START` = current timestamp (seconds).

### Step 1: Create Review Team

```
team_create(teamName="review-<SOURCE_BRANCH_SLUG>", description="Code review: <SOURCE_BRANCH> → <TARGET_BRANCH>")
```

### Step 2: Create Review Tasks

Create 3 tasks — one per reviewer focus area. All tasks are independent (no dependencies):

```
task_create(
  teamName="review-<SOURCE_BRANCH_SLUG>",
  subject="Security & Safety Review (Aspects 3, 7, 8)",
  description="## Review Focus\nAspects: 3 (Possible Breakage), 7 (Security), 8 (Breaking Changes)\nTier: 1 — Blocker-prone\nCustom aspects (Tier 1): <CUSTOM_ASPECTS_T1 or 'none'>\n\n## Review Context\n<full Review Context payload from Phase 4>\n\n## Output Format\nUse prefix SEC:N for findings. Mark blockers as 🔴, advisories as 🟡.\nOutput full findings verbatim — do NOT summarize.\n\n## Completion\nWhen done, send findings via message_send to lead.",
  metadata='{"reviewer": "reviewer-sec", "tier": 1, "aspects": "3,7,8"}'
)
# → returns taskId "1"

task_create(
  teamName="review-<SOURCE_BRANCH_SLUG>",
  subject="Correctness & Coverage Review (Aspects 2, 6, 1, 11)",
  description="## Review Focus\nAspects: 2 (Correctness), 6 (Tests), 1 (Requirements), 11 (Completeness)\nTier: 1 — Blocker-prone\nCustom aspects (Tier 1): <CUSTOM_ASPECTS_T1 or 'none'>\n\n## Review Context\n<full Review Context payload from Phase 4>\n\n## Output Format\nUse prefix LOG:N for findings. Mark blockers as 🔴, advisories as 🟡.\nOutput full findings verbatim — do NOT summarize.\n\n## Completion\nWhen done, send findings via message_send to lead.",
  metadata='{"reviewer": "reviewer-log", "tier": 1, "aspects": "2,6,1,11"}'
)
# → returns taskId "2"

task_create(
  teamName="review-<SOURCE_BRANCH_SLUG>",
  subject="Quality & Architecture Review (Aspects 4, 5, 9, 10, 12)",
  description="## Review Focus\nAspects: 4 (Better Approach), 5 (Redundancy), 9 (Implications), 10 (Code Quality), 12 (Architecture)\nTier: 2 — Advisory\nCustom aspects (Tier 2): <CUSTOM_ASPECTS_T2 or 'none'>\n\n## Review Context\n<full Review Context payload from Phase 4>\n\n## Output Format\nUse prefix QUA:N for findings. Mark all as 🟡 Advisory (unless ASPECT_ESCALATIONS promote to 🔴).\nOutput full findings verbatim — do NOT summarize.\n\n## Completion\nWhen done, send findings via message_send to lead.",
  metadata='{"reviewer": "reviewer-qua", "tier": 2, "aspects": "4,5,9,10,12"}'
)
# → returns taskId "3"
```

### Step 3: Spawn Reviewer Workers

Spawn all 3 workers simultaneously via `Task("worker")` (Amp/hdcode) or `Agent("worker")` (Claude):

| Worker | Task | Model | Agent ID |
|--------|------|-------|----------|
| `reviewer-sec` | #1 | sonnet | `reviewer-sec` |
| `reviewer-log` | #2 | sonnet | `reviewer-log` |
| `reviewer-qua` | #3 | haiku | `reviewer-qua` |

**Worker prompt template** (adapt per reviewer):

```
You are a code reviewer executing task #{TASK_ID} in team "review-<SOURCE_BRANCH_SLUG>".

## Protocol

### 1. Start
- task_get(teamName="review-<SLUG>", taskId="{TASK_ID}") — read full task details
- task_update(teamName="review-<SLUG>", taskId="{TASK_ID}", status="in_progress")

### 2. Review
- Read the Review Context from task description
- Apply aspect checklists from reference/review-checklist.md for your assigned aspects
- For each finding, format with the required Finding Format from the Review Context
- Periodically: message_fetch(teamName="review-<SLUG>", agent="{AGENT_ID}")

### 3. Complete
- task_update(teamName="review-<SLUG>", taskId="{TASK_ID}", status="completed",
    description="<append: N findings (X blockers, Y advisories)>")
- message_send(teamName="review-<SLUG>", type="message", from="{AGENT_ID}",
    recipient="lead", content="<full findings output verbatim>")

### 4. Done
- Return summary of findings

## Important
- Output findings verbatim — do NOT summarize or abbreviate
- Use the finding prefix assigned to you (SEC:/LOG:/QUA:)
- If ASPECT_ESCALATIONS includes your aspects, mark escalated findings as 🔴 Blocker
- Cross-reference Known Issues: if finding overlaps a KI entry, append [Known Issue: KI-NNN] and downgrade to INFO
```

### Step 4: Monitor & Collect Results

Poll team status until all 3 tasks complete:

```
WHILE tasks remain in_progress:
  task_list(teamName="review-<SLUG>")
  → check statuses
  → if all completed, proceed
  message_fetch(teamName="review-<SLUG>", agent="lead")
  → collect reviewer findings as they arrive
```

Record `T1_END` = current timestamp (seconds).

### Step 5: Print Results & Gate

**Print results:** Output each reviewer's findings **verbatim** from their messages (do NOT reconstruct, summarize, or reformat findings — preserve the original finding headings, description, suggestion, and the fenced `markdown` copy block exactly as the agent emitted them):
1. `reviewer-sec` output (Tier 1 — security & safety)
2. `reviewer-log` output (Tier 1 — correctness & coverage)
3. *(hold `reviewer-qua` output — apply gate first)*

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

Print `reviewer-qua` output now.

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

When writing findings to the file, wrap each finding block with HTML comment markers so they can be extracted individually. Preserve the agent-local ID (e.g., `SEC:2`, `LOG:1`, `QUA:3`) in the heading so findings are searchable by ID:
```
<!-- F:1 -->
### LOG:1 — 🔴 Correctness · `src/auth.ts:42`
...finding content...

<!-- F:2 -->
### SEC:2 — 🟡 Security · `src/api.ts:15`
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

## Phase 7.5: Team Cleanup

After file output, clean up the review team:

```
team_delete(teamName="review-<SOURCE_BRANCH_SLUG>")
```

Display: `Review team cleaned up.`

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

## Known Issues Suggestion Hook

After the copy loop exits, scan all findings in the review for language indicating accepted or deferred debt:

**Trigger signals** (in finding text, task description, or PR description):
- "known issue", "known limitation", "we know", "already known"
- "accepted", "acceptable for now", "accepted debt", "acknowledged"
- "workaround", "temporary fix", "deferred", "won't fix", "can't fix now"
- "TODO", "FIXME", "tech debt", "legacy"

For each finding that **matches a trigger signal but has no existing KI entry** (i.e., not already annotated `[Known Issue: KI-NNN]`):

```
> Finding [SEC:2] appears to be accepted/deferred debt ("workaround for legacy auth").
> Add to docs/KNOWN_ISSUES.md as a known issue? (y/n)
```

On **yes**: append a new KI entry to `docs/KNOWN_ISSUES.md` with:
- Auto-assigned next sequential ID (scan existing KI-NNN headings to determine next number)
- Title from finding label
- Scope from affected file
- Reason left as `<fill in reason>` placeholder
- Accepted by: `<fill in>`
- Accepted on: today's date
- Target fix: `<fill in>`

Display: `KI-NNN added to docs/KNOWN_ISSUES.md — fill in Reason, Accepted by, and Target fix.`

On **no**: skip silently. Only prompt once per matching finding.

---

## Quick Reference

### Agent Team Tools Used

| Phase | Tool | Purpose |
|-------|------|---------|
| 4.5 Step 1 | `team_create` | Create review team |
| 4.5 Step 2 | `task_create` × 3 | Create reviewer tasks (no dependencies) |
| 4.5 Step 3 | `Task("worker")` × 3 | Spawn reviewer workers |
| 4.5 Step 4 | `task_list`, `message_fetch` | Monitor progress, collect findings |
| 7.5 | `team_delete` | Clean up review team |

### Worker → Lead Communication

| Event | Worker Action |
|-------|---------------|
| Start review | `task_update(status="in_progress")` |
| Complete review | `task_update(status="completed")` + `message_send(findings)` |

### Team Naming Convention

Team name: `review-<SOURCE_BRANCH_SLUG>` (e.g., `review-feat-auth-refactor`)

