# Stack: Visualforce — Additional Review Checks

Injected when `.page` files, or `.component` files under a `pages/` path segment, are detected
in the diff (or `tech_stack: visualforce` declared). Standalone preset.
Apply these checks IN ADDITION TO the universal checklist items.

---

## Aspect 2 — Correctness (additional)

- Merge field rendered in HTML context without `{!HTMLENCODE(field)}` — raw output allows HTML injection; always encode user-controlled or record-sourced values in markup.
- Merge field used inside a `<script>` block without `{!JSENCODE(field)}` — unencoded value breaks JS syntax or enables injection; use `JSENCODE()` for all script-context merge fields.
- `<apex:commandButton>` or `<apex:actionFunction>` present on a page without an enclosing `<apex:form>` — actions silently do nothing; all action components require a parent form.

---

## Aspect 3 — Possible Breakage (additional)

- Large record collections bound to `<apex:dataTable>`, `<apex:pageBlockTable>`, or `<apex:repeat>` without server-side pagination — view state can exceed the 170 KB limit and throw a runtime exception for end users.
- `StandardController` extension overriding the `save()` action without calling `super.save()` — record changes are silently discarded; chain to the standard save or implement full DML explicitly.

---

## Aspect 7 — Security (additional)

- `{!variable}` used inside a `<script>` block without `JSENCODE()` — classic Visualforce XSS vector; any user-controlled value injected into JS can execute arbitrary code.
- `@RemoteAction` Apex method on a class without explicit `with sharing` — FLS and record-level sharing not enforced; remote actions bypass standard controller sharing automatically.
- `<apex:includeLightning>` referencing a third-party or unreviewed Lightning component — executes in the Salesforce session context; verify the component source before including.
- External JS loaded via `<script src="https://...">` instead of `<apex:includeScript>` with a Static Resource — AppExchange auto-fail; all third-party JS must be packaged as static resources.
- CSS loaded via `<link href="...">` tag instead of `<apex:stylesheet>` with a Static Resource — improper CSS load, flagged as violation in AppExchange security review.
- `OnClickJavaScript` in custom buttons or weblinks — AppExchange auto-fail; Classic mode is always in scope even if the org uses Lightning Experience exclusively.

---

## Aspect 10 — Code Quality (additional)

- SOQL query placed in a controller property getter (`get { return [SELECT ...]; }`) — re-executes on every partial-page re-render and `<apex:actionFunction>` call; assign to an instance variable in the constructor or an `action` method.
- `<apex:outputPanel layout="block">` used for inline or flex layout — produces an unexpected `<div>` wrapper; use `layout="none"` to emit a `<span>`, or apply CSS directly.
