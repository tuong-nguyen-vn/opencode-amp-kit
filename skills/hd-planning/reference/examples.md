# Planning Workflow Examples

## Example 1: New Feature - Billing Module with Stripe

### User Request

"Add a billing module with Stripe integration for subscription management"

---

### Phase 1: Discovery

**Parallel Sub-agents launched:**

```
Task("Explore packages/domain and packages/application structure for entity/usecase patterns")
Task("Search for existing payment or subscription code")
Task("Check package.json for existing Stripe or payment deps")
```

**Librarian query:**

```
librarian("How does a typical TypeScript project structure Stripe integration with Clean Architecture?")
```

**Exa query:**

```
mcp__exa__get_code_context_exa("Stripe Node.js SDK subscription checkout session")
```

**Discovery Report Output:**

```markdown
# Discovery Report: Billing Module

## Architecture Snapshot

- Entity pattern: see `packages/domain/src/entities/user.ts`
- Port pattern: see `packages/domain/src/ports/user-repository.ts`
- Use case pattern: see `packages/application/src/usecases/create-user.ts`
- Router pattern: see `packages/api/src/routers/users.ts`

## Existing Patterns

- No existing billing/payment code
- User entity can be referenced for customer mapping
- Existing validation utilities in `packages/domain/src/validation/`

## Technical Constraints

- Node 20, Bun runtime
- Drizzle ORM
- oRPC for API
- No Stripe SDK currently installed

## External References

- Stripe SDK: `stripe` npm package
- Webhooks: Need raw body for signature verification
- Checkout Sessions: Server-side creation, client redirect
```

---

### Phase 2: Clarification (Interactive)

**Agent presents points needing clarification:**

```markdown
## Clarification Needed

Based on the Discovery Report, I need to clarify the following:

1. **Pricing Model**: How many subscription plans (Free, Pro, Enterprise)?
   - Option 1: Fixed predefined plans
   - Option 2: Custom pricing per customer

2. **Trial Period**: Is a trial period needed?
   - Option 1: 14-day trial before charging
   - Option 2: Charge immediately

3. **Metered Billing**: Charge based on usage?
   - Option 1: Fixed monthly price only
   - Option 2: Usage-based add-ons (API calls, storage, etc.)

---
You can:
- Answer each question
- Say "skip" for me to decide based on best practices
- Say "continue" if no concerns
```

**User Response:**

> "3 plans: Free, Pro ($29/mo), Enterprise (custom). 14-day trial for Pro. No metered billing needed."

**Update Discovery Report:**

```markdown
## Clarifications

| Question        | Answer                                       | Impact                     |
| --------------- | -------------------------------------------- | -------------------------- |
| Pricing Model   | 3 fixed plans: Free, Pro ($29), Enterprise   | Plan entity needs 3 tiers  |
| Trial Period    | 14-day trial for Pro                         | Add trial logic to webhook |
| Metered Billing | Not needed                                   | Simplify - no usage events |

**User Confirmation**: 2025-01-13
```

---

### Phase 3: Synthesis (Plan)

```
# Amp / hdcode
oracle(
  task: "Analyze billing feature requirements against codebase",
  files: ["history/billing/discovery.md"]
)

# Claude
Plan(
  task: "Analyze billing feature requirements against codebase",
  files: ["history/billing/discovery.md"]
)
```

**Plan Output:**

```markdown
# Approach: Billing Module

## Gap Analysis

| Component       | Have           | Need                        | Gap             |
| --------------- | -------------- | --------------------------- | --------------- |
| Customer entity | None           | Subscription, Plan entities | New             |
| Stripe SDK      | None           | stripe package              | Install + spike |
| Webhooks        | Express exists | Raw body middleware         | Modify          |
| UI              | None           | Billing page, checkout      | New             |

## Risk Map

| Component          | Risk | Verification        |
| ------------------ | ---- | ------------------- |
| Stripe SDK import  | HIGH | Spike               |
| Webhook signatures | HIGH | Spike               |
| Entity modeling    | LOW  | Follow User pattern |
| oRPC router        | LOW  | Follow existing     |

## Spike Requirements

1. Spike: Stripe SDK import and typing
2. Spike: Webhook signature verification
3. Spike: Checkout session flow
```

---

### Gate 1: Approve Planning Direction

```markdown
## Planning Checkpoint — Approve Direction

**Goal**: Add billing module with Stripe integration for subscription management
**In scope**: Subscription entity, Stripe checkout, webhooks, billing page
**Out of scope**: Metered billing, invoicing, refunds
**Recommended approach**: Clean Architecture layers (domain → infra → app → API → UI) with Stripe SDK
**Key assumptions**: 3 fixed plans, 14-day trial for Pro, no usage-based billing
**High risks**: Stripe SDK import (HIGH), Webhook signatures (HIGH)

Reply with one:
1. **approve** — proceed with this direction
2. **revise** — <what to change>
3. **stop** — end planning here
```

**User says: approve**

---

### Phase 4: Verification (Spikes)

**Gate 2: Confirm Spike Execution**

```markdown
## Spikes Needed

The following HIGH risk items need verification before planning continues:

1. **Stripe SDK import** — New external dependency, need to verify typing (time-box: 30 min)
2. **Webhook signatures** — Security-critical, need raw body handling (time-box: 30 min)
3. **Checkout session** — Novel flow, need to verify redirect pattern (time-box: 30 min)

Shall I create a spike team to validate these? (yes / skip)
```

**User says: yes**

**Create Spike Team:**

```
team_create(teamName="spike-billing", description="Spike validation for billing module")
```

**Create Spike Tasks:**

```
task_create(
  teamName="spike-billing",
  subject="Spike: Test Stripe SDK import and typing",
  description="## Question\nCan we import Stripe SDK with correct TypeScript types?\n\n## Time-box\n30 minutes\n\n## Output\n`.spikes/billing/stripe-sdk-test/`\n\n## Success Criteria\n- [ ] Working import\n- [ ] Typed customer object\n- [ ] Learnings documented"
)
# → taskId "1"

task_create(
  teamName="spike-billing",
  subject="Spike: Verify webhook signature handling",
  description="## Question\nHow to verify Stripe webhook signatures with raw body?\n\n## Time-box\n30 minutes\n\n## Output\n`.spikes/billing/webhook-test/`\n\n## Success Criteria\n- [ ] Signature verification working\n- [ ] Raw body middleware configured\n- [ ] Learnings documented"
)
# → taskId "2"

task_create(
  teamName="spike-billing",
  subject="Spike: Checkout session creation flow",
  description="## Question\nCan we create checkout sessions server-side and redirect?\n\n## Time-box\n30 minutes\n\n## Output\n`.spikes/billing/checkout-test/`\n\n## Success Criteria\n- [ ] Session created server-side\n- [ ] Redirect to session.url works\n- [ ] Learnings documented"
)
# → taskId "3"
```

**Execute spikes (all independent, can parallelize):**

```
Task() → Worker A: spike task #1 (Stripe SDK)
Task() → Worker B: spike task #2 (Webhook)
Task() → Worker C: spike task #3 (Checkout)
```

Workers execute, write to `.spikes/billing/`:

```
.spikes/billing/
├── stripe-sdk-test/
│   ├── index.ts        # Working import
│   └── learnings.md
├── webhook-test/
│   ├── handler.ts      # Signature verification
│   └── learnings.md
└── checkout-test/
    ├── session.ts      # Checkout session
    └── learnings.md
```

**Complete spike tasks:**

```
task_update(teamName="spike-billing", taskId="1", status="completed",
  description="YES: SDK imports cleanly. Use Stripe namespace for types.")

task_update(teamName="spike-billing", taskId="2", status="completed",
  description="YES: Need raw body. Use stripe.webhooks.constructEvent()")

task_update(teamName="spike-billing", taskId="3", status="completed",
  description="YES: Create session server-side, redirect to session.url")
```

**Clean up spike team:**

```
team_delete(teamName="spike-billing")
```

---

### Phase 5: Decomposition

**Create Feature Team:**

```
team_create(teamName="billing", description="Feature implementation: Billing Module with Stripe")
```

**Create tasks with dependencies:**

```
# Domain layer (no deps, can parallelize)
task_create(teamName="billing",
  subject="Create Subscription entity and SubscriptionRepository port",
  description="## Context\nNew entity following existing User pattern.\n\n## Requirements\n- Subscription entity with fields: id, userId, planId, status, trialEndsAt, currentPeriodEnd\n- SubscriptionRepository port\n\n## Acceptance Criteria\n- [ ] Entity created at packages/domain/src/entities/subscription.ts\n- [ ] Port defined at packages/domain/src/ports/subscription-repository.ts\n- [ ] Passes type-check",
  metadata='{"priority": 2, "fileScope": "packages/domain/**"}')
# → taskId "1"

task_create(teamName="billing",
  subject="Create Plan entity",
  description="## Context\n3 fixed plans: Free, Pro ($29), Enterprise.\n\n## Requirements\n- Plan entity with fields: id, name, stripeProductId, stripePriceId, price, features\n\n## Acceptance Criteria\n- [ ] Entity created\n- [ ] Passes type-check",
  metadata='{"priority": 2, "fileScope": "packages/domain/**"}')
# → taskId "2"

# Infrastructure (depends on domain)
task_create(teamName="billing",
  subject="Implement SubscriptionRepository with Drizzle",
  description="## Context\nFollow existing repository pattern.\n\n## Acceptance Criteria\n- [ ] Repository implements port\n- [ ] CRUD operations working\n- [ ] Passes type-check",
  addBlockedBy="1",
  metadata='{"priority": 2, "fileScope": "packages/infrastructure/**"}')
# → taskId "3"

task_create(teamName="billing",
  subject="Create Drizzle schema for subscriptions and plans",
  description="## Context\nSchema at packages/db/src/schema/.\n\n## Acceptance Criteria\n- [ ] Schema defined\n- [ ] Migration runs successfully",
  addBlockedBy="1,2",
  metadata='{"priority": 2, "fileScope": "packages/db/**"}')
# → taskId "4"

# Application layer
task_create(teamName="billing",
  subject="Implement CreateSubscription use case",
  description="## Context\nFollow existing use case pattern.\n\n## Acceptance Criteria\n- [ ] Use case creates subscription\n- [ ] Handles 14-day trial for Pro plan\n- [ ] Passes type-check",
  addBlockedBy="3",
  metadata='{"priority": 2, "fileScope": "packages/application/**"}')
# → taskId "5"

task_create(teamName="billing",
  subject="Implement CancelSubscription use case",
  description="## Context\nFollow existing use case pattern.\n\n## Acceptance Criteria\n- [ ] Use case cancels subscription\n- [ ] Passes type-check",
  addBlockedBy="3",
  metadata='{"priority": 2, "fileScope": "packages/application/**"}')
# → taskId "6"

# Stripe integration (HIGH risk - has spike learnings)
task_create(teamName="billing",
  subject="Implement Stripe checkout session creation",
  description="## Context\nServer-side checkout session creation.\n\n## Learnings from Spike\n> - Create session server-side, redirect to session.url\n> - Reference: `.spikes/billing/checkout-test/session.ts`\n\n## Acceptance Criteria\n- [ ] Checkout session created for each plan\n- [ ] Redirect to Stripe hosted checkout\n- [ ] Passes type-check",
  addBlockedBy="5",
  metadata='{"priority": 1, "fileScope": "packages/infrastructure/**"}')
# → taskId "7"

task_create(teamName="billing",
  subject="Implement Stripe webhook handler",
  description="## Context\nHandles Stripe webhook events for subscription lifecycle.\n\n## Learnings from Spike\n> - MUST use raw body (not parsed JSON) for signature verification\n> - Use `stripe.webhooks.constructEvent(rawBody, sig, secret)`\n> - Webhook secret from `STRIPE_WEBHOOK_SECRET` env var\n> - Handle: checkout.session.completed, invoice.paid, customer.subscription.deleted\n> - Reference: `.spikes/billing/webhook-test/handler.ts`\n\n## Acceptance Criteria\n- [ ] Raw body middleware configured\n- [ ] Signature verification implemented\n- [ ] Events update subscription status correctly\n- [ ] Passes type-check",
  addBlockedBy="3",
  metadata='{"priority": 1, "fileScope": "packages/api/**"}')
# → taskId "8"

# API layer
task_create(teamName="billing",
  subject="Create billing oRPC router",
  description="## Context\nFollow existing router pattern.\n\n## Acceptance Criteria\n- [ ] Routes for: list plans, create subscription, cancel subscription\n- [ ] Passes type-check",
  addBlockedBy="5,6,7",
  metadata='{"priority": 2, "fileScope": "packages/api/**"}')
# → taskId "9"

# UI layer
task_create(teamName="billing",
  subject="Create billing page with plan selection",
  description="## Context\nBilling page showing 3 plans.\n\n## Acceptance Criteria\n- [ ] Plan cards with features comparison\n- [ ] CTA buttons per plan\n- [ ] Passes type-check",
  addBlockedBy="9",
  metadata='{"priority": 2, "fileScope": "apps/web/**"}')
# → taskId "10"

task_create(teamName="billing",
  subject="Implement checkout flow UI",
  description="## Context\nCheckout flow redirecting to Stripe.\n\n## Acceptance Criteria\n- [ ] Loading state during redirect\n- [ ] Success/cancel return pages\n- [ ] Passes type-check",
  addBlockedBy="9,10",
  metadata='{"priority": 2, "fileScope": "apps/web/**"}')
# → taskId "11"
```

---

### Phase 6: Validation

**Read task graph:**

```
task_list(teamName="billing")
```

**Agent analyzes the dependency graph:**

- ✅ No circular dependencies found
- ✅ All tasks have acceptance criteria
- ✅ Spike learnings embedded in tasks #7 and #8
- ⚠️ Tasks #9 depends on #5, #6, #7 — could be a bottleneck
- ✅ Priorities consistent (Stripe integration tasks at priority 1)

**Plan final review:**

```
# Amp / hdcode
oracle(
  task: "Review billing plan for completeness",
  data: "<output of task_list>"
)

# Claude
Plan(
  task: "Review billing plan for completeness",
  data: "<output of task_list>"
)
```

---

### Gate 3: Approve Plan

```markdown
## Final Planning Approval — Execution Handoff

**Team**: billing
**Tasks**: 11 tasks
**Critical path**: #1 → #3 → #5 → #7 → #9 → #10 → #11

### Task Graph

| # | Task | Blocked By | File Scope |
|---|------|------------|------------|
| 1 | Create Subscription entity | — | `packages/domain/**` |
| 2 | Create Plan entity | — | `packages/domain/**` |
| 3 | Implement SubscriptionRepository | #1 | `packages/infrastructure/**` |
| 4 | Create Drizzle schema | #1, #2 | `packages/db/**` |
| 5 | CreateSubscription use case | #3 | `packages/application/**` |
| 6 | CancelSubscription use case | #3 | `packages/application/**` |
| 7 | Stripe checkout session | #5 | `packages/infrastructure/**` |
| 8 | Stripe webhook handler | #3 | `packages/api/**` |
| 9 | Billing oRPC router | #5, #6, #7 | `packages/api/**` |
| 10 | Billing page | #9 | `apps/web/**` |
| 11 | Checkout flow UI | #9, #10 | `apps/web/**` |

### Open Risks / Accepted Assumptions

- All HIGH risks validated via spikes (Stripe SDK, webhooks, checkout)
- 3 fixed plans assumed (Free, Pro, Enterprise)

Reply with one:
1. **approve** — hand off to orchestrator for execution
2. **revise** — <feedback>
3. **hold** — save plan but do NOT hand off yet
```

**User says: approve**

→ Execution plan saved to `history/20250113-billing/execution-plan.md`. Ready for orchestrator handoff.

---

## Example 2: Simple Feature - Add User Avatar

### User Request

"Add avatar upload for user profiles"

---

### Phase 1: Discovery (Lightweight)

Single agent sufficient:

```
Task("Find existing user entity and profile update patterns")
```

**Findings:**

- User entity at `packages/domain/src/entities/user.ts`
- Update use case at `packages/application/src/usecases/update-user.ts`
- No existing file upload, but S3 utility exists

---

### Phase 2: Clarification (Skipped)

Simple feature, clear requirements → Skip Clarification.

---

### Phase 3: Synthesis

**Risk Assessment:**

| Component                | Risk                           |
| ------------------------ | ------------------------------ |
| Add avatar field to User | LOW                            |
| File upload to S3        | MEDIUM (variation of existing) |
| Image resize             | MEDIUM (new but standard)      |

No HIGH risk → Skip spike phase.

---

### Gate 1: Approve Planning Direction

```markdown
## Planning Checkpoint — Approve Direction

**Goal**: Add avatar upload for user profiles
**In scope**: Avatar field, upload endpoint, profile display
**Out of scope**: Image cropping, gallery
**Recommended approach**: Add field to User entity, S3 upload using existing utility, profile UI update
**Key assumptions**: Single avatar per user, S3 utility already works
**High risks**: None

Reply with one:
1. **approve** — proceed
2. **revise** — <what to change>
3. **stop** — end planning here
```

**User says: approve**

---

### Phase 4: Verification (Skipped)

All MEDIUM or LOW → No spike gate shown → Proceed directly to decomposition.

---

### Phase 5: Decomposition

```
team_create(teamName="user-avatar", description="Feature: User Avatar Upload")

task_create(teamName="user-avatar",
  subject="Add avatarUrl field to User entity",
  description="## Requirements\n- Add avatarUrl optional field\n- Update schema\n\n## Acceptance Criteria\n- [ ] Field added\n- [ ] Migration runs\n- [ ] Passes type-check",
  metadata='{"priority": 2, "fileScope": "packages/domain/**"}')
# → taskId "1"

task_create(teamName="user-avatar",
  subject="Add avatar upload endpoint with S3",
  description="## Requirements\n- Upload endpoint\n- S3 integration using existing utility\n- Image validation (size, type)\n\n## Acceptance Criteria\n- [ ] Endpoint at /api/users/:id/avatar\n- [ ] Uploads to S3\n- [ ] Passes type-check",
  addBlockedBy="1",
  metadata='{"priority": 2, "fileScope": "packages/api/**"}')
# → taskId "2"

task_create(teamName="user-avatar",
  subject="Add avatar display to profile UI",
  description="## Requirements\n- Display avatar in profile\n- Fallback for no avatar\n\n## Acceptance Criteria\n- [ ] Avatar displayed\n- [ ] Fallback works\n- [ ] Passes type-check",
  addBlockedBy="2",
  metadata='{"priority": 2, "fileScope": "apps/web/**"}')
# → taskId "3"
```

Small, low-risk feature → 3 tasks, no spikes, linear dependency.

---

### Gate 3: Approve Plan

```markdown
## Final Planning Approval — Execution Handoff

**Team**: user-avatar
**Tasks**: 3 tasks
**Critical path**: #1 → #2 → #3

### Task Graph

| # | Task | Blocked By | File Scope |
|---|------|------------|------------|
| 1 | Add avatarUrl field to User entity | — | `packages/domain/**` |
| 2 | Add avatar upload endpoint with S3 | #1 | `packages/api/**` |
| 3 | Add avatar display to profile UI | #2 | `apps/web/**` |

### Open Risks / Accepted Assumptions

- No HIGH risks
- S3 utility assumed working

Reply with one:
1. **approve** — hand off to orchestrator for execution
2. **revise** — <feedback>
3. **hold** — save plan but do NOT hand off yet
```

**User says: approve**

→ Ready for orchestrator handoff.

---

## Decision Tree: When to Spike

```
Is this pattern in the codebase?
├── YES → LOW risk, no spike
└── NO →
    New external dependency?
    ├── YES → HIGH risk, SPIKE REQUIRED
    └── NO →
        Affects >5 files?
        ├── YES → HIGH risk, SPIKE REQUIRED
        └── NO → MEDIUM risk, interface sketch only
```
