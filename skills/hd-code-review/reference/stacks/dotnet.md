# Stack: .NET — Additional Review Checks

Injected into Phase 4 aspects when `tech_stack: dotnet` is declared in `docs/REVIEW_STANDARDS.md`.
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- `async void` method — always wrong outside event handlers; swallows exceptions silently. Use `async Task`.
- `Task.Result` or `.Wait()` on async code in a synchronous context — deadlock risk in ASP.NET/WPF sync contexts. Use `await` or `ConfigureAwait(false)`.
- `==` / `!=` on non-primitive reference types — may compare references, not values. Verify `.Equals()` override or pattern matching is appropriate.
- Unchecked arithmetic in financial/measurement code — use `checked { }` or `decimal` for precision-sensitive ops.
- Struct mutability via method call on a copy (value semantics trap).

---

## Aspect 3 — Possible Breakage (additional)

- `IDisposable` not wrapped in `using` / `using var` — file handles, DB connections, `HttpClient`, `Stream`, `DbContext` must always be disposed.
- `CancellationToken` not propagated through async call chains — callers pass tokens that are silently dropped.
- `ThreadAbortException` catch blocks — no-op in .NET 5+; code relying on it will never trigger.
- Nullable reference types (NRT) warnings suppressed with `!` (null-forgiving operator) without verification.
- `Task` returned from `async` method not `await`-ed by caller — fire-and-forget without intent.

---

## Aspect 7 — Security (additional)

- `FromSqlRaw` / `ExecuteSqlRaw` in EF Core with string interpolation or concatenation — SQL injection. Use `FromSqlInterpolated` or `SqlParameter`.
- Missing `[ValidateAntiForgeryToken]` on state-changing MVC POST actions.
- `[AllowAnonymous]` added without explicit review comment justifying it.
- Hardcoded connection strings or secrets — must use environment variables or secrets manager.
- `JsonSerializer` / `XmlSerializer` deserializing untrusted input without size limits — DoS via large payloads.

---

## Aspect 10 — Code Quality (additional)

- `var` hiding non-obvious types (e.g., `var result = service.DoThing()` — what type is `result`?). Only acceptable when type is evident from the right-hand side.
- `dynamic` usage without justification comment.
- Controller action methods containing business logic — should delegate to services.
- `string.Format` / concatenation where interpolation or `StringBuilder` is cleaner.

---

## Aspect 12 — Architecture & Design (additional)

- Captive dependency: scoped or transient service injected into a singleton — lifetime mismatch causes state corruption.
- Business logic in EF Core entity classes — entities should be data containers; logic belongs in domain/service layer.
- Direct `DbContext` usage in controllers bypassing repository or service layer.
- `static` state in ASP.NET components — not thread-safe under concurrent requests.
