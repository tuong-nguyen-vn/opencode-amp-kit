---
name: hd-docs-init
description: Initialize documentation for a new codebase by scanning code structure, analyzing architecture, and generating initial docs following doc-mapping conventions. Use when onboarding a new project, bootstrapping docs for existing codebase, or creating initial AGENTS.md.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Docs Init Pipeline

Bootstrap documentation from codebase analysis. One-time setup for new/undocumented projects.

## Pipeline Overview

```
REQUEST → SCAN → ANALYZE → GENERATE → REVIEW → APPLY
```

| Phase       | Action                            | Tools (Amp / Claude)                                                          |
| ----------- | --------------------------------- | ----------------------------------------------------------------------------- |
| 1. Scan     | Discover codebase structure       | `finder` (Amp) / `Explore` subagent (Claude)                                 |
| 2. Analyze  | Understand architecture, patterns | `Task` (4 parallel agents) + `oracle` (Amp) / `Plan` (Claude) for synthesis  |
| 3. Generate | Create doc drafts                 | `Task` (parallel per doc type)                                                |
| 4. Review   | Validate against code             | `Task` (`finder` (Amp) / `Explore` subagent (Claude))                        |
| 5. Apply    | Write docs with diagrams          | `create_file` / `edit_file` (Amp) / `Write` / `Edit` (Claude)               |

## Phase 0: Request

Before scanning, ask:

> What language should all file content (docs, comments, changelogs, reports) be written in?
> Press Enter for the default: **English**

- If user presses Enter / says nothing → set `DOCS_LANGUAGE = English`
- If user provides a language → set `DOCS_LANGUAGE = <their answer>`

Use `DOCS_LANGUAGE` when generating the Language Policy section in AGENTS.md.

## Phase 1: Scan Codebase

### 1.1 Get Project Structure

```bash
# Amp: use finder to understand structure
finder "project structure and key directories"
finder "existing documentation files"
finder "package.json or Cargo.toml or go.mod or pyproject.toml"

# Claude: use Explore subagent to understand structure
Explore subagent "project structure and key directories"
Explore subagent "existing documentation files"
Explore subagent "package.json or Cargo.toml or go.mod or pyproject.toml"
```

### 1.2 Identify Project Type

| Indicator                                        | Project Type                        |
| ------------------------------------------------ | ----------------------------------- |
| `package.json`                                   | Node.js/TypeScript                  |
| `package.json` + `packages/` or `apps/`          | Node.js Monorepo (Nx, Turborepo, Lerna) |
| `Cargo.toml`                                     | Rust                                |
| `Cargo.toml` + `[workspace]`                     | Rust Workspace (multi-crate)        |
| `go.mod`                                         | Go                                  |
| `pyproject.toml` or `setup.py`                   | Python                              |
| `composer.json`                                  | PHP                                 |
| `composer.json` + `artisan`                      | PHP / Laravel                       |
| `composer.json` + `symfony.lock`                 | PHP / Symfony                       |
| `wp-config.php` or `wp-content/`                 | WordPress                           |
| `*.sln`                                          | .NET Solution (multi-project workspace) |
| `*.csproj` + `<TargetFramework>net*`             | .NET Core / .NET 5+                 |
| `*.csproj` + `<TargetFrameworkVersion>v4*`       | .NET Framework (legacy)             |
| `docker-compose.yml`                             | Multi-service                       |

> **Workspace vs Monorepo**: A `.sln` file (or Cargo `[workspace]`) means multiple projects share a single repo — this is a **workspace**, not necessarily a monorepo. A true monorepo implies a unified build/dependency system (Nx, Turborepo, Lerna, etc.). Treat `.NET solutions` and `Rust workspaces` as workspace-style repos: document each project separately, with a root-level overview.

### 1.3 Scan Report Template

Ensure output directory exists, then save to `history/docs-init/scan.md`:

```bash
mkdir -p history/docs-init
```

Save to `history/docs-init/scan.md`:

```markdown
# Codebase Scan Report

## Project Type
<type> (monorepo / single-package / multi-service)

## Structure
<tree output from finder (Amp) / Explore subagent (Claude)>

## Key Directories
| Directory | Purpose |
| --------- | ------- |
| src/      | ...     |
| packages/ | ...     |

## Existing Docs
- README.md: <exists/missing>
- AGENTS.md: <exists/missing>
- docs/: <exists/missing>

## Entry Points
- <main files, CLI entry, API routes>

## Dependencies
- <major deps from package.json/Cargo.toml/etc>

## Security Signals
- Handles payment data: yes/no (look for: payment, card, stripe, billing, invoice)
- Handles health/medical data: yes/no (look for: health, medical, PHI, patient, diagnosis)
- Has user accounts/PII: yes/no (look for: user, profile, email, auth, registration)
- Has multi-tenancy: yes/no (look for: tenant, organization, workspace)
- Serves EU users: yes/no (look for: GDPR, EU, europe, or infer from product context)
- Serves Vietnamese users: yes/no (look for: Vietnam, vi-VN, Vietnamese, or infer)
```

## Phase 2: Analyze Architecture

### 2.1 Parallel Analysis via Task

Spawn parallel sub-agents:

```
Task() → Agent A: Architecture analysis (entry points, data flow)
Task() → Agent B: Pattern discovery (common patterns, conventions)
Task() → Agent C: API/CLI surface (public interfaces)
Task() → Agent D: External integrations (DBs, APIs, services)
```

### 2.2 Analysis Prompts

**Architecture Agent:**
```
Understand the scan report and explore the codebase:
1. finder (Amp) / Explore subagent (Claude) to understand key directories structure
2. finder (Amp) / Explore subagent (Claude) "entry point OR main OR app OR server"
3. finder (Amp) / Explore subagent (Claude) for core classes/functions

Return:
{
  "layers": ["presentation", "business", "data"],
  "entry_points": [{"file": "...", "purpose": "..."}],
  "core_modules": [{"name": "...", "responsibility": "..."}],
  "data_flow": "description of how data moves"
}
```

**Pattern Agent:**
```
Analyze coding patterns in the codebase:
1. finder (Amp) / Explore subagent (Claude) "hook OR middleware OR decorator OR handler"
2. Look for consistent naming conventions
3. Identify error handling patterns

Return:
{
  "naming_conventions": {"files": "...", "functions": "...", "classes": "..."},
  "patterns": [{"name": "...", "usage": "...", "example_file": "..."}],
  "error_handling": "description",
  "testing_approach": "description"
}
```

**API/CLI Agent:**
```
Discover public interfaces:
1. finder (Amp) / Explore subagent (Claude) "route OR endpoint OR command OR export"
2. finder (Amp) / Explore subagent (Claude) for exported symbols
3. Understand API route files or CLI command files

Return:
{
  "api_routes": [{"method": "...", "path": "...", "handler": "..."}],
  "cli_commands": [{"name": "...", "description": "..."}],
  "exported_functions": [{"name": "...", "module": "..."}]
}
```

### 2.3 Synthesis

**Amp** — use `oracle`:
```
oracle(
  task: "Synthesize analysis into architecture overview",
  context: """
    Scan report: <scan.md>
    Architecture: <agent A output>
    Patterns: <agent B output>
    Interfaces: <agent C output>
    Integrations: <agent D output>
    
    Output:
    1. High-level architecture description
    2. Component relationships
    3. Key patterns and conventions
    4. Recommended doc structure
  """,
  files: ["history/docs-init/scan.md"]
)
```

**Claude** — use `Plan` subagent:
```
Plan(
  task: "Synthesize analysis into architecture overview",
  context: """
    Scan report: <scan.md>
    Architecture: <agent A output>
    Patterns: <agent B output>
    Interfaces: <agent C output>
    Integrations: <agent D output>
    
    Output:
    1. High-level architecture description
    2. Component relationships
    3. Key patterns and conventions
    4. Recommended doc structure
  """,
  files: ["history/docs-init/scan.md"]
)
```

Save to `history/docs-init/analysis.md`.

## Phase 3: Generate Docs

Based on analysis, determine which docs to create using doc-mapping conventions.

### 3.1 Doc Target Mapping

| Topic Type      | Target Files                              |
| --------------- | ----------------------------------------- |
| Architecture    | `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md` |
| CLI commands    | `packages/cli/AGENTS.md`                  |
| SDK/API         | `packages/sdk/AGENTS.md`                  |
| Quick start     | `README.md`                               |
| Module dev      | `packages/sdk/docs/MODULE_DEVELOPMENT.md` |
| Troubleshooting | `docs/TROUBLESHOOTING.md`                 |
| Deployment      | `docs/DEPLOYMENT.md`                      |
| Migration       | `docs/MIGRATION.md`                       |
| Security standards  | `docs/SECURITY_STANDARDS.md` |
| Coding standards    | `docs/CODING_STANDARDS.md`   |

> **AGENTS.md vs CLAUDE.md**: `AGENTS.md` is the full development guidelines file read by Amp agents. `CLAUDE.md` is a short Claude Code configuration file that points Claude agents to `AGENTS.md`. Always generate both — they serve different agent runtimes but the same guidelines.

### 3.2 Parallel Doc Generation

Spawn Task per doc type:

```
Task() → README.md generator
Task() → AGENTS.md generator
Task() → CLAUDE.md generator (always, alongside AGENTS.md)
Task() → docs/ARCHITECTURE.md generator
Task() → Package-specific AGENTS.md generators
Task() → docs/SECURITY_STANDARDS.md generator (if any security signals detected in scan)
Task() → docs/CODING_STANDARDS.md generator (always)
```

### 3.3 Doc Templates

**README.md Template:**
```markdown
# <Project Name>

<One-line description>

## Features

- <Feature 1>
- <Feature 2>

## Quick Start

    # Installation
    <install command>

    # Run
    <run command>

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](AGENTS.md)

## License

<license>
```

**AGENTS.md Template:**
```markdown
# AGENTS.md

Development guidelines for agents working on this codebase.

## Project Overview

<Brief description>

## Structure

<Directory structure with purposes>

## Commands

| Command | Purpose |
| ------- | ------- |
| `<cmd>` | ...     |

## Architecture

<High-level description>

## Patterns & Conventions

### Naming
<conventions>

### Error Handling
<approach>

### Testing
<approach>

## Development Workflow

<How to develop, test, deploy>

## Language Policy

Conversation may be in any language. All content written to files (docs, comments, changelogs, reports, etc.) must always be in **{DOCS_LANGUAGE}** unless explicitly requested otherwise.
```

**CLAUDE.md Template:**
```markdown
# Claude Code Project Configuration

For full agent development guidelines, see [AGENTS.md](./AGENTS.md).

All Claude agents working on this project should follow the development guidelines outlined in AGENTS.md, which covers:
- Project structure and directory conventions
- Key commands and workflows
- Architecture and patterns
- Development best practices
```

> Keep CLAUDE.md short — it is a pointer file, not a full guidelines doc. All substantive guidelines live in AGENTS.md.

**CLAUDE.md Handling Rules (existing file):**

| Situation | Action |
| --------- | ------ |
| CLAUDE.md missing | Create from template above |
| CLAUDE.md exists, already references `AGENTS.md` | Skip — no-op |
| CLAUDE.md exists, does not reference `AGENTS.md` | Read first, then append a minimal pointer block at the bottom — preserve all existing content |

Append block (when referencing AGENTS.md is missing):
```markdown

## Agent Guidelines

For full agent development guidelines, see [AGENTS.md](./AGENTS.md).
```

**docs/ARCHITECTURE.md Template:**
```markdown
# Architecture

## Overview

<High-level architecture description>

## Components

### <Component 1>
- **Purpose**: ...
- **Location**: ...
- **Dependencies**: ...

## Data Flow

<Description + mermaid diagram>

## External Dependencies

| Dependency | Purpose | Configuration |
| ---------- | ------- | ------------- |
| ...        | ...     | ...           |
```

### 3.4 SECURITY_STANDARDS.md Generation

If ANY security signals detected in the scan report, generate a project-local
`docs/SECURITY_STANDARDS.md` scaffold:

1. Map signals to compliance frameworks:
   | Signal | Framework |
   |--------|-----------|
   | Payment data | PCI-DSS |
   | Health/medical data | HIPAA |
   | EU users | GDPR |
   | Vietnamese users | NĐ 13/2023 |
   | Any user accounts | ISO 27001 (recommended) |

2. Generate file with:
   - `applicable_compliance:` list pre-filled from signal mapping
   - `project_rules:` scaffold with detected PII field hints (e.g., if user accounts → email, name placeholders)
   - Comment: `# Generated by docs-init — review and customize before use`
   - Reference to generic fallback: `# Generic rules: see hd-security-review/SECURITY_STANDARDS.md in your Claude skills directory (~/.claude/skills/hd-security-review/SECURITY_STANDARDS.md)`

3. If NO security signals detected:
   - Still generate the file with empty `applicable_compliance: []`
   - Add comment: `# No security signals detected. Review and declare applicable frameworks.`

### 3.5 CODING_STANDARDS.md Generation

Always generate `docs/CODING_STANDARDS.md` on every hd-docs-init run (no signal required).

1. Start from the base template at `skills/hd-code-review/CODING_STANDARDS.md`

2. Scan codebase for signals to pre-fill project-specific values:
   | Signal | Pre-fill |
   |--------|---------|
   | Language/framework (from project type) | Naming convention defaults under "Naming" section |
   | Existing patterns (from Pattern Agent output) | Note under "Patterns to Follow" |
   | Feature flag library (LaunchDarkly, Unleash, Flagsmith, etc.) | Feature Flags policy block |
   | i18n library (i18next, react-intl, vue-i18n, etc.) | i18n policy block |

3. Leave all Project Policies as `required: no` by default — user enables manually.
   Add comment at top: `# Generated by docs-init — review and set required: yes for policies your project enforces`
   Add reference: `# Base template: see hd-code-review/CODING_STANDARDS.md in your Claude skills directory (~/.claude/skills/hd-code-review/CODING_STANDARDS.md)`

4. Write to `docs/CODING_STANDARDS.md`

## Phase 4: Review

### 4.1 Validation via finder (Amp) / Explore Subagent (Claude)

```
Task(
  subagent_type: "finder (Amp) / Explore (Claude)",
  prompt: """
    Review these generated docs against the actual codebase:
    <list of generated doc files>

    Validate:
    1. Accuracy - Does each doc match code reality?
    2. Completeness - Any missing critical info?
    3. Consistency - Terms match across docs?
    4. Clarity - Would a new developer understand?

    For each doc, output: PASS or list of specific changes needed.
  """
)
```

### 4.2 Review Checklist

```
- [ ] All entry points documented
- [ ] Commands table complete and tested
- [ ] Architecture diagram matches code
- [ ] Dependencies listed correctly
- [ ] Development workflow accurate
- [ ] No placeholder text remaining
```

## Phase 5: Apply

### 5.1 Create/Update Files

```
create_file (Amp) / Write (Claude) → for new docs
edit_file (Amp) / Edit (Claude)    → for existing docs (preserve existing content, extend rather than replace)
```

### 5.2 Architecture Diagrams

Create mermaid with citations

### 5.3 Monorepo Handling

For monorepos, create package-level AGENTS.md:

```bash
for package in packages/*; do
  # Create packages/<name>/AGENTS.md with package-specific info
done
```

## Concrete Example

User: "Initialize docs for this new project"

```
1. Scan:
   glob + Read → packages/cli, packages/sdk, apps/server
   glob "**/*.md" → only README.md exists (minimal)
   
2. Analyze (parallel):
   Agent A: Entry points at apps/server/src/index.ts, packages/cli/src/main.ts
   Agent B: Uses command pattern, kebab-case files, zod validation
   Agent C: REST API at /api/*, CLI has 5 commands
   Agent D: PostgreSQL, Redis cache
   
3. `oracle` (Amp) / `Plan` subagent (Claude) synthesizes:
   → 3-layer architecture: CLI → SDK → Server → DB
   → Recommend: AGENTS.md, docs/ARCHITECTURE.md, package AGENTS.md files
   
4. Generate (parallel):
   Task → README.md with quick start
   Task → Root AGENTS.md with overview
   Task → CLAUDE.md pointing to AGENTS.md (always)
   Task → docs/ARCHITECTURE.md with diagrams
   Task → packages/cli/AGENTS.md
   Task → packages/sdk/AGENTS.md
   Task → docs/CODING_STANDARDS.md (always; pre-filled from pattern analysis)
   
5. Review:
   `oracle` (Amp) / `Plan` subagent (Claude) validates all docs match code
   
6. Apply:
   create_file for each doc
   mermaid for architecture diagrams
```

## Tool Quick Reference

| Goal                  | Tool (Amp / Claude)                                               |
| --------------------- | ----------------------------------------------------------------- |
| Find code/structure   | `finder` (Amp) / `Explore` subagent (Claude)                     |
| Parallel analysis     | `Task` (spawn multiple)                                           |
| Synthesis             | `oracle` (Amp) / `Plan` (Claude)                                 |
| Validate docs         | `Task` (`finder` (Amp) / `Explore` subagent (Claude))            |
| Create docs           | `create_file` (Amp) / `Write` (Claude)                           |
| Update docs           | `edit_file` (Amp) / `Edit` (Claude)                              |

## Quality Checklist

```
- [ ] Scan complete (structure, deps, entry points)
- [ ] All layers analyzed (architecture, patterns, APIs)
- [ ] Docs match doc-mapping conventions
- [ ] Diagrams have code citations
- [ ] Plan validated against code
- [ ] No placeholder text remaining
- [ ] Commands tested and working
- [ ] AGENTS.md generated (always required)
- [ ] CLAUDE.md generated pointing to AGENTS.md (always required)
- [ ] docs/CODING_STANDARDS.md generated (always required)
```

## Output Summary Notes

After generation, report the following to the user:

| File | Status | Note |
| ---- | ------ | ---- |
| `AGENTS.md` | created | Review and customize for your project |
| `CLAUDE.md` | created | Short pointer file for Claude Code agents — do not add full guidelines here |
| `docs/ARCHITECTURE.md` | created | Verify diagrams match code |
| `docs/SECURITY_STANDARDS.md` | created | Set `applicable_compliance` if security signals were detected |
| `docs/CODING_STANDARDS.md` | created | Edit `docs/CODING_STANDARDS.md` to enable project policies (feature flags, observability, i18n) as `required: yes` |

## Troubleshooting

**Large codebase**: Focus on `packages/` or `src/` first, expand later

**No clear entry point**: Look for `main`, `index`, `app`, `server` files

**Mixed languages**: Create separate sections per language in AGENTS.md

**Existing partial docs**: Read first, extend rather than replace
