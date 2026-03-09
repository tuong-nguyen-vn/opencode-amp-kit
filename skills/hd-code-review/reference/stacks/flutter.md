# Stack: Flutter — Additional Review Checks

Injected into Phase 4 aspects when `.dart` or `pubspec.yaml` files are detected in the diff (or `tech_stack: flutter` declared).
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- `BuildContext` used across an `async` gap without a `mounted` check — after any `await`, the widget may have been disposed; accessing `context` after the gap causes "use of BuildContext after async gap" errors. Guard with `if (!mounted) return;`.
- `initState` launching async operations without `mounted` checks on completion — the async callback may call `setState` after the widget is disposed.
- `setState` called after `dispose()` — any async operation started in `initState` or a callback that completes after navigation away causes a framework error.
- `late` variable accessed before initialization — `LateInitializationError` at runtime; ensure assignment happens before first use, or use nullable type.

---

## Aspect 3 — Possible Breakage (additional)

- `StreamSubscription` not cancelled in `dispose()` — memory leak; the stream keeps a reference to the widget after it is removed from the tree.
- `AnimationController`, `TextEditingController`, `FocusNode`, `ScrollController`, `PageController` not disposed — each holds native resources; must call `.dispose()` in the widget's `dispose()` override.
- `Timer` / `Timer.periodic` not cancelled in `dispose()` — fires callbacks on a disposed widget.
- `GlobalKey` reused across different widget types or subtrees — causes framework assertion errors and incorrect state transfer.

---

## Aspect 7 — Security (additional)

- Sensitive data (tokens, passwords, PII) stored with `SharedPreferences` — stored as plain text; use `flutter_secure_storage` for sensitive values.
- API keys or secrets hardcoded in Dart source or `pubspec.yaml` — Dart code and assets are extractable from the APK/IPA; use server-side secrets or secure environment injection via `--dart-define`.
- `WebView` loading user-supplied URLs without validation — XSS or phishing risk; validate scheme and domain before loading.

---

## Aspect 10 — Code Quality (additional)

- Missing `const` constructor on widgets that could be `const` — non-const widgets are rebuilt on every parent rebuild; `const` widgets are only built once and reused.
- `build()` method longer than ~50 lines — extract into smaller private widget methods or separate `StatelessWidget` classes; large `build()` is a maintenance and rebuild-scope problem.
- Complex business logic inside `build()` — computed values, data transformations, and conditionals belong in the widget state, a controller, or a dedicated model; `build()` should be declarative.
- `print()` in production code — use a proper logging package (`logger`, `talker`) with level filtering so debug output does not reach production.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic directly in `StatefulWidget` or `StatelessWidget` — use a state management solution (BLoC/Cubit, Riverpod, Provider, GetX per project convention) to separate UI from logic.
- Deep widget nesting (> 5–6 levels without extraction) — leads to the "pyramid of doom"; extract subtrees into named widget classes for readability and testability.
- `setState` used in a widget that is also shared across routes or has complex state — indicates the state belongs at a higher level or in a dedicated state management class.
- Platform channel calls (`MethodChannel`) not abstracted behind an interface — makes testing difficult; wrap in a repository or service class that can be mocked.
