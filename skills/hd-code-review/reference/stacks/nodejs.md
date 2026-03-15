# Stack: Node.js — Additional Review Checks

Injected into Phase 4 aspects when `tech_stack: nodejs` is declared in `docs/REVIEW_STANDARDS.md`.
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- `==` / `!=` instead of `===` / `!==` — type coercion produces unexpected results (e.g., `0 == false`, `null == undefined`).
- Callback error argument silently ignored — `callback(err, data)` where `err` is not checked before using `data`.
- Missing `await` on an async function call — promise is created but result is lost; errors are swallowed.
- `parseInt` without explicit radix — `parseInt("08")` was `0` in legacy engines; always pass `10`.
- `typeof null === 'object'` trap — null checks must use `=== null`, not `typeof`.

---

## Aspect 3 — Possible Breakage (additional)

- CPU-intensive synchronous operation inside an async handler — blocks the event loop for all concurrent requests. Offload to worker threads or use async alternatives (`fs.promises.*`, `crypto.subtle`).
- `fs.readFileSync` / `execSync` / `spawnSync` in request handlers or hot paths.
- Unhandled `EventEmitter` `'error'` event — crashes the process if no listener is registered. Always attach `.on('error', handler)`.
- `process.nextTick` in a tight loop — starves I/O callbacks; prefer `setImmediate` for deferring to next iteration.
- `JSON.parse` on arbitrarily large request bodies without size guard — OOM risk.

---

## Aspect 7 — Security (additional)

- `eval()` / `new Function(code)` with any user-controlled input — arbitrary code execution.
- `require()` with user-controlled path — path traversal / arbitrary module load.
- RegEx with catastrophic backtracking (ReDoS) on untrusted input — nested quantifiers like `(a+)+`, `(a|aa)+`. Test with abnormal input.
- `Buffer.allocUnsafe()` — allocates uninitialized memory; may expose prior memory contents. Use `Buffer.alloc()`.
- `child_process.exec` / `execFile` / `spawn` with shell: true and user input — shell injection.

---

## Aspect 9 — Implication Assessment (additional)

- `JSON.parse` / `JSON.stringify` on large payloads in request handlers — consider streaming parsers (e.g., `stream-json`).
- Synchronous crypto (`crypto.createHash(...).update(...).digest(...)`) in a hot request path — non-trivial CPU cost; evaluate if async or worker thread is needed.
- `setInterval` without a corresponding `clearInterval` — memory/CPU leak in long-running processes.

---

## Aspect 10 — Code Quality (additional)

- Callback hell (> 3 levels of nesting) when `async/await` or `Promise` chains are available.
- Sequential `await` in a loop where `Promise.all` would parallelize independent async ops.
- `console.log` / `console.error` in production code paths — use structured logger (pino, winston, etc.).
- Catching and re-throwing without adding context — `catch (e) { throw e; }` loses stack augmentation opportunity.
