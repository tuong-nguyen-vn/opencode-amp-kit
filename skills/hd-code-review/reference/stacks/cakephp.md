# Stack: CakePHP — Additional Review Checks

Injected IN ADDITION to `php` preset when CakePHP signals are detected:
- `src/Controller/` paths in the diff
- `config/routes.php` in the diff
- `"cakephp/cakephp"` in `composer.json`

Contains CakePHP-specific checks only — PHP-level checks are in `php.md`.

---

## Aspect 2 — Correctness (additional)

- `$this->request->getData()` used directly without going through Form validation — raw POST data bypasses CakePHP's validation rules; always validate through a Form or Table's `newEntity()` / `patchEntity()`.
- `Table::get($id)` without try/catch — throws `RecordNotFoundException` when the record does not exist; use `->find()->where()->first()` with a null check, or catch the exception.
- N+1: associations accessed in a loop without `contain()` — `foreach ($articles as $a) { $a->user->name; }` fires N+1 queries. Use `->contain(['Users'])` in the finder.
- Missing `$this->loadComponent('Security')` on controllers handling form submissions — CSRF token validation not active.

---

## Aspect 3 — Possible Breakage (additional)

- Missing `$this->dbConnection->begin()` / `commit()` / `rollback()` around multi-table writes — partial failure leaves data inconsistent; wrap in a transaction.
- Shell / Command class doing heavy work without progress tracking — long-running CakePHP Console commands should use `$this->io->progressStart()` and handle signals (`SIGTERM`) for graceful shutdown.
- Missing `allowMethod()` in controller actions that should only accept POST/PUT — action accessible via GET, enabling CSRF bypass or unintended state changes.

---

## Aspect 7 — Security (additional)

- Raw query via `$connection->execute()` with string interpolation — SQL injection. Use `->execute($sql, $params)` with bound parameters.
- `$this->request->getData()` values passed to `Table::query()` or `->where()` without allowlist — column/value injection risk.
- Missing `$this->Security->requireSecure()` on actions handling sensitive data — ensures HTTPS is enforced.
- `HtmlHelper::scriptBlock()` / `HtmlHelper::tag()` with user content and no escaping — XSS; pass `['escape' => true]` or pre-escape values.

---

## Aspect 10 — Code Quality (additional)

- Fat controller: complex query building, business rules, or multi-model operations directly in controller actions — extract to Table finders, Behaviors, or Service classes.
- Direct `TableRegistry::getTableLocator()->get()` deep in domain code — use dependency injection via constructor or `$this->fetchTable()` for testability.
- Missing validation rules in Table `validationDefault()` for new fields — new columns without validation are silently accepted with any value.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic in View templates — CakePHP Views should only format and display data; move logic to Cells, Helpers, or ViewBuilder.
- Behavior added to a Table without checking for method/event conflicts with existing behaviors — Behaviors share the Table's event system; duplicate event names cause silent overwrites.
- Direct cross-plugin model access without going through the plugin's public API — creates tight inter-plugin coupling; access other plugins via their exposed service or facade.
