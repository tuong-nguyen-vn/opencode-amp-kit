# Stack: Scala — Additional Review Checks

Injected into Phase 4 aspects when `.scala` or `build.sbt` files are detected in the diff (or `tech_stack: scala` declared).
Apply these checks IN ADDITION TO the universal checklist items for each aspect.

---

## Aspect 2 — Correctness (additional)

- `.get` called on `Option` without prior `isDefined` check — throws `NoSuchElementException` on `None`; use `getOrElse`, `fold`, pattern match, or `map`/`flatMap`.
- `Await.result()` / `Await.ready()` with `Duration.Inf` on a Future — blocks the calling thread indefinitely; always set a finite timeout.
- Mutable shared state in an `Actor` accessed from outside the actor — Akka actors must only be interacted with via messages; direct field access breaks the concurrency model.
- `==` on case classes vs reference types — works correctly for case classes (structural equality), but reference-type instances use reference equality unless `equals` is overridden; verify intent.
- `flatMap` / `map` on `Future` that swallows exceptions — unhandled `Future` failures silently disappear; use `.recover` or `.recoverWith` to handle failures explicitly.

---

## Aspect 3 — Possible Breakage (additional)

- `Future` started outside an `ExecutionContext` passed as implicit — missing implicit `ec` causes compilation error or picks up an unintended global context (e.g., `scala.concurrent.ExecutionContext.global` for blocking I/O, which exhausts the thread pool).
- Blocking I/O (`Await`, JDBC, file reads) on the default `ExecutionContext` — the global EC is sized for CPU-bound work; blocking on it starves other Futures. Use a dedicated blocking EC (`ExecutionContext.fromExecutor(Executors.newCachedThreadPool())`).
- `var` in a class shared across Futures without synchronization — race condition; prefer immutable vals, `Atomic` references, or actor-based state.
- Pattern match not exhaustive on a sealed trait — `MatchError` at runtime; the compiler warns but it can be suppressed; verify all cases are handled.

---

## Aspect 7 — Security (additional)

- String interpolation in SQL queries (`s"SELECT * FROM t WHERE id=$id"`) — SQL injection. Use prepared statements or a type-safe query library (Doobie, Slick, Quill).
- Deserialization of untrusted Java-serialized objects (`ObjectInputStream`) — arbitrary code execution; avoid Java serialization for external data; use JSON/Protobuf instead.
- Scala `xml.XML.loadString(userInput)` without entity expansion disabled — XXE (XML External Entity) attack. Use a secure XML parser configuration.

---

## Aspect 10 — Code Quality (additional)

- Overuse of `asInstanceOf` casts — defeats the type system; use pattern matching or type-safe abstractions.
- `null` returned or accepted instead of `Option` — null references in Scala are idiomatic Java but break functional composition; prefer `Option[T]`.
- Implicit conversions that are not obviously scoped — wide-scope implicits cause surprising behavior; prefer explicit conversions or type classes.
- `throw` in a for-comprehension or `map` — breaks the monadic chain; return `Try`, `Either`, or `Option` to represent failure.

---

## Aspect 12 — Architecture & Design (additional)

- Business logic in Akka Actor `receive` handlers directly — complex logic in receive makes actors untestable; delegate to pure functions or services called from the actor.
- Mixing `Future`-based and blocking code in the same layer — inconsistent async model creates thread pool starvation and unpredictable behavior.
- Type class instances defined in a non-companion object or non-package-object scope — may not be picked up by implicit resolution; place in companion objects or import explicitly.
