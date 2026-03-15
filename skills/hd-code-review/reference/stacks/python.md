# Stack: Python — Additional Review Checks

Injected into Phase 4 aspects when `.py` files are detected in the diff (or `tech_stack: python` declared).
When Django path signals are also present (views.py, models.py, urls.py, migrations/), the `django` preset is loaded IN ADDITION to this one.
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- Mutable default argument — `def f(items=[])` or `def f(config={})`: the default object is created once and shared across all calls; subsequent calls mutate the same object. Use `None` and initialize inside the function.
- `is` used for value comparison — `if x is "hello"` or `if x is 42`: identity check, not equality. Use `==` for value comparison. (`is None` / `is not None` are correct.)
- Float equality without tolerance — `if result == 0.1 + 0.2` is almost always `False`; use `math.isclose()` or `abs(a - b) < epsilon`.
- Broad `except Exception` with no logging or re-raise — silently swallows unexpected errors and hides bugs.

---

## Aspect 3 — Possible Breakage (additional)

- File or resource not closed — `open()`, database cursors, network connections must use `with` (context manager); explicit `.close()` is skipped on exception.
- Bare `except:` clause — catches `BaseException`, including `KeyboardInterrupt`, `SystemExit`, and `GeneratorExit`. Almost always wrong; use `except Exception:` at minimum.
- Generator or iterator consumed after the underlying collection was modified — results are undefined.
- `threading` without proper synchronization on shared mutable state — GIL does not protect compound operations (`dict[k] += 1` is not atomic).

---

## Aspect 7 — Security (additional)

- `eval()` / `exec()` with any user-controlled input — arbitrary code execution.
- `subprocess.run(..., shell=True)` with user-controlled arguments — shell injection. Pass arguments as a list instead.
- `pickle.loads()` / `yaml.load()` (not `yaml.safe_load()`) from untrusted input — arbitrary code execution during deserialization.
- SQL via string formatting — `f"SELECT * FROM {table}"` or `"SELECT * FROM " + table` — SQL injection. Use parameterized queries (`cursor.execute("SELECT * FROM t WHERE id = %s", [id])`).
- Hardcoded secrets or API keys in source files — use environment variables or secrets manager.

---

## Aspect 10 — Code Quality (additional)

- Inconsistent string formatting style in the same file — mixing `f"..."`, `"...".format()`, and `%s` formatting without a reason.
- Missing type hints on new public functions / methods — hurts readability, IDE support, and static analysis.
- `from module import *` — pollutes the namespace, makes it impossible to know where names come from, and breaks refactoring tools.
- Shadowing a built-in name — `list = []`, `id = ...`, `input = ...` silently breaks later uses of the built-in.

---

## Aspect 12 — Architecture & Design (additional)

- Circular imports — `module A` imports `module B` which imports `module A`; causes `ImportError` or partial initialization bugs. Restructure or use late imports.
- Heavy computation or I/O at module top-level — code outside functions/classes runs on every `import`; slows startup, causes issues in tests, and runs in unexpected contexts.
- `global` statement modifying module-level state — use class attributes, return values, or dependency injection instead.
