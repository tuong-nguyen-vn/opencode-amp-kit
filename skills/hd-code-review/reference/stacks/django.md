# Stack: Django — Additional Review Checks

Injected INTO ADDITION to `python` preset when Django path signals are detected in the diff
(views.py, models.py, urls.py, serializers.py, migrations/, or `tech_stack: django` declared).
Contains Django-specific checks only — Python-level checks are in `python.md`.
Apply these checks IN ADDITION TO the universal checklist items and `python.md` checks.

---

## Aspect 2 — Correctness (additional)

- `Model.objects.get()` without `try/except ObjectDoesNotExist` (or `DoesNotExist`) — raises an unhandled exception when no record matches. Use `.filter().first()` or catch the exception explicitly.
- N+1 query: accessing a ForeignKey or ManyToMany field inside a loop without `select_related` / `prefetch_related` — each iteration fires an extra SQL query. Verify with Django Debug Toolbar or query logging.
- QuerySet evaluated multiple times — `qs = Model.objects.all(); count = len(qs); for obj in qs:` re-evaluates the query. Cache with `list(qs)` or use `.count()` for counting.
- `update()` or `bulk_create()` bypass model `save()` signals and validators — ensure this is intentional and explicitly documented.

---

## Aspect 3 — Possible Breakage (additional)

- FK or reverse relation accessed in a loop without `select_related`/`prefetch_related` — silent N+1 that passes in tests but degrades under load.
- `FileField`/`ImageField` upload handler without file size and MIME type validation — DoS via large uploads or unexpected file types.
- Unguarded `Model.objects.all().delete()` or bulk delete without a `WHERE` clause — accidental full-table wipe.
- Missing database migration after model field changes — `makemigrations` was not run; deployment will fail or data integrity breaks.

---

## Aspect 7 — Security (additional)

- Raw SQL with string formatting — `Model.objects.raw(f"SELECT * FROM app_model WHERE id={id}")` or `cursor.execute("... WHERE id=" + str(id))` — SQL injection. Use `%s` parameters: `cursor.execute("... WHERE id=%s", [id])`.
- Missing `@login_required` / `LoginRequiredMixin` / `PermissionRequiredMixin` on views that should be authenticated.
- `@csrf_exempt` without a justification comment — CSRF protection disabled without documented reason.
- `mark_safe()` applied to user-generated content — XSS vector. Only use `mark_safe()` on strings you fully control.
- `DEBUG = True` in a settings file that is not clearly dev-only — exposes stack traces and internal config to users.
- `ALLOWED_HOSTS = ['*']` in non-dev settings — allows HTTP Host header injection.

---

## Aspect 10 — Code Quality (additional)

- Fat view: business logic (calculations, external API calls, complex conditionals) directly in a view function/class — move to model methods, managers, or a service/use-case layer.
- `request.POST['key']` accessed directly without form validation — use Django Forms or DRF Serializers to validate and sanitize input at the boundary.
- Model class missing `__str__` — Django admin and shell repr become meaningless.
- `CharField`/`TextField` without `max_length` (or without justification for `TextField`) — missing constraint documentation.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic in views instead of model methods, managers, or a service layer — Django's "fat models, thin views" convention; for larger apps, extract to a service/use-case layer.
- Direct cross-app model imports bypassing a defined service boundary — tight coupling between apps; consider using signals, service functions, or an API contract between apps.
- Django Signals used for synchronous, in-request business logic — signals make control flow hard to trace, test, and debug; reserve for genuinely decoupled, post-action side effects.
- Missing `Meta.indexes` on fields used frequently in `.filter()`, `.order_by()`, or JOIN conditions — becomes a performance bottleneck as data grows.
