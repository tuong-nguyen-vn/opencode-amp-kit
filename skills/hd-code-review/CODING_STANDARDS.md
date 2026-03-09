# Coding Standards

Baseline used by `hd-code-review` (Layer 1). Projects override via `docs/CODING_STANDARDS.md` (Layer 2 wins on conflict).

---

## 2. Code Style

### 2.1 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | camelCase | `userCount`, `isActive` |
| Functions / Methods | camelCase | `getUserById()`, `handleSubmit()` |
| Classes / Types / Interfaces | PascalCase | `UserService`, `AuthToken` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Files (code) | kebab-case | `user-service.ts`, `auth-handler.go` |
| Files (components) | PascalCase | `UserCard.tsx`, `LoginForm.vue` |
| Database columns | snake_case | `created_at`, `user_id` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |


### 2.2 Patterns to Follow

- Composition over inheritance where possible
- Single responsibility: each function/class does one thing well
- Explicit over implicit: prefer clear, verbose names over clever abbreviations
- Fail fast: validate inputs at boundaries; surface errors early
- Immutability by default: prefer immutable data structures where the language supports it
- Dependency injection over global state


### 2.3 Patterns to Avoid

- `console.log` / `print` / debug statements committed to production code
- Magic numbers and magic strings — define named constants
- Deep nesting (> 3 levels) — refactor to early returns or extracted functions
- Long functions (> 50 lines as a guideline) — break into smaller units
- Copy-paste logic — extract shared logic into utilities
- `any` type in TypeScript without justification
- Swallowed errors (empty catch blocks)


### 2.4 Project-Specific Patterns

_Empty at base level — defined by the project in `docs/CODING_STANDARDS.md`._

```
# Example (fill in per project):
# - All API handlers must use the shared ErrorResponse wrapper
# - Database access goes through the repository layer only
# - Feature-gated code must use the FeatureFlag utility (see Section 3.1)
```

---

## 3. Project Policies

All `required: no` at base level. Projects set `required: yes` to make violations blockers.

---

### 3.1 Feature Flags

```yaml
feature_flags:
  provider: <LaunchDarkly | Unleash | custom | none>
  required: no
  pattern: ~
```

> When `required: yes`: new user-facing features without a flag = blocker.

---

### 3.2 Observability

```yaml
observability:
  provider: <OpenTelemetry | Datadog | Prometheus | custom | none>
  required: no
  requirement: ~
```

> When `required: yes`: new endpoints/workers without metrics+tracing = blocker.

---

### 3.3 Internationalization (i18n)

```yaml
i18n:
  required: no
  requirement: ~
```

> When `required: yes`: hardcoded user-facing strings = blocker.

---

### 3.4 Accessibility (a11y)

```yaml
a11y:
  required: no
  requirement: ~
```

> When `required: yes`: new UI elements missing ARIA labels/alt text/keyboard support = blocker.

