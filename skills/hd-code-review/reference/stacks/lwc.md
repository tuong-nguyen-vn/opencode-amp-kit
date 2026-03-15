# Stack: LWC (Lightning Web Components) — Additional Review Checks

Injected when `.html` or `.js` files under a `lwc/` path segment are detected in the diff
(or `tech_stack: lwc` declared). Combines with `apex` preset when `.cls` files are also present.
Apply these checks IN ADDITION TO the universal checklist items.

---

## Aspect 2 — Correctness (additional)

- Imperative Apex call result not re-fetched when `@wire` reactive property changes — stale data displayed until hard reload; use `@wire` with reactive `$property` syntax or re-call imperatively in a `@wire` handler.
- `this.template.querySelector()` called in `constructor()` — DOM not yet attached; move to `connectedCallback()` or `renderedCallback()`.
- `renderedCallback()` modifying a tracked property unconditionally — triggers re-render → re-runs `renderedCallback()` → infinite loop; guard with a `_rendered` boolean flag.
- `@track` decorator applied to a primitive (`string`, `number`, `boolean`) — primitives are automatically reactive; `@track` is only needed for nested object/array mutation detection.

---

## Aspect 3 — Possible Breakage (additional)

- Custom event dispatched before `connectedCallback()` completes — parent component not yet listening; dispatch after the component is fully connected.
- Manual event listener added in `connectedCallback()` without a matching `removeEventListener()` in `disconnectedCallback()` — memory leak on SPA navigation.
- `@api` property value mutated directly inside the child component — violates one-way data flow; raises framework warnings and produces unpredictable state; emit an event instead.

---

## Aspect 7 — Security (additional)

- `innerHTML` assignment using user-controlled data — XSS vector; use `lwc:inner-html` with a sanitized string or bind via template expressions only.
- Direct access to `window`, `document`, or `eval()` — blocked by Lightning Web Security (LWS) and will throw at runtime; use `this.template` APIs and LWC-approved patterns.
- Sensitive data (tokens, session IDs, PII) stored in `@track` / `@api` component state — readable via browser DevTools; keep sensitive data server-side.
- External JS or CSS hotlinked from a CDN or external URL instead of bundled as a Static Resource — AppExchange auto-fail; all third-party assets must be versioned static resources within the package.
- Third-party npm package with known CVEs shipped to the org — run `npm audit` or Snyk on the LWC project; outdated libraries bundled into component JS are in scope for the AppExchange security review.
- `LightningMessageChannel` component with `isExposed: true` — exposes the channel to all subscriber orgs; leave `false` unless intentional cross-cloud messaging is documented.

---

## Aspect 10 — Code Quality (additional)

- Business logic (calculations, data transformations, conditional rules) placed in component JS — move to Apex or a shared LWC utility module; components should orchestrate, not compute.
- `@wire` adapter result used without handling the `error` property — silent failures invisible to the user; always check `if (error)` and surface a message.
- Layout built without SLDS utility classes — produces inconsistent spacing and theming across Experience Cloud, App Builder, and standard Salesforce UI contexts.

---

## Aspect 12 — Architecture & Design (additional)

- Parent-to-child communication via direct method calls on the child element reference instead of reactive `@api` property bindings — tight coupling; method calls are harder to test and break declarative data flow.
- Child-to-parent communication by holding a direct reference to the parent instead of dispatching custom events — breaks component encapsulation and makes reuse impossible.
- `@wire` result destructured into multiple separate tracked properties — verbose and fragile when the wire shape changes; bind to a single object and access properties in the template.
