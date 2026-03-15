---
name: hd-estimation
description: Create quick ballpark ETA reports for bidding with agent-supported estimates by default, plus optional side-by-side human comparison. Use when estimating effort for new projects - focuses on solution approach and rough hours. Target < 33 minutes per estimate.
license: proprietary
metadata:
  version: "4.5.2"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Ballpark ETA Skill

Quick estimates to win bids. Solution-focused, not code-focused.

```
GOAL: Ballpark estimate to WIN BIDS (< 33 min)
MODE: Default = client-safe `eta.md` + transparent `eta-agent.md` + comparison `eta-agent-human.md`
DO: Configure -> Input -> Research -> Solution -> ETA Table
NOT: Detailed tasks, coding specs, exact hours, pricing
```

---

## Workflow (5 Phases)

```
Phase 0: Configuration (1-2 min)
    |
Phase 1: Collect & Extract (5-10 min)
    |
Phase 2: Research & Solution (10-15 min)
    |   includes: approach mode → single or variants
    |
Phase 3: ETA Table (5-10 min per approach)
    |
Phase 4: Export (optional, 1-2 min)
    |   export to DOCX/PDF for client delivery
```

---

## Phase 0: Configuration (1-2 min)

### 0.1 Storage Intent (ask first)

Always ask:

```
Where should I store this estimate?

1. Current workspace — tied to this codebase/task
2. General/client estimate — shared estimation storage

Your choice (1-2): [2]
```

Set `$SCOPE`:
- `workspace` for choice 1
- `general` for choice 2

### 0.2 Resolve Base Directory

If `$SCOPE = workspace`:
- `$BASE_DIR = <current working directory>`

If `$SCOPE = general`:
1. Check env `HD_HOME`
2. Else check `hd_data_dir` in `~/.hd/config.yaml`
3. If both are missing, run a friendly recovery prompt:

```
I couldn't find shared storage config (`HD_HOME` or `hd_data_dir`).
How should we proceed?

1. Use default `~/.hd` for now
2. Enter a custom base folder for this run
3. Set a permanent base folder in `~/.hd/config.yaml` (`hd_data_dir`)

Your choice (1-3): [1]
```

- [1] → `$BASE_DIR = ~/.hd`
- [2] → user provides path; validate writable; if invalid, re-prompt with suggested valid path
- [3] → user provides path; write/merge `hd_data_dir` into `~/.hd/config.yaml`; then use it as `$BASE_DIR`

After resolving, set:
- `$PLANS_ROOT = $BASE_DIR/plans`
- `$PLAN_DIR = $PLANS_ROOT/YYYYMMDD-<project-slug>`

Show one confirmation line before continuing:

```
Saving this estimate to: $PLAN_DIR
```

### 0.3 Audience

**If `--audience` arg provided:** Use it directly, skip prompt.

**Otherwise, ask:**

```
Who is this estimate for?

1. Internal — team planning (technical, concise)
2. Client — external proposal (professional, detailed)

Your choice (1-2): [2]
```

**Save to `$PLAN_DIR/config.md`** using `reference/config-template.md`.

**Reuse:** If `config.md` already exists in `$PLAN_DIR`, load it and skip prompt.

---

## Phase 1: Collect & Extract

### 1.1 Collect Assets

```
Please share all available assets:
- PDF/Word documents (SOW, specs, requirements)
- Images/Screenshots (mockups, designs, wireframes)
- Markdown/Text files (notes, user stories)
- URLs (Figma, existing site, references)

Reply "done" when finished.
```

### 1.2 Process Assets

| Asset Type | Tool | Fallback |
|------------|------|----------|
| Image/Screenshot | `look_at` | — |
| PDF | `look_at` | `skill("pdf")` |
| DOCX | `skill("docx")` | — |
| Markdown/Text | `Read` | — |
| URL | `read_web_page` | — |

Copy assets to `$PLAN_DIR/assets/`. Create `assets.md` registry.

If `$SCOPE = general`, still copy all referenced local assets (PDF/DOCX/images/etc.) into `$PLAN_DIR/assets/` so the estimate remains portable outside the current repository.

### 1.3 Create Context File

Save extracted info to `$PLAN_DIR/context.md`:

```markdown
# Context: <Project Name>

## Assets Received
| # | Type | Name | Summary |

## Key Requirements
1. ...

## Screens Identified
- ...

## Open Questions
- ...
```

---

## Phase 2: Research & Solution

### 2.1 Clarify (if needed)

| Domain | Questions |
|--------|-----------|
| **Platform** | Web only? Mobile? Responsive? PWA? |
| **Auth** | SSO? OAuth providers? 2FA? |
| **Payment Integrations** | Stripe? PayPal? In-app purchase (iOS/Android)? Local/regional gateways? |
| **API Integrations** | Third-party APIs (maps, CRM, ERP, shipping, social)? Docs available? Rate limits? |
| **Other Integrations** | Error tracking (Sentry)? Analytics (GA, Mixpanel)? Marketing (HubSpot, Mailchimp)? Logging? |
| **Technical Stack Constraints** | Client-required tech (Java, .NET, Oracle, Salesforce, SAP)? Otherwise AI chooses best fit. |
| **Data** | Migration needed? Volume? Existing DB schema to preserve? |
| **Timeline** | Hard deadline? Phased delivery? |
| **Existing Codebase** | Greenfield? Extending existing system? Legacy migration? |
| **Scale** | Expected concurrent users? Performance SLAs? Peak load? |
| **Compliance** | GDPR? HIPAA? PCI-DSS? SOC 2? CCPA? WCAG 2.1? ISO 27001? |
| **Notifications** | Email? Push (mobile)? SMS? In-app? |
| **Multi-tenancy** | Single org or multi-tenant SaaS? |

### 2.2 Research

| Need | Tool (Amp / Claude / hdcode) |
|------|------|
| Library docs | `Librarian` agent / `exa_get_code_context` |
| Tech comparison | `web_search` |
| Architecture advice | `oracle` (Amp/hdcode) / `Plan` subagent (Claude) |
| Similar solutions | `web_search` |

### 2.3 Variant Proposal + Mandatory Human Confirmation (HITL Gate)

Before selecting approach mode, the AI must propose candidate variants first, then wait for explicit human confirmation.

Required flow:

1. AI proposes variant candidates (even when a single approach may be enough), each with:
   - Display name
   - 1-line approach summary
   - Why/when to choose it
   - Primary trade-off
2. AI marks one option as a recommendation with rationale.
3. AI asks the user to confirm one of these decisions:
   - Proceed with a single selected variant
   - Keep multiple variants for side-by-side estimation
   - Request changes (add/remove/merge variants)
4. Do not continue to Phase 2.4 or Phase 3 until explicit user confirmation is received.

Mandatory prompt pattern:

```
Here are the proposed implementation variants:

1. <Variant A> — <summary>
2. <Variant B> — <summary>
3. <Variant C> — <summary>

Recommended: <Variant X> (<1-2 sentence rationale>)

How should we proceed?
1. Use one variant only (specify which)
2. Keep multiple variants for comparison
3. Revise variants first (tell me what to change)

Reply with your choice. I will not continue until you confirm.
```

Set `$APPROACH_MODE` only after confirmation:
- `single` when user confirms one variant only
- `variants` when user confirms multiple variants

**Rule:** Auto-detection may inform recommendations, but must never bypass the confirmation gate.

### 2.4 Solution Approach (Post-Confirmation Only)

**If `$APPROACH_MODE = single`:**

Save to `$PLAN_DIR/solution.md` — stack table + architecture summary (2-3 sentences) + key decisions.

**If `$APPROACH_MODE = variants`:**

Generate only the user-confirmed variants (typically 2-3). For each confirmed variant, save to `$PLAN_DIR/solution-<variant-slug>.md`:

```markdown
# Solution: <Variant Display Name>

## Approach Summary
[2-3 sentences describing HOW this approach builds the system]

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Backend** | [Technology] | [1 sentence] |
| **Frontend** | [Technology] | [1 sentence] |
| **Database** | [Technology] | [1 sentence] |
| **Hosting** | [Platform] | [1 sentence] |

## Best For
- [scenario 1]
- [scenario 2]

## Not Ideal For
- [scenario 1]
- [scenario 2]

## Trade-offs
| Aspect | Assessment |
|--------|------------|
| **Delivery Speed** | Fast / Medium / Slow |
| **Flexibility** | High / Medium / Low |
| **Maintenance Burden** | Low / Medium / High |
| **Initial Cost** | Low / Medium / High |
| **Long-term Cost** | Low / Medium / High |

## Key Risks
- [risk 1]
- [risk 2]
```

#### Variant Slug Naming Rules

1. Generate lowercase kebab-case slug from approach name (e.g., "Custom Build" → `custom-build`, "WordPress" → `wordpress`, "Headless CMS" → `headless-cms`).
2. Max 3 words in slug; truncate longer names to essential terms.
3. No special characters except hyphen.
4. If collision occurs, append numeric suffix: `-v2`, `-v3`.
5. Store only confirmed variants in `$PLAN_DIR/variants.md`:

```markdown
# Approach Variants

## Variants

| # | Display Name | Slug | Recommended |
|---|--------------|------|-------------|
| 1 | <Variant A> | <variant-a-slug> | ★ / |
| 2 | <Variant B> | <variant-b-slug> | ★ / |
| 3 | <Variant C> | <variant-c-slug> | ★ / |

## Assumptions and Constraints

### Shared Assumptions
- [assumption 1]
- [assumption 2]

### Hard Constraints
- [constraint 1]
- [constraint 2]

### Out of Scope
- [out-of-scope 1]
- [out-of-scope 2]

## Decision Criteria Weights

| Criteria | Weight | Notes |
|----------|--------|-------|
| <Criteria 1> | <weight> | [notes] |
| <Criteria 2> | <weight> | [notes] |
| <Criteria 3> | <weight> | [notes] |
| <Criteria 4> | <weight> | [notes] |
| <Criteria 5> | <weight> | [notes] |

## Effort Summary

| Metric | <Variant A> | <Variant B> | <Variant C> |
|--------|-------------|-------------|-------------|
| **Base Hours** | <value> | <value> | <value> |
| **Buffer (+20%)** | <value> | <value> | <value> |
| **Total Hours** | **<value>** | **<value>** | **<value>** |
| **Duration (<N> devs)** | <value> | <value> | <value> |
| **...** | ... | ... | ... |

First 3 rows (Base/Buffer/Total) are always present. Add duration rows dynamically based on likely team sizes for this project.

## Feature and Capability Comparison

| Criteria | <Variant A> | <Variant B> | <Variant C> |
|----------|-------------|-------------|-------------|
| **<criteria 1>** | [value] | [value] | [value] |
| **<criteria 2>** | [value] | [value] | [value] |
| **...** | ... | ... | ... |

Generate rows dynamically based on what matters for this project. Use ✅/⚠️/❌ markers where helpful.

## Pros and Cons by Variant

### <Variant A>
**Pros**
- [pro 1]
- [pro 2]
- [pro 3]

**Cons**
- [con 1]
- [con 2]
- [con 3]

### <Variant B>
**Pros**
- [pro 1]
- [pro 2]
- [pro 3]

**Cons**
- [con 1]
- [con 2]
- [con 3]

### <Variant C>
**Pros**
- [pro 1]
- [pro 2]
- [pro 3]

**Cons**
- [con 1]
- [con 2]
- [con 3]

## Risk Register and Mitigations

| Risk | Variant(s) | Probability | Impact | Mitigation | Owner |
|------|------------|-------------|--------|------------|-------|
| [risk] | [variant] | Low/Med/High | Low/Med/High | [mitigation] | [owner] |

## Operational Model Comparison

| Operational Area | <Variant A> | <Variant B> | <Variant C> |
|------------------|-------------|-------------|-------------|
| <area 1> | [value] | [value] | [value] |
| <area 2> | [value] | [value] | [value] |
| **...** | ... | ... | ... |

Generate rows dynamically based on the project's operational profile.

## Recommendation Summary

| | <Variant A> | <Variant B> | <Variant C> |
|--|-------------|-------------|-------------|
| **Best for** | [best fit] | [best fit] | [best fit] |
| **Avoid if** | [avoid condition] | [avoid condition] | [avoid condition] |
| **Risk level** | [level] | [level] | [level] |

## Overall Verdict

[2-4 paragraphs with the final recommendation and why it best matches the weighted criteria and hard constraints]

## Confidence and Sensitivity

| Item | Value |
|------|-------|
| Recommendation Confidence | High / Medium / Low |
| Biggest Unknown | [unknown] |
| If Unknown Changes | [delta impact on hours/risk] |

## Final Decision Log

| Field | Value |
|-------|-------|
| Selected Variant | [variant name] |
| Decided By | [human name/role] |
| Decision Date | [YYYY-MM-DD] |
| Reason | [short rationale] |
```

Keep this template concise and generic. Do not copy domain-specific or client-specific option names into the skill spec.

#### Variant Context Files (Optional)

If a variant has **distinct assumptions, scope boundaries, or constraints** not shared by other variants, create `$PLAN_DIR/context-<variant-slug>.md`:

```markdown
# Context: <Variant Display Name>

## Variant-Specific Assumptions
- [assumption 1]
- [assumption 2]

## Scope Differences from Base
- [difference 1]
- [difference 2]

## Constraints
- [constraint 1]
- [constraint 2]
```

**Rule:** Only create variant-specific context files when requirements diverge meaningfully. If differences are minor, document in `variants.md` instead.

---

## Phase 3: ETA Table

### Epic Sizing Guide

**Agent-Assisted:**

| Size | Hours | Examples |
|------|-------|----------|
| S | 2-4h | Simple CRUD, basic UI |
| M | 4-10h | Auth, API integration |
| L | 10-20h | Dashboard, complex flows |
| XL | 20-40h | AI/ML, real-time sync |

**Human-Only:**

| Size | Hours | Examples |
|------|-------|----------|
| S | 8-16h | Simple CRUD, basic UI |
| M | 16-40h | Auth, API integration |
| L | 40-80h | Dashboard, complex flows |
| XL | 80-160h | AI/ML, real-time sync |

**Multiplier:** Human-only ≈ 4-5x Agent-assisted

### Common Epic Estimates

| Tier | Epic Type | Size | Agent | Human Only |
|------|-----------|------|-------|------------|
| T1 | Setup/Infra | S-M | 4-8h | 8-16h |
| T1 | Auth/Login | M | 12-16h | 24-32h |
| T1 | User Management | M | 8-12h | 16-24h |
| T1 | RBAC/Permissions | M | 10-16h | 20-32h |
| T1 | Email Templates | S | 4-8h | 8-16h |
| T1 | Social Login (OAuth) | S | 4-8h | 8-16h |
| T1 | Settings/Preferences | S | 4-8h | 8-16h |
| T1 | Dashboard | L | 24-32h | 48-64h |
| T1 | CRUD module | M | 10-15h | 20-30h |
| T1 | Admin panel | M | 10-16h | 20-32h |
| T1 | Notifications | S-M | 4-10h | 8-20h |
| T1 | Testing & QA | M | 8-12h | 16-24h |
| T2 | API integration | M-L | 12-24h | 24-48h |
| T2 | Payment | L | 20-30h | 40-60h |
| T2 | File Upload/Storage | S | 4-8h | 8-16h |
| T2 | Search | S-L | 4-20h | 8-40h |
| T2 | Reports/Export | S-M | 6-12h | 12-24h |
| T2 | Onboarding Flow | S-M | 4-10h | 8-20h |
| T2 | Audit Logs | S | 4-8h | 8-16h |
| T2 | Data Import/Export | S-M | 6-12h | 12-24h |
| T3 | i18n / Localization | M | 8-16h | 16-32h |
| T3 | Landing/Marketing Pages | M | 8-16h | 16-32h |
| T4 | Real-time Updates | L | 12-24h | 24-48h |
| T4 | Public API / Webhooks | M | 8-16h | 16-32h |
| T4 | Org/Workspace Management | L | 16-24h | 32-48h |
| T4 | Dark Mode / Theming | S | 4-8h | 8-16h |
| T4 | Chat / Messaging | L | 16-24h | 32-48h |
| T4 | Map / Geolocation | M | 8-16h | 16-32h |
| T4 | Calendar / Scheduling | M-L | 12-24h | 24-48h |
| T4 | PWA / Offline Support | M | 8-16h | 16-32h |
| T5 | A/B Testing / Feature Flags | S-M | 6-12h | 12-24h |
| T5 | White-labeling / Multi-brand | M-L | 12-24h | 24-48h |
| T5 | AI/ML Integration | L-XL | 20-40h | 40-80h |
| T5 | Advanced Analytics / BI | L | 16-24h | 32-48h |
| T5 | Image Pipeline Optimization | S-M | 6-12h | 12-24h |
| T5 | DB / Query Optimization | M | 8-16h | 16-32h |
| T6 | List Virtualization (Web) | M | 8-16h | 16-32h |
| T6 | List Virtualization (Mobile/RN) | M-L | 12-20h | 24-40h |
| T6 | Animation Performance (60fps) | M | 8-16h | 16-32h |
| T6 | State / Re-render Optimization | M | 8-16h | 16-32h |

> **Tier guide:** T1 = ~90%+ · T2 = ~70-80% · T3 = ~50-60% · T4 = ~30-50% · T5 = ~10-20% · T6 = ≤10% (specialized — add only when explicitly triggered)

### Generate Output

Read report templates for output format.

**If `$APPROACH_MODE = single`:**

Generate three reports:
1. `eta.md` — Primary estimate using `reference/report-template.md` (client-safe wording, no explicit agent label)
2. `eta-agent.md` — Transparent agent-assisted estimate using `reference/report-template-agent.md`
3. `eta-agent-human.md` — Side-by-side comparison using `reference/report-template-agent-human.md` (Agent | Human Only)

Save to:
- `$PLAN_DIR/eta.md`
- `$PLAN_DIR/eta-agent.md`
- `$PLAN_DIR/eta-agent-human.md`

**If `$APPROACH_MODE = variants`:**

For each variant in `variants.md`, generate a file family:

| File | Purpose |
|------|---------|
| `eta-<slug>.md` | Client-safe estimate for this approach |
| `eta-<slug>-agent-human.md` | Side-by-side agent vs human comparison |

Example for 3 variants:
- `eta-custom-build.md`, `eta-custom-build-agent-human.md`
- `eta-wordpress.md`, `eta-wordpress-agent-human.md`
- `eta-headless-cms.md`, `eta-headless-cms-agent-human.md`

Additionally, generate `variants.md` using the full schema defined in Phase 2.4 (no abbreviated version).

**Formula (applies to both single and variant modes):**
```
Total = Sum(epic hours) × 1.2 (buffer)
Duration = Total hours / 40h/week
```

---

## Phase 4: Export (optional, confirmation required)

After generating ETA files, propose export format variants and require explicit user confirmation before running export:

```
I can export using these delivery variants:

1. Markdown only
2. Markdown + DOCX
3. Markdown + PDF
4. Markdown + DOCX + PDF

Recommended: <option + short rationale>

Which variant should I execute?
Reply with 1-4. I will wait for your confirmation before exporting.
```

### Export Process

If and only if user confirms a choice > 1:

1. Call `skill("hd-docs-export")` with:
   - **Input files**:
     - Single mode: `$PLAN_DIR/eta*.md`
     - Variants mode: `$PLAN_DIR/eta-*.md` plus `$PLAN_DIR/variants.md`
    - **Formats**: docx / pdf / docx,pdf based on choice
    - **Output dir**: `$PLAN_DIR/exports/`
    - **Manifest**: `$PLAN_DIR/exports.md`

2. Handle export failures gracefully:
   - If pandoc/PDF engine missing: warn user, keep `.md` files, show install hint
   - Never block the estimation workflow

3. Report export results:
    ```
    Exported 3 files to exports/:
    - eta.docx ✓
    - eta.pdf ✓
    - variants.docx ✓
    ```

### Format-Aware Export

| Choice | Formats | Required Tools |
|--------|---------|----------------|
| 1 | Markdown only | None |
| 2 | DOCX | `pandoc` |
| 3 | PDF | `pandoc` + PDF engine |
| 4 | DOCX + PDF | `pandoc` + PDF engine |

If a required tool is missing for one format, export remaining valid formats and report skipped artifacts.

---

## Output Files

### Single approach mode

| File | Purpose |
|------|---------|
| `$PLAN_DIR/config.md` | Audience configuration |
| `$PLAN_DIR/assets.md` | Asset registry |
| `$PLAN_DIR/assets/` | Asset copies |
| `$PLAN_DIR/context.md` | Extracted requirements |
| `$PLAN_DIR/solution.md` | Tech stack + architecture |
| `$PLAN_DIR/eta.md` | Final ETA report (client-safe wording) |
| `$PLAN_DIR/eta-agent.md` | Transparent ETA report (explicitly agent-assisted) |
| `$PLAN_DIR/eta-agent-human.md` | Side-by-side ETA report (agent vs human-only) |

### Variants mode (additional/replacement files)

| File | Purpose |
|------|---------|
| `$PLAN_DIR/variants.md` | Comparison index with recommendation |
| `$PLAN_DIR/solution-<slug>.md` | Per-variant tech stack + architecture |
| `$PLAN_DIR/context-<slug>.md` | *(optional)* Variant-specific assumptions/constraints |
| `$PLAN_DIR/eta-<slug>.md` | Per-variant client-safe ETA |
| `$PLAN_DIR/eta-<slug>-agent-human.md` | Per-variant side-by-side comparison |

### Export artifacts (if Phase 4 triggered)

| File | Purpose |
|------|---------|
| `$PLAN_DIR/exports/eta*.docx` | DOCX versions of ETA reports |
| `$PLAN_DIR/exports/eta*.pdf` | PDF versions of ETA reports |
| `$PLAN_DIR/exports/eta*.html` | HTML versions of ETA reports (if requested) |
| `$PLAN_DIR/exports/variants.docx` | DOCX version of variants comparison (variants mode) |
| `$PLAN_DIR/exports/variants.pdf` | PDF version of variants comparison (variants mode) |
| `$PLAN_DIR/exports/variants.html` | HTML version of variants comparison (variants mode) |
| `$PLAN_DIR/exports.md` | Export manifest listing all generated files |

---

## Reuse Context

```bash
# Single approach
ls $PLANS_ROOT                                    # List existing projects
Read $PLAN_DIR/context.md                         # Requirements
Read $PLAN_DIR/solution.md                        # Tech decisions
Read $PLAN_DIR/eta.md                             # Previous client-safe ETA
Read $PLAN_DIR/eta-agent.md                       # Previous transparent agent-assisted ETA
Read $PLAN_DIR/eta-agent-human.md                 # Previous side-by-side comparison ETA

# Variants approach
Read $PLAN_DIR/variants.md                        # Comparison index + recommendation
Read $PLAN_DIR/solution-<slug>.md                 # Per-variant tech decisions
Read $PLAN_DIR/context-<slug>.md                  # Per-variant assumptions (if exists)
Read $PLAN_DIR/eta-<slug>.md                      # Per-variant client-safe ETA
Read $PLAN_DIR/eta-<slug>-agent-human.md          # Per-variant side-by-side ETA
```

---

## Principles

1. **Speed wins bids** — first reasonable estimate often wins
2. **Ranges are honest** — "100-140h" better than "120h"
3. **Solution sells** — show you understand HOW to build it
4. **20% buffer always** — never bid without buffer
