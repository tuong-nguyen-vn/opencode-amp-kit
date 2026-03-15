# Review Standards

Baseline used by `hd-code-review` (Layer 1). Projects override via `docs/REVIEW_STANDARDS.md` (Layer 2 wins on conflict).

---

## 1. Tech Stack

```yaml
tech_stack: ~
# Default (~): auto-detected from diff file extensions in Phase 4.
#   .cs / .csproj / .sln           → dotnet
#   .ts / .js / package.json       → nodejs
#   mixed extensions in one diff   → all matching presets loaded
#
# Override (set explicitly) when auto-detection would be wrong:
#   tech_stack: dotnet             ← force single stack
#   tech_stack: [dotnet, nodejs]   ← force multiple stacks
#
# Available presets: dotnet | nodejs | react | reactnative | expo | vuejs | python | django | go | flutter | php | laravel | cakephp | wordpress | scala
# (Add more by creating reference/stacks/<name>.md following the existing preset format)
```

> Stack presets live in `reference/stacks/`. Auto-detection means zero config is needed for most projects.
> Set `tech_stack` explicitly only to override the detected value.

---

## 2. Aspect Escalations

```yaml
aspect_escalations: []
# Promote Tier 2 advisory aspects to Tier 1 blocker for this project.
# Example:
# - aspect: 12      # Architecture & Design
#   level: blocker
# - aspect: 5       # Redundancy
#   level: blocker
```

---

## 3. Custom Aspects

```yaml
custom_aspects: []
# Add project-specific review dimensions beyond the 12 universal aspects.
# Example:
# - name: "API Documentation"
#   tier: 2                    # 1 = run in Tier 1 (blocker-prone), 2 = Tier 2 (advisory)
#   check: "New public endpoints must have JSDoc annotations and appear in OpenAPI spec"
#   trigger: advisory          # advisory | blocker
#
# - name: "Repository Pattern"
#   tier: 1
#   check: "Database access must go through the repository layer — no direct DbContext in controllers"
#   trigger: blocker
```
