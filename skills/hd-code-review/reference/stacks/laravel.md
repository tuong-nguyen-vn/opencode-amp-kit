# Stack: Laravel — Additional Review Checks

Injected IN ADDITION to `php` preset when Laravel signals are detected:
- `artisan` file in the diff or repo root
- `app/Http/Controllers/` paths in the diff
- `routes/web.php` or `routes/api.php` in the diff
- `"laravel/framework"` in `composer.json`

Contains Laravel-specific checks only — PHP-level checks are in `php.md`.

---

## Aspect 2 — Correctness (additional)

- `Model::find($id)` without null check — returns `null` if not found; chaining methods directly causes `Call to a member function on null`. Use `findOrFail()` or explicit null guard.
- N+1 query: accessing a relationship in a loop without `with()` eager loading — `foreach ($users as $u) { $u->posts; }` fires N+1 queries. Use `User::with('posts')->get()`.
- `$request->input()` vs `$request->validated()` — using unvalidated `input()` data directly in models bypasses Form Request validation rules that were written for that purpose.
- Eloquent `where` with column name from user input — `->where($column, $value)` allows column injection if `$column` is user-controlled. Validate column against an allowlist.

---

## Aspect 3 — Possible Breakage (additional)

- Missing database transaction around multiple related writes — partial failure leaves data in an inconsistent state. Wrap with `DB::transaction()` or `DB::beginTransaction()` / `commit()` / `rollBack()`.
- Queue job without `tries` limit or failed job handler — a failing job retries indefinitely, filling the queue; define `$tries`, `$backoff`, and a `failed()` method or `$failOnTimeout`.
- `Storage::disk()->put()` without checking available disk space in long-running file processing.
- Scheduled command (`$schedule->command()`) overlapping itself — use `->withoutOverlapping()` for commands that should not run concurrently.

---

## Aspect 7 — Security (additional)

- Raw query via `DB::statement()` / `DB::select()` with string interpolation — SQL injection. Use binding: `DB::select('SELECT * FROM t WHERE id = ?', [$id])`.
- Missing `$fillable` or over-broad `$guarded = []` on Eloquent models — mass assignment vulnerability; `Model::create($request->all())` with `$guarded = []` allows setting any column.
- Route missing `auth` / `auth:sanctum` / `auth:api` middleware — endpoint accessible without authentication.
- Missing CSRF protection on state-changing web routes — ensure `VerifyCsrfToken` middleware is active; `api` routes are exempt and should use token-based auth instead.
- `Response::make()` or `return response($userContent)` with `Content-Type: text/html` and user-controlled content — XSS.
- Sensitive data logged via `Log::info($request->all())` — passwords, tokens, and PII in log files.

---

## Aspect 10 — Code Quality (additional)

- Fat controller: complex business logic, multiple model queries, or conditional branching directly in controller methods — extract to Service classes, Action classes, or Eloquent scopes.
- Direct `Mail::send()` / `Notification::send()` in controller without queuing — blocks the HTTP response for the duration of the send; use `Mail::queue()` or `->delay()`.
- Eloquent model with no `$casts` for JSON columns, booleans, or dates — accessing uncasted columns returns raw strings, causing type bugs.
- `dd()` / `dump()` / `var_dump()` committed to non-test code.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic in Blade templates — templates should only render data, not compute or fetch it; move logic to controllers, view composers, or view models.
- Direct `Model::` static calls deep in service or domain classes — tight coupling to Eloquent; inject a repository or use the model through a service boundary.
- Event listeners doing synchronous heavy work — use `ShouldQueue` on listeners to push work to the queue and avoid blocking the request.
- `config()` / `env()` called outside of service providers or config files at request time — `env()` always returns null after config is cached (`php artisan config:cache`); use `config()` everywhere except config files themselves.
