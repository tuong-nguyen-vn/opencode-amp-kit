# Stack: PHP — Additional Review Checks

Injected into Phase 4 aspects when `.php` files are detected in the diff (or `tech_stack: php` declared).
When Laravel signals are present, `laravel` preset is loaded IN ADDITION to this one.
When CakePHP signals are present, `cakephp` preset is loaded IN ADDITION to this one.
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- Loose comparison (`==`) with type-juggling surprises — `0 == "foo"` is `true` in PHP ≤7; `"1" == "01"` is `true`. Use strict comparison (`===`) unless type coercion is explicitly intended.
- `isset()` vs `empty()` vs `null` check confusion — `empty("")`, `empty(0)`, `empty([])` all return `true`; use explicit type checks when zero or empty string is a valid value.
- Integer overflow on 32-bit PHP — `PHP_INT_MAX` is 2³¹−1 on 32-bit; use `bcmath` or `GMP` for large integer arithmetic.
- Array functions that return `false` on failure vs. an empty array — e.g., `preg_match()` returns `false` on error, not `0`; check with `=== false`.

---

## Aspect 3 — Possible Breakage (additional)

- Database connection or PDO statement not closed in long-running scripts (CLI / workers) — connection pool exhaustion; use `null`-ing the PDO instance or explicit `$pdo = null`.
- `preg_replace` with `/e` modifier (PHP 5) — executes matched content as PHP code (removed in PHP 7; if seen in a legacy codebase, critical security issue).
- `@` error-suppression operator hiding actual errors — masks failures silently; remove and handle errors explicitly.
- Session started after output sent — `session_start()` after any echo/print causes `Cannot send session cookie - headers already sent`.

---

## Aspect 7 — Security (additional)

- SQL built with string concatenation or `sprintf` without prepared statements — SQL injection. Use PDO prepared statements or a query builder.
- `$_GET` / `$_POST` / `$_COOKIE` values echoed directly into HTML — XSS. Escape with `htmlspecialchars($val, ENT_QUOTES, 'UTF-8')` or use a templating engine with auto-escaping.
- `eval()` with any user-controlled input — arbitrary code execution.
- `include` / `require` with user-controlled path — Local File Inclusion (LFI) / Remote File Inclusion (RFI). Validate against an allowlist.
- `system()` / `exec()` / `shell_exec()` / `passthru()` with user input — OS command injection. Use `escapeshellarg()` or avoid shell entirely.
- File upload handler not validating MIME type and extension server-side — never trust `$_FILES['type']`; validate with `finfo_file()`.
- `unserialize()` on untrusted input — PHP object injection / arbitrary code execution. Use JSON instead.

---

## Aspect 10 — Code Quality (additional)

- Missing strict types declaration — `declare(strict_types=1)` at top of file catches type coercion bugs at call sites; recommended for all new files.
- Mixed `echo` and `return` in functions — functions should return values; presentation logic should echo; mixing makes code untestable.
- Global variables accessed via `global $var` inside functions — avoid shared mutable global state; pass dependencies explicitly.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic in view templates (`.php` files directly rendered) — separate presentation from logic; use a controller or service layer.
- Direct `$_POST` / `$_GET` access deep in the application stack — input should be validated and bound at the HTTP boundary (controller/request class), not accessed in services or models.
- `die()` / `exit()` in library or service code — terminates the entire process; throw an exception instead to allow callers to handle errors.
