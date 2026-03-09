---
name: hd-estimation
description: Create quick ballpark ETA reports for bidding with dual-column estimates (agent vs human). Use when estimating effort for new projects - focuses on solution approach and rough hours. Target < 33 minutes per estimate.
license: proprietary
metadata:
  version: "4.0.0"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Ballpark ETA Skill

Quick estimates to win bids. Solution-focused, not code-focused.

```
GOAL: Ballpark estimate to WIN BIDS (< 33 min)
MODE: Always dual-column — Agent-assisted vs Human-only
DO: Configure -> Input -> Research -> Solution -> ETA Table
NOT: Detailed tasks, coding specs, exact hours, pricing
```

---

## Workflow (4 Phases)

```
Phase 0: Configuration (1-2 min)
    |
Phase 1: Collect & Extract (5-10 min)
    |
Phase 2: Research & Solution (10-15 min)
    |
Phase 3: ETA Table (5-10 min)
```

---

## Phase 0: Configuration (1-2 min)

**If `--audience` arg provided:** Use it directly, skip prompt.

**Otherwise, ask:**

```
Who is this estimate for?

1. Internal — team planning (technical, concise)
2. Client — external proposal (professional, detailed)

Your choice (1-2): [2]
```

**Save to `plans/YYYYMMDD-<project-slug>/config.md`** using `reference/config-template.md`.

**Reuse:** If `config.md` already exists in project folder, load it and skip prompt.

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

Copy assets to `plans/YYYYMMDD-<project>/assets/`. Create `assets.md` registry.

### 1.3 Create Context File

Save extracted info to `plans/YYYYMMDD-<project>/context.md`:

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

| Need | Tool |
|------|------|
| Library docs | `skill("docs-seeker")` |
| Tech comparison | `web_search` |
| Architecture advice | `Plan` subagent |
| Similar solutions | `web_search` |

### 2.3 Solution Approach

Save to `plans/YYYYMMDD-<project>/solution.md` — stack table + architecture summary (2-3 sentences) + key decisions.

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

Read `reference/report-template.md` for output format. Always dual-column (Agent | Human Only).

**Formula:**
```
Total = Sum(epic hours) × 1.2 (buffer)
Duration = Total hours / 40h/week
```

Save final report to `plans/YYYYMMDD-<project>/eta.md`.

---

## Output Files

| File | Purpose |
|------|---------|
| `plans/YYYYMMDD-<project>/config.md` | Audience configuration |
| `plans/YYYYMMDD-<project>/assets.md` | Asset registry |
| `plans/YYYYMMDD-<project>/assets/` | Asset copies |
| `plans/YYYYMMDD-<project>/context.md` | Extracted requirements |
| `plans/YYYYMMDD-<project>/solution.md` | Tech stack + architecture |
| `plans/YYYYMMDD-<project>/eta.md` | Final ETA report |

---

## Reuse Context

```bash
ls plans/                                        # List existing projects
Read plans/YYYYMMDD-<project>/context.md         # Requirements
Read plans/YYYYMMDD-<project>/solution.md        # Tech decisions
Read plans/YYYYMMDD-<project>/eta.md             # Previous ETA
```

---

## Principles

1. **Speed wins bids** — first reasonable estimate often wins
2. **Ranges are honest** — "100-140h" better than "120h"
3. **Solution sells** — show you understand HOW to build it
4. **20% buffer always** — never bid without buffer
