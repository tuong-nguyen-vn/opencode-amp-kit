# Stack: .NET — Additional Review Checks

Injected into Phase 4 aspects when `tech_stack: dotnet` is declared in `docs/REVIEW_STANDARDS.md`.
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

> **Platform tags:** [All] · [Core] = .NET Core / .NET 5+ · [FX] = .NET Framework · [MVC] = ASP.NET MVC · [API] = ASP.NET Web API · [WPF] · [WinForms]

---

## Aspect 2 — Correctness (additional)

- [All] async void method — always wrong outside event handlers; swallows exceptions silently. Use async Task.
- [All] Task.Result or .Wait() on async code in a synchronous context — deadlock risk in ASP.NET / WPF sync contexts. Use await or ConfigureAwait(false).
- [All] == / != on non-primitive reference types — may compare references, not values. Verify .Equals() override or pattern matching is appropriate.
- [All] Unchecked arithmetic in financial/measurement code — use checked { } or decimal for precision-sensitive ops.
- [All] Struct mutability via method call on a copy (value semantics trap).
- [WPF] INotifyPropertyChanged using a hardcoded property name string — typo causes binding to silently fail. Use [CallerMemberName] or nameof().

---

## Aspect 3 — Possible Breakage (additional)

- `IDisposable` not wrapped in `using` / `using var` — file handles, DB connections, `HttpClient`, `Stream`, `DbContext` must always be disposed.
- `CancellationToken` not propagated through async call chains — callers pass tokens that are silently dropped.
- `ThreadAbortException` catch blocks — no-op in .NET 5+; code relying on it will never trigger.
- Nullable reference types (NRT) warnings suppressed with `!` (null-forgiving operator) without verification.
- `Task` returned from `async` method not `await`-ed by caller — fire-and-forget without intent.

---

## Aspect 7 — Security (additional)

- [All] FromSqlRaw / ExecuteSqlRaw in EF Core with string interpolation or concatenation — SQL injection. Use FromSqlInterpolated or SqlParameter.
- [MVC] Missing [ValidateAntiForgeryToken] on state-changing POST actions.
- [MVC][API] [AllowAnonymous] added without an explicit comment justifying it.
- [All] Hardcoded connection strings or secrets — use environment variables, appsettings.json with secrets manager, or IConfiguration.
- [FX] Secrets hardcoded in web.config instead of environment-specific transforms or secrets manager.
- [All] JsonSerializer / XmlSerializer deserializing untrusted input without size limits — DoS via large payloads.
- [MVC] Action binding directly to an Entity class — over-posting / mass assignment risk. Use a DTO or [Bind] allowlist.
- [MVC][API] [ResponseCache] / OutputCache applied to an authenticated endpoint — one user's response served to another.
- [Core] HttpContext.Current access — does not exist in .NET Core; inject IHttpContextAccessor instead.

---

## Aspect 10 — Code Quality (additional)

- [All] var hiding non-obvious types (e.g., var result = service.DoThing()). Only acceptable when the type is evident from the right-hand side.
- [All] dynamic usage without a justification comment.
- [MVC][API] Controller action methods containing business logic — delegate to services.
- [All] string.Format / concatenation in loops where StringBuilder is more appropriate.
- [WPF] Business logic in code-behind (\*.xaml.cs) — violates MVVM; move to ViewModel.
- [WPF] Dispatcher.Invoke (blocking) used where Dispatcher.InvokeAsync (non-blocking) suffices — unnecessarily blocks the calling thread.

---

## Aspect 12 — Architecture & Design (additional)

- Captive dependency: scoped or transient service injected into a singleton — lifetime mismatch causes state corruption.
- Business logic in EF Core entity classes — entities should be data containers; logic belongs in domain/service layer.
- Direct `DbContext` usage in controllers bypassing repository or service layer.
- `static` state in ASP.NET components — not thread-safe under concurrent requests.
