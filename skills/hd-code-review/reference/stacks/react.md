# Stack: React / Next.js — Additional Review Checks

Injected into Phase 4 aspects when `.tsx` or `.jsx` files are detected in the diff (or `tech_stack: react` declared).
Covers React and Next.js (Next.js is React with SSR — same checks apply).
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- `v-for`-equivalent: rendering a list without a stable `key` prop, or using array index as key when the list can be reordered/filtered — causes incorrect DOM reconciliation and stale state.
- Stale closure in `useState` setter — `setCount(count + 1)` inside an async callback or interval captures the stale `count`; use `setCount(prev => prev + 1)` instead.
- `async` function passed directly as `useEffect` callback — `useEffect(async () => {...})` returns a Promise, not a cleanup function; wrap in an inner async fn.
- Hook called conditionally — hooks must be called in the same order on every render (no early returns, no hooks inside `if`, loops, or callbacks).
- `useRef` value mutated during render — `.current` mutations must happen in effects or event handlers, not during the render phase.

---

## Aspect 3 — Possible Breakage (additional)

- Missing `useEffect` cleanup — subscriptions, event listeners, `setInterval`/`setTimeout`, WebSocket connections, and Observables must be cleaned up in the return function; omitting causes memory leaks and state updates on unmounted components.
- Infinite render loop — object literal, array literal, or inline function in `useEffect`/`useCallback`/`useMemo` dependency array creates a new reference on every render, triggering the effect infinitely. Use `useMemo`/`useCallback` or stable references.
- `setState` called on unmounted component — async operation completes after unmount and calls `setState`; guard with an `isMounted` ref or abort signal.
- `React.StrictMode` double-invocation exposing non-idempotent side effects — effects run twice in development; ensure effects are safe to re-run.

---

## Aspect 7 — Security (additional)

- `dangerouslySetInnerHTML={{ __html: userInput }}` without sanitization — direct XSS vector. Sanitize with DOMPurify or equivalent before setting.
- Secrets / API keys in component code or `.env` files with `NEXT_PUBLIC_` prefix — `NEXT_PUBLIC_` variables are bundled into the client build and visible to all users. Backend secrets must never use this prefix.
- Next.js Server Actions missing authentication check — `use server` functions are exposed as HTTP endpoints; verify session/user before performing privileged operations.
- `href` or `src` set from user input without validation — `javascript:` URLs in `href` are an XSS vector.

---

## Aspect 10 — Code Quality (additional)

- Component with more than one primary responsibility — split into smaller, focused components.
- Prop drilling deeper than 3 levels — consider React Context or a state management solution.
- Inline arrow functions or object literals as props on frequently-rendered list items — creates new reference on every render, prevents `React.memo` optimization.
- `useEffect` with an empty dependency array `[]` doing complex async work that depends on props — silent bug when props change; re-evaluate dependencies.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic inside component bodies — extract to custom hooks or service modules; components should orchestrate rendering, not implement domain logic.
- Direct API calls (`fetch`, `axios`) inside a component body — wrap in a custom hook (`useUserData`, `useProducts`) to enable reuse, testing, and loading/error state management.
- Missing error boundaries around async data-fetching subtrees — unhandled promise rejection in a child component crashes the entire tree; add `<ErrorBoundary>`.
- `useContext` used for high-frequency updates (e.g., mouse position, scroll offset) — every context consumer re-renders on any context change; use a more granular state solution.
