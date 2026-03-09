# Review Checklist — hd-code-review

Reference checklist used by Phase 4 (Tiered Review) of the `hd-code-review` skill.
Apply aspects in tier order. Tier 1 (blockers) runs first; Tier 2 (advisories) runs after the gate.

---

## Tier 1 — Blocker-Prone

Run these aspects first, in order. Print each result immediately after evaluating.

---

## Aspect 2 — Correctness

**Verdict impact:** 🔴 Blocker


- Are there logic errors — wrong comparisons, inverted conditions, incorrect boolean logic?
- Off-by-one errors in loops, ranges, pagination, indices?
- Null / undefined / nil dereference — accessing properties on values that could be null?
- Wrong operator used (e.g., `=` vs `===`, `&` vs `&&`, integer division where float needed)?
- Incorrect state transitions — can the system reach an invalid state through this code?
- Wrong data transformation — is the data being mutated, serialized, or deserialized correctly?
- Arithmetic errors — overflow, underflow, precision loss in float operations?

**Blocker trigger:** Any finding in this aspect — logic bugs are always blockers.

---

## Aspect 3 — Possible Breakage

**Verdict impact:** 🔴 Blocker


- What error paths are not handled? What happens when this function throws or returns an error?
- What edge cases were not considered: empty input, null input, zero, negative numbers, max-length strings, empty arrays, single-element collections?
- Race conditions: are there shared state writes that could interleave? Any missing locks or atomic operations?
- Resource leaks: are file handles, DB connections, streams, or network connections always closed, even on error paths?
- What happens if an external service (API, DB, queue) is down or times out?
- What happens on concurrent access to the same resource?
- What happens under load — is there any assumption about volume that could fail at scale?

**Blocker trigger:** Any unhandled error path or edge case that could cause runtime failure in production.

---

## Aspect 7 — Security (quick pass)

**Verdict impact:** 🔴 Blocker for critical issues; 🟡 Advisory for lower severity


- Is user input used in a database query without parameterization or ORM protection?
- Is there a new endpoint or action without an authentication check?
- Are secrets, API keys, or credentials hardcoded in the diff?
- Does a new dependency have known vulnerabilities (note for follow-up if suspected)?
- Is user input reflected into HTML, SQL, shell commands, or file paths without sanitization?
- Are there new file upload handlers without type/size validation?

**PII leak checks:**
- Is sensitive data (passwords, tokens, PII: email, phone, SSN, DOB, address) written to logs or debug output?
- Are real PII values hardcoded in test fixtures, seed files, or example data? (Use fake/generated data instead)
- Does a new or changed API response return more PII fields than the caller actually needs? (over-exposure)
- Is PII included in error messages or exception traces returned to clients?
- Is user-identifiable data embedded in URLs (query params, path segments) that could end up in server logs or browser history?

**Blocker trigger:** Critical issues — injection vectors, missing auth, hardcoded secrets, hardcoded real PII in test data, sensitive data in logs, API responses over-exposing PII.
**Advisory trigger:** Lower-severity observations that don't create an immediate exploit path (e.g., PII in internal error messages, borderline field exposure).

---

## Aspect 6 — Tests

**Verdict impact:** 🔴 Blocker (if changed behavior has no test coverage)


- Is every new behavior or changed behavior covered by at least one test?
- Are both happy path (success) and unhappy path (failure, error, rejection) tested?
- Are edge cases tested — empty input, boundary values, null/undefined inputs?
- Do existing tests still accurately reflect the behavior after this change, or do they need updating?
- Are tests meaningful — do they assert real outcomes, or are they trivial existence checks?
- If a bug was fixed, is there a regression test that would catch it reappearing?

**Blocker trigger:** New or changed behavior with no tests. Existing tests that now pass incorrectly due to missing updates.
**Advisory only:** Tests exist but coverage is thin (e.g., only happy path, no edge cases).

---

## Aspect 1 — Requirements Coverage

**Verdict impact:** 🔴 Blocker (if task context provided)
**N/A condition:** Skip entirely if no task context was provided (Path C in Phase 3). Note: `✓ Aspect 1 (Requirements Coverage) — N/A (no task context)`


- Does every requirement stated in the task appear addressed somewhere in the diff?
- Are there task items explicitly mentioned that are NOT touched by the diff?
- Does the diff do things clearly NOT in the task (scope creep beyond what was described)?
- Are acceptance criteria from the task verifiably satisfied by the changes?

**Blocker trigger:** Any task requirement present in context but absent from the diff.

---

## Aspect 11 — Completeness

**Verdict impact:** 🔴 Blocker (if task context provided)
**N/A condition:** Skip entirely if no task context was provided (Path C in Phase 3). Note: `✓ Aspect 11 (Completeness) — N/A (no task context)`


- Is every feature or fix mentioned in the task present in the diff — or is something described as done but missing?
- Are there TODO/FIXME comments in the diff that should have been resolved before submitting?
- Has documentation been updated if the change affects public-facing behavior, API contracts, or configuration?
- Are error messages, log messages, and user-facing text updated to reflect the new behavior?
- If the task described multiple sub-tasks or acceptance criteria, are all of them addressed?

**Blocker trigger:** A described deliverable from the task is absent from the diff. Unresolved TODOs that the task indicates should be complete.

---

## Aspect 8 — Breaking Changes

**Verdict impact:** Always flagged in a dedicated ⚠️ Breaking Changes block — even when the overall verdict is Approved.


- Has a public API signature changed (function name, parameter names/types/order, return type)?
- Has an existing contract or interface been violated (removed fields, renamed fields, changed types)?
- Is there a database schema change without a corresponding migration?
- Has a configuration file format changed in a way that breaks existing deployments?
- Has behavior changed for existing users in a way they would not expect (silent breaking change)?
- Do other services, clients, or consumers need to update their code or config to work with this change?
- Has a publicly exported symbol been removed or renamed?

**Output:** Always write a dedicated `### ⚠️ Breaking Changes` block immediately after evaluating, even if the overall verdict is Approved. If no breaking changes found, write: `No breaking changes detected.`

---

## Tier 2 — Advisory

Run after the Tier 1 gate. Print each result immediately after evaluating.

---

## Aspect 4 — Better Approach

**Verdict impact:** 🟡 Advisory


- Is there a simpler algorithm or data structure that achieves the same result with less complexity?
- Does a utility or helper already exist in the codebase that could replace this implementation?
  - **ALWAYS use Grep/Glob to verify before suggesting an alternative** — do not recommend something that is already present.
- Is there a library already imported in the project that handles this case?
- Is the solution over-engineered for the actual problem size or use case?
- Is there a more idiomatic way to express this in the language or framework being used?
- **API Design** *(when new HTTP endpoints are detected in the diff)*:
  - HTTP verb appropriate for the operation? (`GET` for reads, `POST` for creates, `PUT`/`PATCH` for updates, `DELETE` for deletes — avoid verbs in URL paths)
  - Status codes semantically correct? (e.g., `201` for resource creation, `204` for no-content, `400` vs `422` for client errors, `404` vs `403` for missing vs forbidden)
  - Resource naming follows conventions? (nouns, plural, lowercase, consistent with existing routes)
  - Pagination design consistent with existing API patterns? (cursor vs offset, same param names)
  - Response schema consistent with existing endpoints? (same envelope structure, error format)

**Advisory trigger:** A clearly better approach exists AND has been verified NOT already present via Grep/Glob; or an API design smell is found on a new endpoint.

---

## Aspect 5 — Redundancy

**Verdict impact:** 🟡 Advisory


- Is logic copy-pasted from another location in the diff or existing codebase that should be extracted?
- Does logic from the diff duplicate something that already exists elsewhere? (Verify with Grep/Glob)
- Is there a utility function already in the codebase that does exactly this?
- Are variables assigned but never read?
- Is dead code introduced (unreachable branches, unused imports, unused parameters)?
- Are there repeated string or numeric literals that should be named constants?

**Advisory trigger:** Confirmed duplication or dead code identified in the diff.

---

## Aspect 9 — Implication Assessment

**Verdict impact:** 🟡 Advisory


- **Performance:** Does this change have a performance impact at scale? N+1 queries? Unindexed searches on large tables? Unnecessary serialization?
- **Operational:** Does this change require new environment variables, a specific deployment order, a migration to run first, or infrastructure changes?
- **Cost:** Does this change increase API call volume, database query frequency, or cloud resource consumption significantly?
- **Data:** Does this change affect existing records — are there data migrations needed? Could it corrupt or invalidate existing data?
- **UX:** Does this change alter the behavior that existing users rely on, even if not technically a breaking API change?
- **Team / Dependencies:** Do other teams, services, or consumers need to be notified of this change? Does it create a hidden coupling?
- **Dependencies:** *(when new packages or libraries are added to the project)*
  - Is the package necessary, or does an existing utility already cover this use case?
  - Is the license compatible with the project? (e.g., GPL in a commercial product is a risk)
  - Does adding this package introduce a circular dependency?
  - Is the version pinned to a specific range — not floating (`*`, `latest`, or overly broad)?
  - Is the package actively maintained and not abandoned or deprecated?

**Advisory trigger:** Any non-trivial implication that the reviewer or author may not have considered.

---

## Aspect 10 — Code Quality

**Verdict impact:** 🟡 Advisory by default; 🔴 Blocker if a policy in CODING_STANDARDS.md has `required: yes` and it is violated


- Are names clear, specific, and consistent with the conventions in CODING_STANDARDS.md?
- Is the code readable without needing an explanation — would a new team member understand what it does?
- Does the code follow the project patterns defined in CODING_STANDARDS.md (Section 2.4)?
- Are there policy violations?
  - Feature flags (`required: yes`): is new user-facing code wrapped in a feature flag?
  - Observability (`required: yes`): do new endpoints emit required metrics/traces?
  - i18n (`required: yes`): are there hardcoded user-facing strings?
  - a11y (`required: yes`): do new interactive UI elements have ARIA labels, alt text, and keyboard support?
- Are there anti-patterns from CODING_STANDARDS.md Section 2.3 present?
- Is there unnecessary complexity, confusing abstractions, or over-engineering?

**Blocker trigger:** Violation of a policy where `required: yes` in the active CODING_STANDARDS.md.
**Advisory trigger:** General quality observations — naming, readability, pattern deviations — where no `required: yes` policy is violated.

---

## Aspect 12 — Architecture & Design

**Verdict impact:** 🟡 Advisory


- **SRP:** Does a new class, module, or component take on multiple unrelated responsibilities that could be split into smaller units?
- **Dependency Inversion:** Are concrete types hardcoded in places where an abstraction (interface, injected dependency) would decouple the code?
- **Layering:** Does the diff violate defined architectural layers? (e.g., business logic in a route handler, database calls in a domain model, presentation logic in a service)
- **Coupling:** Does the change introduce tight coupling between modules that should be independent? (e.g., direct cross-module imports instead of going through a defined interface or service boundary)
- **Circular dependencies:** Does a new import create or extend a module cycle?
- **Feature / domain boundaries:** Does the change import directly across feature or domain boundaries, bypassing defined service or facade layers?
- **File placement:** Are new files placed in the correct directory per the project's established conventions?

**Advisory trigger:** Any architectural smell detectable from reading the diff — layering violation, SRP breach, tight coupling, or boundary bypass.
