# Stack: Vue.js — Additional Review Checks

Injected into Phase 4 aspects when `.vue` files are detected in the diff (or `tech_stack: vuejs` declared).
Covers Vue 2 and Vue 3 — version-specific differences are noted inline.
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- `v-for` without `:key` or using array index as key when the list can be reordered/filtered — causes incorrect DOM reconciliation and stale component state.
- `v-if` and `v-for` on the same element:
  - **Vue 2**: `v-for` has higher priority — `v-if` runs on each iterated item (may be intentional, but often a mistake).
  - **Vue 3**: `v-if` has higher priority — the loop variable is not accessible inside `v-if` (always a bug if the intent was to filter).
  - Prefer `<template v-for>` with `v-if` on the inner element, or filter in `computed`.
- Direct array index mutation in Vue 2 — `this.arr[0] = val` is NOT reactive; use `this.$set(this.arr, 0, val)` or `Vue.set`. (Vue 3 Proxy-based reactivity handles this correctly.)
- Mutating a prop directly inside a child component — always emit an event to the parent instead.
- `computed` property with side effects — computed getters must be pure; side effects belong in `watch` or methods.

---

## Aspect 3 — Possible Breakage (additional)

- Event listener or DOM subscription added in `mounted`/`created` without corresponding removal in `beforeUnmount` (Vue 3) / `beforeDestroy` (Vue 2) — memory leak and duplicate handlers on re-mount.
- `$refs` accessed in `created` or before the component is mounted — refs are only populated after `mounted`; earlier access returns `undefined`.
- `watch` without `{ immediate: true }` when initial state needs to trigger the handler — silent miss on first load.
- **Vue 3 Composition API**: reactive object destructured into plain variables loses reactivity — `const { count } = reactive({count: 0})` creates a plain number, not a ref.

---

## Aspect 7 — Security (additional)

- `v-html` with user-controlled content — direct XSS vector; sanitize with DOMPurify or equivalent before binding, or avoid `v-html` entirely for user content.
- Dynamic `<component :is="userInput">` with unvalidated values — can render arbitrary registered components.

---

## Aspect 10 — Code Quality (additional)

- Mixing Options API and Composition API inconsistently across components in the same project without a documented convention — pick one style per codebase.
- `this.$parent` or `this.$children` access — creates fragile parent-child coupling; use props/events or provide/inject.
- Logic-heavy template expressions (ternaries, method chains) — extract to `computed` properties for readability and cacheability.
- Missing prop `type` and `validator` definitions — prop validation documents the contract and catches bugs early.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic inside template expressions or inline event handlers — extract to methods or composables.
- `this.$store.commit()` called directly in a component (Vuex / Pinia) — prefer dispatching actions, which can handle async logic and logging.
- **Vue 3**: composable function mutating external state without returning reactive refs — composables should be self-contained and return their state explicitly.
- Cross-component communication via `EventBus` in Vue 3 — the global event bus pattern is removed; use `mitt` explicitly or Pinia for shared state.
