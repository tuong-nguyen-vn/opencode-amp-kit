# Stack: Aura (Lightning Components) — Additional Review Checks

Injected when `.cmp`, `.app`, `.evt`, or `.intf` files are detected in the diff
(or `tech_stack: aura` declared). Standalone — does NOT depend on the `lwc` preset.
Apply these checks IN ADDITION TO the universal checklist items.

---

## Aspect 2 — Correctness (additional)

- `component.get("v.attribute")` result used without a null check before property access — attribute may be unset or conditionally rendered; guard before chaining.
- Async server action callback code running outside `$A.getCallback()` — Aura framework execution context is lost in async scope; wrap all async callbacks with `$A.getCallback(function() { ... })`.
- `component.find("aura:id")` used without null check — returns `undefined` when the target element is inside an `aura:if` block that is currently `false`.

---

## Aspect 3 — Possible Breakage (additional)

- Method called on a child component reference obtained via `component.find()` where the child uses `aura:if` — reference is `null` when condition is `false`; check before calling.
- `$A.enqueueAction` called inside a loop or rapid-fire event handler — queues one server request per iteration; batch records client-side first, then make a single server call.

---

## Aspect 7 — Security (additional)

- `{!v.attribute}` bound to the `value` attribute of `aura:html` when the attribute contains user-supplied content — XSS; use `aura:text` for plain text or apply `{!HTMLENCODE(v.attribute)}`.
- `@AuraEnabled` Apex method on a class without explicit `with sharing` — sharing rules silently bypassed for the calling user context.
- External JS loaded via `<script src="https://...">` instead of a Static Resource + `ltng:require` — AppExchange auto-fail; external scripts can be compromised after the security review without Salesforce's knowledge.
- Third-party library bundled in a Static Resource with known CVEs (jQuery, Bootstrap, etc.) — run RetireJS or Snyk before submission; outdated JS libraries are the #2 most common AppExchange SR failure.
- CSS loaded via `<link href="...">` tag instead of `<ltng:require>` with a Static Resource — improper CSS load, flagged as a violation in the AppExchange security review.
- `LightningMessageChannel` component with `isExposed: true` — exposes the LMS channel API to all installed orgs; set to `false` unless cross-cloud communication is explicitly required and documented.

---

## Aspect 10 — Code Quality (additional)

- Business logic (calculations, record manipulation, conditional rules) placed in the Aura client-side controller JS — move to Apex `@AuraEnabled` methods; JS controllers should only handle UI events and call server actions.
- Aura component duplicates functionality now available in a standard LWC base component (`lightning-datatable`, `lightning-record-form`, etc.) — flag as migration candidate.
- `console.log()` calls logging user or record data in the Aura controller — leaks PII in browser DevTools console; remove before production.
