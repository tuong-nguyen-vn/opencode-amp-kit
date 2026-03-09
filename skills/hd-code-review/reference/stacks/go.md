# Stack: Go — Additional Review Checks

Injected into Phase 4 aspects when `.go` or `go.mod` files are detected in the diff (or `tech_stack: go` declared).
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- Goroutine started but never terminates — no quit channel, context cancellation, or `WaitGroup` tracking; goroutine leaks accumulate over time in long-running services.
- `defer` inside a loop — deferred calls execute when the **function** returns, not at the end of each iteration; resource handles (files, locks) accumulate until the outer function exits.
- Value receiver on a method that modifies state — only pointer receivers mutate the original; value receivers get a copy. Check consistency across the method set.
- Nil pointer dereference on interface — a non-nil interface variable holding a nil pointer is NOT nil (`var p *T; var i I = p; i == nil` is `false`); guard with the concrete type check.
- Integer overflow — `int` is platform-width (32-bit on 32-bit targets); use `int64` / `uint64` explicitly for values that may exceed 2³¹.

---

## Aspect 3 — Possible Breakage (additional)

- `sync.WaitGroup.Add()` called inside the goroutine instead of before launching it — race condition; the main goroutine may call `Wait()` before `Add()` is reached.
- Unbounded channel send or receive without a `select + timeout` or context deadline — potential deadlock if the other side is never ready.
- `sync.Mutex` (or `sync.RWMutex`) copied by value — passing by value creates an independent copy that is unlocked; always use a pointer (`*sync.Mutex`).
- `http.Response.Body` not closed, or not fully drained before closing — keep-alive connections are not returned to the pool, causing connection leaks.
- Context not threaded through I/O calls — functions making DB queries or HTTP requests should accept and forward `context.Context` to support cancellation and timeout propagation.

---

## Aspect 7 — Security (additional)

- SQL built with `fmt.Sprintf` or string concatenation — SQL injection. Use parameterized queries (`db.QueryContext(ctx, "SELECT ... WHERE id=$1", id)`).
- `exec.Command` with user-controlled arguments and `shell`-like expansion — command injection. Pass arguments as separate strings, never via `sh -c`.
- `http.Get(userURL)` or outbound HTTP to a user-supplied URL without validation — SSRF (Server-Side Request Forgery). Validate scheme, host, and port against an allowlist.
- Sensitive values (tokens, passwords) passed as command-line arguments — appear in `ps` output and process env; use environment variables or files with restricted permissions.

---

## Aspect 10 — Code Quality (additional)

- Error wrapped without `%w` verb — `fmt.Errorf("context: %v", err)` breaks `errors.Is` / `errors.As`; use `fmt.Errorf("context: %w", err)`.
- Errors ignored with `_` in non-trivial cases — `_, err = ...` without checking `err`; or return values discarded silently.
- Naked return in a function longer than ~10 lines — hard to reason about what is being returned; use explicit return values.
- `init()` function with complex logic or side effects — runs at package load time, order is non-deterministic across packages; keep `init()` minimal.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic directly in `http.Handler` or `http.HandlerFunc` — separate transport (HTTP) from domain logic using handler → service → repository layers.
- Circular package dependency — Go forbids this at compile time, but circular `_test` package imports or subtle import paths can introduce it; check import graph.
- `interface{}` / `any` used where a specific type or generic would be clearer — loses compile-time safety; prefer typed parameters or generics (Go 1.18+).
- Package-level mutable state (package-level `var`) in non-main packages — makes packages non-reentrant and hard to test; use dependency injection.
