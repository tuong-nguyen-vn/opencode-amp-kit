# Stack: Apex — Additional Review Checks

Injected when `.cls`, `.trigger`, or `.apex` files are detected in the diff
(or `tech_stack: apex` declared). Standalone preset — Apex is not a sub-framework.
Apply these checks IN ADDITION TO the universal checklist items.

---

## Aspect 2 — Correctness (additional)

- SOQL or DML inside a `for` loop — governor limit violation (max 100 SOQL / 150 DML per transaction); bulkify by collecting IDs first, then query/DML outside the loop.
- `Database.query()` built via string concatenation of user-controlled input — dynamic SOQL without bind variables; use `:variable` bind syntax instead.
- Trigger logic written assuming `Trigger.new.size() == 1` — single-record assumption breaks bulk operations from data loads or API calls; process via collections.
- Test class missing `Test.startTest()` / `Test.stopTest()` around async operations (`@future`, `Queueable`, `Batch`) — async code does not execute, assertions run before results are available.

---

## Aspect 3 — Possible Breakage (additional)

- Trigger without operation guards (`if (Trigger.isBefore && Trigger.isInsert)`) — runs on unintended DML events; add explicit event checks.
- Hard-coded record type IDs, custom setting values, or user IDs — values differ between orgs and sandboxes; query at runtime or use Custom Metadata.
- Missing `try/catch` around HTTP callouts — unhandled `CalloutException` rolls back the entire transaction and can corrupt partially-completed DML.
- HTTP (non-HTTPS) endpoint in `HttpRequest.setEndpoint()` or a Named Credential — TLS not enforced; AppExchange auto-fail; all external endpoints must use HTTPS with TLS 1.2+.
- Sensitive tokens or API keys passed as URL query parameters in callouts — values are logged in Salesforce debug logs and external server access logs; pass secrets in `Authorization` headers instead.
- Recursive trigger without a static boolean guard — an update inside a trigger re-fires the same trigger; add a static `alreadyRunning` flag to break the cycle.

---

## Aspect 7 — Security (additional)

- Apex class missing explicit `with sharing` or `without sharing` declaration — sharing rules silently not enforced in ambiguous contexts; always declare intent.
- Dynamic SOQL string built from user-supplied input without bind variables — SOQL injection; use `String.escapeSingleQuotes()` at minimum, prefer bind variables.
- Field-level security (FLS) not checked before reading or writing sensitive fields — bypasses org permission model; use `Schema.SObjectField.getDescribe().isAccessible()` or `Security.stripInaccessible()`.
- Credentials, tokens, or secrets hardcoded in Apex — use Named Credentials or Protected Custom Metadata instead.
- CRUD permission not checked before DML — `SObjectType.isCreateable()` / `isUpdateable()` / `isDeletable()` not called before insert/update/delete; distinct from FLS and an AppExchange security review auto-fail.
- `without sharing` on a class that exposes `@AuraEnabled` or `@RestResource` methods — external callers (LWC, REST clients) bypass record-sharing rules; gateway classes must use `with sharing`.
- Hardcoded profile API names, permission set names, or role names used for access gating — subscriber orgs have different names; use Custom Permissions and `FeatureManagement.checkPermission()` instead.
- SOQL query missing `WITH SECURITY_ENFORCED` or `AccessLevel.USER_MODE` — these enforce CRUD+FLS in a single clause without manual field enumeration; preferred modern pattern alongside `Security.stripInaccessible()`.
- Sensitive data (API keys, credentials, tokens) stored in non-Protected Custom Settings or Custom Metadata — set visibility to "Protected"; implement a null getter and `transient private` variable so stored values are never echoed back to the UI.
- `e.getMessage()` or full exception detail surfaced directly to the UI (page message, JSON response) — leaks internal stack traces and file paths; log details server-side via `System.debug()`, return a generic message to the caller.

---

## Aspect 10 — Code Quality (additional)

- Test methods with no `System.assert*` calls — phantom coverage; the method passes but validates nothing.
- `@isTest(SeeAllData=true)` on test class — breaks data isolation; tests depend on unpredictable org state; create test data explicitly.
- `System.debug()` calls left in production code paths — log bloat and potential PII leakage in debug logs; remove or guard with a log level check.
- Business logic scattered across multiple trigger files for the same object — centralise in a single trigger + handler class pattern per object.
