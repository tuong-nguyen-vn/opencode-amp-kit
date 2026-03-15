---
name: hd-task
description: "Task lifecycle orchestrator for Linear issues. Use when you have a Linear task URL and want to manage the full workflow — read task, route to hd-brainstorming/hd-planning/hd-issue-resolution, execute, update task, and run changelog. Supports: hd-task <url>, hd-task finalize <url|id>, hd-task consolidate, hd-task init."
license: proprietary
metadata:
  version: "1.0.0"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Task Lifecycle Orchestrator

Manage Linear tasks end-to-end: fetch, route to the right skill, execute, update Linear, and close with changelog.

> **Skill base directory**: `skills/hd-task/` (resolve all relative paths from here at runtime)

## Pipeline Overview

```
hd-task <url>
    │
    ├─ Phase 0: Bootstrap     → init check, platform detect, auth resolve
    ├─ Phase 1: Fetch & Check → fetch task, session resume, blockers, PII, quality
    ├─ Phase 2: Route         → state machine + routing decision
    ├─ Phase 3: HITL Gate 1   → confirm approach (mode-dependent)
    ├─ Phase 4: Execute       → run routed skill, collect outputs
    ├─ Phase 5: Close Loop    → branch, PR, template merge, HITL Gate 2, Linear update
    └─ Phase 6: Changelog     → if Done, run hd-changelog
```

| Phase | Input | Output |
|-------|-------|--------|
| 0. Bootstrap | invocation args | adapter loaded, credentials verified |
| 1. Fetch & Check | task URL | task data, session decision, quality verdict |
| 2. Route | task data + status | skill target selected |
| 3. HITL Gate 1 | routing decision | developer approval or auto-skip |
| 4. Execute | routed skill + task context | plan / fix / PR artifacts |
| 5. Close Loop | artifacts + adapter | PR created, task updated → In Review |
| 6. Changelog | task status | CHANGELOG.md updated |

## Mode Detection

Parse the invocation arguments before any other action:

| Invocation | Mode |
|------------|------|
| `hd-task <url>` | Mode A: Full Lifecycle |
| `hd-task <url> --no-promote` | Mode A — skip PM tool description update |
| `hd-task <url> --no-git` | Mode A — skip all git operations |
| `hd-task <url> --no-pr` | Mode A — push branch but skip PR creation |
| `hd-task consolidate [url\|id] [--sprint]` | Mode C: Consolidate |
| `hd-task init` | Mode D: Init |
| `hd-task --auto <url>` | Mode A with HITL override = auto |
| `hd-task --manual <url>` | Mode A with HITL override = manual |

> **Note**: `finalize` is an internal hook for sub-skills (hd-planning, hd-issue-resolution) — not user-facing.

1. Split invocation string on whitespace.
2. Parse promotion flags: `--no-promote`, `--no-git`, `--no-pr`; store as booleans; strip before further parsing.
3. If token 1 is a URL (matches any adapter `url_pattern`) → Mode A.
4. If token 1 is `finalize` → Mode B (internal). Token 2 is `<url|id>`.
5. If token 1 is `consolidate` → Mode C.
6. If token 1 is `init` → Mode D.
7. Flags `--auto` / `--manual` set HITL override; strip before URL parse.

---

## Mode A: Full Lifecycle

### Phase 0: Bootstrap

1. **Init check** — look for `docs/tasks/config.yaml` in the project root.
   - If absent: print `Run hd-task init first to configure this project.` and exit.
2. **Platform detect** — match task URL against each adapter's `url_pattern` in `skills/hd-task/adapters/*.json`.
   - Load the matching adapter file; extract `platform`, `tools`, `fallback_script`, `auth.key`.
   - If adapter `status` = `"placeholder"`: print `<platform> adapter is not yet implemented. See skills/hd-task/adapters/_ADAPTER_SPEC.md to contribute.` and exit.
   - If no adapter matches: print `Unrecognized task URL. Supported platforms: Linear, Jira, ClickUp, Asana.` and exit.
3. **Auth resolve** — run [Auth Resolution](#shared-auth-resolution) with `auth.key` from adapter config.
4. **MCP probe** — run [Platform Probe](#shared-platform-probe) to confirm tool availability.

### Phase 1: Fetch & Check

1. **Fetch task** — call `tools.get_task` (resolved from adapter) with the task ID extracted via `id_group` capture.
   - Store full response as `task`.
2. **Session resume** — check `history/tasks/<id>/session.md`; if found, see [Shared: Session State](#shared-session-state) for resume flow.
3. **Blocker check** — call `linear_get_issue_relations` for the task ID.
   - If any blocking relations exist with non-Done status: print warning listing blocker IDs. Do not block execution.
4. **PII filter** — read `docs/tasks/config.yaml` field `security.pii_filter`.
   - If `true`: run `python3 skills/hd-task/scripts/adapters/linear_fallback.py --redact-pii "<task.description>"`. Use redacted text for all downstream routing.
5. **Quality gate** — evaluate `task.description` length and structure.
   - If description is missing, fewer than 50 characters, or lacks acceptance criteria: ask the developer for more context before proceeding.
6. **Stale detection** — compare `task.updatedAt` to today's date.
   - If difference > `state_machine.stale_days` (default: 5) from `docs/tasks/config.yaml`: print `Warning: task last updated N days ago. Verify it is still current.` Continue without blocking.

### Phase 2: Route

Apply state machine first, then routing decision.

**State Machine** — see [Shared: State Machine](#shared-state-machine).

| Status | Behavior |
|--------|----------|
| Backlog / Todo | proceed to routing decision below |
| In Progress | check session history; resume or start fresh; verify template completeness |
| In Review | offer PR description assist + testing checklist; skip execution |
| Done | print `Task is already Done.`; offer to run hd-changelog; exit |
| Cancelled | print `Task is Cancelled. Exiting.`; exit |

**Routing Decision** — evaluate labels on `task.labels` against `docs/tasks/config.yaml` routing overrides:

| Signal | Default Labels | Target Skill |
|--------|---------------|-------------|
| Bug | `bug`, `defect`, `regression` | hd-issue-resolution |
| Design / Spike | `design`, `discussion`, `spike` | hd-brainstorming |
| Feature | `feature`, `story`, `enhancement` | hd-planning |
| Poor description | description failed quality gate | ask developer, then route |
| Ambiguous | no matching labels | ask developer which skill |

Load `docs/tasks/config.yaml` `routing.*_labels` lists to override defaults.

### Phase 3: HITL Gate 1

See [Shared: HITL Gates](#shared-hitl-gates) — Gate: **routing**.

- Present: task title, status, selected skill, routing reason.
- In `auto` / `review` mode: skip gate; proceed.
- In `manual` / `custom` (if `gates.routing: true`): ask `Proceed with <skill>? [Y/n]`.

### Phase 3.5: Create Branch

1. **Create branch** — create and switch to a new branch before any code execution:
   ```bash
   git checkout -b feat/<id>-<slug>
   ```
   where `<slug>` is the task title lowercased, spaces replaced with hyphens, truncated to 40 chars.

   If resuming a session where `phase: 3.5-complete` is already in `history/tasks/<id>/session.md`:
   — branch already exists; run `git checkout feat/<id>-<slug>` instead of `checkout -b`.

2. **Log session** — append to `history/tasks/<id>/session.md`:
   ```
   phase: 3.5-complete | timestamp: <ISO8601>
   ```

### Phase 4: Execute

1. Load the routed skill via `skill("<skill-name>")`.
2. Pass full task context: task ID, title, description (post-PII filter), labels, assignee, project key.
3. Collect outputs from the routed skill (implementation plan, fix description, PR artifacts).
4. If the routed skill has a `hd-task finalize` hook at its tail and a task URL is in context, that hook will invoke Mode B automatically — no duplicate execution needed.

### Phase 5: Close Loop

> **Promotion flags** (parsed in Mode Detection, all default `true`):
> - `--no-git` → skip Steps 1 and 2 entirely (no branch push, no PR, no attachment)
> - `--no-pr` → skip PR creation in Step 1; still push branch; still link if PR exists
> - `--no-promote` → skip Step 3 (template merge + task description write)

1. **Create PR** and capture URL *(skip if `--no-git` or `--no-pr`)*:
   ```bash
   PR_URL=$(gh pr create --fill --json url -q .url)
   ```
   If `gh pr create` fails (no commits yet): log `No commits to PR. Skipping PR creation.` and continue.

2. **Link PR to Linear** *(skip if `--no-git`)*  — call `linear_create_attachment` with:
   - `issueId`: task ID
   - `url`: `$PR_URL`
   - `title`: PR title (from `gh pr view --json title -q .title`)

3. **Template merge** *(skip if `--no-promote`)* — load template:
   - If `docs/tasks/templates/<PROJECT_KEY>.md` exists: use it.
   - Else if task has bug labels (from `routing.bug_labels`) AND `docs/tasks/templates/bug.md` exists: use it.
   - Else if `docs/tasks/templates/default.md` exists: use it.
   - Else if task has bug labels AND `skills/hd-task/templates/bug.md` exists: use it.
   - Else use `skills/hd-task/templates/default.md`.
   - **Merge strategy — marker-based:**
     - Fetch the current task description from the platform (the "live" version).
     - **AI content marker**: `> 🤖 AI Generated on YYYY-MM-DD HH:MM — delete this line to accept`
       where datetime is UTC at time of write.
     - For each AI-fillable section (`## Background`, `## Verification Criteria`, `## Implementation Details`,
       `## Dependencies`, `## Tasks`, `## Scope of Changes`, `## Security Considerations`,
       `## Testing Checklist`, `## Links`, `## Config Changes`, `## Document Changes`):
       - **Section is empty or contains only template comments** (`<!-- ... -->`):
         Fill with AI content from skill outputs; prepend the 🤖 marker as the first content line.
       - **Section contains the 🤖 marker** (`> 🤖 AI Generated on`):
         Not yet accepted by human. Replace everything from the marker line to the end of the section
         (i.e., up to the next `##` heading or end-of-document). Update the datetime to the current run time.
       - **Section has content but NO 🤖 marker**:
         Human has accepted or edited the content. Do NOT overwrite. Append AI's new proposed content
         at the bottom of the section with a fresh dated marker above it.
     - **Sacred fields** (`## Estimate`, `## Developer Notes`): skip entirely — no write, no append.
     - If the live description is completely unstructured (no `##` headers at all): prepend the
       template skeleton above the existing content with a `---` separator, then proceed with
       per-section fill logic above.
     - **Mixed section convention** (e.g. Testing Checklist): human items written above the 🤖 marker
       are preserved. AI block runs from the marker to end of section. No explicit end tag needed —
       the next `##` heading is the implicit boundary.

4. **HITL Gate 2** — see [Shared: HITL Gates](#shared-hitl-gates) — Gate: **task_update**.
   - Show diff of proposed Linear description update.
   - In `auto`: skip gate.
   - In `review` / `manual` / applicable `custom`: confirm before writing.

5. **Resolve state ID** (CRITICAL — do not skip):
   1. Call `linear_list_workflow_states` with the team ID from `task.team.id`.
   2. Find the entry where `name` = `"In Review"` (or the project-configured target state from `docs/tasks/config.yaml`).
   3. Extract its `id` field (UUID).
   4. Call `linear_update_issue` with `{ "id": "<task-id>", "stateId": "<uuid>", "description": "<merged-template>" }`.
   - Never pass a state name string directly to `linear_update_issue`; it requires the UUID.

6. **Comment** — call `linear_create_comment` with a brief summary: what was done, PR link, skill used.

7. **Log session** — write / append to `history/tasks/<id>/session.md`:
   ```
   phase: 5-complete
   timestamp: <ISO8601>
   pr_url: <PR_URL>
   hitl_mode: <mode>
   ```
   In `auto` mode, prefix each write with `[hd-task auto]` for audit trail.

### Optional: Code Review Gate

Before merging, consider running a code review to gate the diff:

```
/hd-code-review <task-url>
```

This is non-blocking — hd-task does not wait for or require the result.
`hd-code-review` reads the same task URL for requirements context and reviews
the current branch vs `main` across 11 aspects.
Skip if code review is not part of your team's workflow.

### Phase 6: Changelog

1. Check `docs/tasks/config.yaml` field `state_machine.auto_detect_done_and_run_changelog` (default: `true`).
2. If the Linear task status is now `Done` (or moved to Done in this session): invoke `skill("hd-changelog")` passing the task URL.
3. Log completion to `history/tasks/completed.log`:
   ```
   <id> | <date> | <hitl-mode> | pending-review
   ```

---

## Mode B: Finalize *(internal hook — not a user-facing command)*

Entry point for sub-skills (hd-planning, hd-issue-resolution, etc.) that have completed work
and need to trigger Phase 5+6 without re-running routing or execution. Human users should
re-run `hd-task <url>` instead — the state machine detects In Review and skips execute automatically.
Runs Phase 0 auth only, then Phase 5 and Phase 6. Skips fetch, route, and execute entirely.

**ID resolution** — if argument is a bare ID (e.g. `HDMW-317` without a full URL):
1. Read `docs/tasks/config.yaml` field `linear.workspace`.
2. Construct URL: `https://linear.app/<workspace>/issue/<id>`.
3. Proceed with that URL.

### Steps

1. **Auth resolve** — run [Auth Resolution](#shared-auth-resolution) using the Linear adapter config.
2. **MCP probe** — run [Platform Probe](#shared-platform-probe).
3. **Fetch task** — call `linear_get_issue` to get current title, description, and team ID.
4. **Phase 5: Close Loop** — execute all steps from Phase 5 above.
5. **Phase 6: Changelog** — execute Phase 6 above.

---

## Shared: Auth Resolution

Three-path chain — first match wins:

| Priority | Source | How |
|----------|--------|-----|
| 1 | `<project-root>/.env` | Load file; read `LINEAR_API_KEY` (or adapter `auth.key`) |
| 2 | `skills/hd-task/.env` | Load file; read same key |
| 3 | Shell environment | Read `os.environ[auth.key]` |

If no value found in any path: print `<auth.key> not found. Add it to <project-root>/.env or run hd-task init.` and exit.

---

## Shared: Platform Probe

1. Load adapter file matched in Phase 0 (`adapters/<platform>.json`).
2. If `adapter.tools` is null (fallback-only adapter, e.g. Jira, ClickUp): skip MCP probe; proceed directly to fallback script.
3. Read `tools.get_task` — this is the MCP tool name to probe (e.g. `linear_get_issue`).
4. Check if that MCP tool is available in the current context.
   - **Available** → use MCP tools from `adapter.tools` map for all calls.
   - **Not available, `fallback_script` is set** → use `python3 skills/hd-task/<fallback_script>` for all calls.
   - **Not available, no fallback** → print `<platform> MCP not active. Run hd-mcp to set up <adapter.mcp_server>.` and exit.
5. **Auth validation** — after selecting backend (MCP or fallback), verify the API key is valid:
   - MCP path: if the first `get_task` call returns a 401 / "Unauthorized" / "Invalid API key" error: print `<adapter.auth.key> is invalid or expired. Update it in .env or re-run hd-task init.` and exit. Do not retry.
   - Fallback path: the fallback script exits with the same message on HTTP 401.
   - **Key never printed** — error message names the variable only, not its value.

---

## Shared: State Machine

Default behavior table. Override any row via `docs/tasks/config.yaml` `state_machine` section.

| Linear Status | Phase 2 Behavior | Notes |
|--------------|-----------------|-------|
| Backlog | Proceed to routing | Standard start state |
| Todo | Proceed to routing | Standard start state |
| In Progress | Check session → resume or start | Warn if stale |
| In Review | PR assist + checklist only | Skip execution phases |
| Done | Offer changelog; exit | No re-execution |
| Cancelled | Warn + exit | No execution |

**Stale threshold**: `state_machine.stale_days` in `docs/tasks/config.yaml` (default: `5`).

---

## Shared: HITL Gates

**Config priority**: CLI flag (`--auto` / `--manual`) > `docs/tasks/config.yaml` `hitl.mode` > skill default (`review`).

| Mode | Behavior |
|------|----------|
| `auto` | No gates. All writes proceed immediately. Full audit trail logged to `history/tasks/<id>/session.md`. |
| `review` | One confirmation before any write (Gate: task_update). Other gates skipped. **Default.** |
| `manual` | Gate at every phase transition. |
| `custom` | Per-gate config from `docs/tasks/config.yaml` `hitl.gates`. |

**Gate inventory**:

| Gate | Phase | `auto` | `review` | `manual` | `custom` key |
|------|-------|--------|----------|----------|-------------|
| routing | 3 | skip | skip | confirm | `gates.routing` |
| execution | 4 | skip | skip | confirm | `gates.execution` |
| task_update | 5 | skip | **confirm** | confirm | `gates.task_update` |
| changelog | 6 | skip | skip | confirm | `gates.changelog` |

**Auto mode audit trail** — even with no gates, log every write:
```
[hd-task auto] Updated <id>: merged Implementation Details
[hd-task auto] Created branch: feat/<id>-<slug>
[hd-task auto] PR #<N> created and linked
[hd-task auto] Changelog updated
[hd-task auto] Done. Review: history/tasks/<id>/session.md
```

---

## Shared: Session State

**Directory structure** — created on first invocation of any task:

```
history/tasks/<id>/
  session.md      ← phase markers, timestamps, PR URL, HITL mode
  summary.md      ← human-readable summary of what was done (written at Phase 5)
```

**`session.md` format**:

```
task_id: <id>
task_url: <url>
started: <ISO8601>
hitl_mode: <auto|review|manual|custom>

phase: 0-complete | timestamp: <ISO8601>
phase: 1-complete | timestamp: <ISO8601>
phase: 2-complete | routed_to: <skill> | timestamp: <ISO8601>
phase: 3-complete | gate: skipped|confirmed | timestamp: <ISO8601>
phase: 4-complete | timestamp: <ISO8601>
phase: 5-complete | pr_url: <url> | state_id: <uuid> | timestamp: <ISO8601>
phase: 6-complete | timestamp: <ISO8601>
```

**Resume logic**:
1. On invocation, check if `history/tasks/<id>/session.md` exists.
2. Read the last `phase: N-complete` line to get last completed phase.
3. Offer: `Resume from Phase <N+1>? [Y/n/restart]`
4. `Y` → jump to Phase N+1, reuse task data from session.
5. `restart` → delete session file, start from Phase 0.

**Stale detection**: if `task.updatedAt` is more than `state_machine.stale_days` days before today, warn at Phase 1 step 6.

---

## Mode C: Consolidate

Entry point for async human review of completed tasks. Runs independently of the main pipeline — no
task execution, no Linear writes. The goal is to surface comprehension gaps between what the AI did
and what the developer understood.

### Scope Variants

| Invocation | Entry Set |
|------------|-----------|
| `hd-task consolidate` | All entries in `history/tasks/completed.log` with status `pending-review` |
| `hd-task consolidate <url\|id>` | Single task — resolved to an ID the same way Mode B resolves IDs |
| `hd-task consolidate --sprint` | All completed tasks from the current Linear sprint cycle |

**Sprint variant**: Call `linear_search_issues` with a `cycle` filter scoped to the current active
cycle. Match returned issue IDs against `history/tasks/completed.log`. Process only tasks that
appear in both the sprint results and the log (i.e. tasks tracked by `hd-task`). Tasks in the
sprint but absent from the log are silently skipped — they were not managed by this skill.

### Per-Entry Review Flow

For each entry in the resolved entry set, execute the following steps in order:

**Step 1 — Present summary.**
Read `history/tasks/<id>/summary.md`. Display the following fields to the developer:

- What was done (the core change or fix)
- Files changed (from session or git diff recorded at Phase 5)
- PR link (from `session.md` `pr_url` field)
- Estimated vs actual time if recorded

**Step 2 — Prompt for developer account.**
Ask exactly: `"In your own words, what did this task accomplish?"`

Wait for a free-text response. Do not offer hints or leading phrasing.

**Step 3 — Score comprehension on three dimensions.**

| # | Dimension | Pass condition |
|---|-----------|---------------|
| 1 | Core fix/change | Account matches primary change in `summary.md` |
| 2 | Key files/components | ≥1 significant changed file or component named (module-level OK) |
| 3 | Secondary changes | If `summary.md` notes secondary changes, ≥1 acknowledged |

Score each dimension independently: pass (1) or fail (0). Total score is 0–3.

**Step 4 — Apply verdict.**

| Score | Verdict | Status to write |
|-------|---------|----------------|
| 3/3 | ✅ aligned — full comprehension confirmed | `reviewed` |
| 2/3 | ⚠️ partial — gap noted, acceptable to proceed | `reviewed-with-warning` |
| ≤1/3 | ❌ misaligned — developer understanding insufficient | `reviewed-with-flag` |

For `reviewed-with-warning`: state the missed dimension clearly, e.g.:
`"Note: secondary changes (e.g. migration HDMW-317-add-index.sql) were not mentioned. This is
noted but does not block merge."`

For `reviewed-with-flag`: output:
`"Review PR carefully before merging: <pr_url>. Your account did not align with the recorded
changes on dimensions: <list>."`

**Step 5 — Update `completed.log`.**
Rewrite the matching entry in `history/tasks/completed.log` with the new review status. Preserve
the other fields unchanged. Format:

```
<id> | <date> | <hitl-mode> | <review-status>
```

Example statuses written by consolidate:
```
HDMW-317 | 2026-02-25 14:30 | auto   | reviewed
HDMW-318 | 2026-02-25 16:45 | review | reviewed-with-warning
HDMW-319 | 2026-02-26 09:00 | auto   | reviewed-with-flag
```

**Step 6 — Write session summary.**
After all entries in the current invocation are processed, write
`history/tasks/consolidate-YYYYMMDD.md` (using today's date). If the file already exists for today,
append a new session block separated by `---`.

Session summary format:

```markdown
# Consolidate Session — YYYY-MM-DD

## Reviewed

| ID | Result | Gap |
|----|--------|-----|
| HDMW-317 | ✅ reviewed | — |
| HDMW-318 | ⚠️ reviewed-with-warning | Secondary changes not mentioned |
| HDMW-319 | ❌ reviewed-with-flag | Core fix and files both missed |

## Notes

<any free-text observations about patterns across this session>
```

### Consolidate: No Entries Found

If the resolved entry set is empty (no `pending-review` entries, or sprint returns no matches):
print `No pending-review tasks found.` and exit cleanly — do not error.

---

## Mode D: Init

First-run project setup wizard. Idempotent when re-run. Each step is atomic: if the skip condition
is met, print a one-line note and advance to the next step. The developer can abort at any step by
entering `q` or `Ctrl-C`.

### Step 1 — Existing config check

Check whether `docs/tasks/config.yaml` already exists in the project root.

- **Not found**: proceed.
- **Found**: print `docs/tasks/config.yaml already exists.` then ask:
  `Overwrite and re-run init? [y/N]`
  - `N` (default): exit.
  - `y`: continue through remaining steps; existing config will be overwritten at Step 4.

### Step 2 — Detect Linear workspace

Call `linear_list_teams` to retrieve the list of teams accessible with the current or anticipated
API key.

- Display the team list with workspace slugs.
- Ask: `Confirm workspace slug [<detected-slug>]:`
- If the developer presses Enter without input, use the detected slug.
- Store the confirmed slug as `<workspace-slug>` for use in Steps 4 and 5.

If `linear_list_teams` is not available (MCP not active), fall back to:
`Enter your Linear workspace slug manually:` and accept free text.

### Step 3 — API key setup

Prompt: `Paste your LINEAR_API_KEY (format: lin_api_...):` — input is masked.

Validation:
- Must start with `lin_api_` — if not, print `Invalid format. LINEAR_API_KEY must start with lin_api_.` and re-prompt.
- Maximum 3 attempts; on third failure print `Aborting. You can set LINEAR_API_KEY manually in .env.` and exit.

Storage location:
Ask: `Store in project .env or skill .env? [project/skill] (default: project):`

- **project** (default): write `LINEAR_API_KEY=<value>` to `<project-root>/.env`.
  Then check `<project-root>/.gitignore` — if `.env` is not already listed, append `.env` on a new
  line. Print `Added .env to .gitignore.`
- **skill**: write `LINEAR_API_KEY=<value>` to `skills/hd-task/.env`. No `.gitignore` change needed
  (skill directory is within the skill repo, not the project repo).

### Step 4 — Create docs/tasks/ structure

Create the following files (overwrite if re-running init):

**`docs/tasks/config.yaml`** — generated from this template, with `<slug>` replaced by the
confirmed workspace slug from Step 2:

```yaml
# Linear workspace (auto-detected by hd-task init)
linear:
  workspace: <slug>

# Template resolution
templates:
  match_by_linear_project_key: true   # e.g., HDMW.md → HDMW Linear project

# Routing overrides
routing:
  bug_labels: ["bug", "defect", "regression"]
  feature_labels: ["feature", "story", "enhancement"]
  brainstorm_labels: ["design", "discussion", "spike"]
  force_brainstorm_before_planning: false

# State machine
state_machine:
  require_implementation_details_before_proceed: true
  auto_detect_done_and_run_changelog: true
  stale_days: 5

# HITL
hitl:
  mode: review              # auto | review | manual | custom
  gates:                    # only used if mode: custom
    routing: false
    execution: false
    task_update: true
    changelog: false
  sacred_fields:
    - "## Developer Notes"
    - "## Estimate"

# Security
security:
  pii_filter: false         # set true if tasks may contain customer PII
                            # (e.g. bug reports, support tickets, CRM-linked issues)

# Bulk task processing (hd-tasks)
tasks:
  default_status_filter: ["Backlog", "Todo"]   # statuses shown in hd-tasks list
  max_display: 50                               # max tasks to render in list
  warn_dispatch_above: 3                        # warn when dispatching > N tasks
```

**`docs/tasks/templates/default.md`** — copied verbatim from
`skills/hd-task/templates/default.md`. If `docs/tasks/templates/` directory does not exist, create
it. Do not overwrite if the project already has a customized copy and the developer chose not to
overwrite in Step 1 (re-run guard applies here too).

### Step 5 — Append to AGENTS.md

Check `<project-root>/AGENTS.md` for an existing `## hd-task Config` section.

- **Already present**: print `AGENTS.md already contains ## hd-task Config — skipping.` Do not
  modify.
- **Not present**: append the following block to the end of `AGENTS.md`, preceded by a blank line:

```markdown
## hd-task Config
- Linear workspace: <slug>
- HITL mode: review
- Template: docs/tasks/templates/default.md
```

This append is strictly additive — never rewrite or truncate any existing content in `AGENTS.md`.

### Step 6 — Print success summary

Print:

```
hd-task init complete.

  Config:    docs/tasks/config.yaml
  Template:  docs/tasks/templates/default.md
  API key:   stored in <location>

Next step:
  hd-task <task-url>
```

If any step was skipped (skip condition met), list it in the summary:
`  Skipped:   AGENTS.md already had ## hd-task Config`

---

---

## Security

### API Key Handling

> **Never commit `LINEAR_API_KEY` to version control.**

- Keys are stored in `.env` files or the shell environment — never in `.mcp.json` or any committed file.
- `mcp.json` uses `${LINEAR_API_KEY}` placeholder; the shell expands it at runtime. Claude Code never stores the value.
- For MCP server setup, run `/hd-mcp` (user-scope). Do not manually edit `.mcp.json` with a real key.
- Mode D init wizard enforces: when writing the key to `<project-root>/.env`, it checks `.gitignore` and adds `.env` if missing.
- If key is invalid or missing, hd-task exits with a clear message (`LINEAR_API_KEY not found` or `LINEAR_API_KEY is invalid`) — the key value is never printed.
- All API calls use HTTPS (`https://api.linear.app/graphql`). No HTTP fallback.
- Session logs (`history/tasks/<id>/session.md`) record phase markers, timestamps, PR URLs, and HITL mode — never auth tokens.

### PII Filter

The PII filter is **opt-in** (`security.pii_filter: false` by default). When enabled, redaction runs before the task description enters any Claude context.

**What is redacted:**
| Type | Pattern | Replacement |
|------|---------|-------------|
| Email addresses | Standard email format | `[REDACTED-EMAIL]` |
| Phone numbers | US/intl basic patterns | `[REDACTED-PHONE]` |
| Credit card numbers | 16-digit groups | `[REDACTED-CARD]` |

**What is NOT redacted (document this to your team):**
- Personal names
- Physical addresses
- National IDs / passport numbers
- Internal user IDs
- Custom business identifiers

> **Limitation**: The PII filter does not guarantee complete PII removal. Review task content before enabling `auto` HITL mode with sensitive data. For high-PII environments, use `review` or `manual` mode so a developer inspects the description before it is processed.

**Storage**: when `pii_filter: true`, `history/tasks/<id>/summary.md` stores only the redacted version of the task description — the original is never written to disk by hd-task.

---

## Quick Reference

| Command | Action |
|---------|--------|
| `hd-task <url>` | Full lifecycle for a Linear task |
| `hd-task <url> --no-pr` | Full lifecycle; push branch, skip PR creation |
| `hd-task <url> --no-git` | Full lifecycle; skip all git operations |
| `hd-task <url> --no-promote` | Full lifecycle; skip task description update in PM tool |
| `hd-task consolidate` | Batch async review of all pending-review tasks |
| `hd-task consolidate <url\|id>` | Review one specific task |
| `hd-task consolidate --sprint` | Batch review current sprint |
| `hd-task init` | First-run project setup |
| `hd-task --auto <url>` | Full lifecycle, no gates |
| `hd-task --manual <url>` | Full lifecycle, gate at every phase |

| Need | Action |
|------|--------|
| State ID for `linear_update_issue` | Call `linear_list_workflow_states` first; match `name`; use `id` UUID |
| Capture PR URL | `PR_URL=$(gh pr create --fill --json url -q .url)` |
| Link PR to task | `linear_create_attachment` with `issueId`, `url`, `title` |
| AI content marker | `> 🤖 AI Generated on YYYY-MM-DD HH:MM — delete this line to accept` |
| Accept AI content | Delete the `> 🤖 AI Generated on…` line in the PM tool — no command needed |
| AI re-run safe | Marker present → overwrite; marker absent (accepted) → propose-only at section bottom |
| PII redaction | `python3 skills/hd-task/scripts/adapters/linear_fallback.py --redact-pii "<text>"` |
| Init not run | Phase 0 exits: `Run hd-task init first to configure this project.` |
| Adapter not implemented | Phase 0 exits: `<platform> adapter is not yet implemented.` |
| No MCP + no fallback | Platform Probe exits: `Run hd-mcp to set up @linear/mcp-server.` |
