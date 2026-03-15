---
name: hd-docs-init
description: Initialize documentation for a new codebase by scanning code structure, analyzing architecture, and generating initial docs following doc-mapping conventions. Uses Agent Team Tools to parallelize analysis and doc generation. Use when onboarding a new project, bootstrapping docs for existing codebase, or creating initial AGENTS.md.
license: proprietary
metadata:
  version: "2.0.0"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Docs Init Pipeline

Bootstrap documentation from codebase analysis. One-time setup for new/undocumented projects. Uses Agent Team Tools to parallelize the analysis and generation phases.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DOCS INIT LEAD                              │
│                         (This Agent)                                │
├─────────────────────────────────────────────────────────────────────┤
│  Phase 0:   Language preference                                     │
│  Phase 1:   Scan codebase (lead — lightweight)                      │
│  Phase 2:   Create team → 4 analysis workers → synthesize           │
│  Phase 3:   Create doc generation tasks → N doc workers             │
│  Phase 4:   Collect + review via message_fetch                      │
│  Phase 5:   Apply docs + team_delete                                │
└─────────────────────────────────────────────────────────────────────┘
           │
           │  Phase 2: team_create + task_create × 4 analysis
           │  Phase 3: task_create × N doc generators
           ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Analyst A│  │ Analyst B│  │ Analyst C│  │ Analyst D│
│ Architect│  │ Patterns │  │ API/CLI  │  │ Integra- │
│ ure      │  │          │  │ Surface  │  │ tions    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     └──────────────┼──────────────┼──────────────┘
                    ▼ (after analysis complete)
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ DocGen   │  │ DocGen   │  │ DocGen   │  │ DocGen   │  │ DocGen   │
│ README   │  │ AGENTS   │  │ ARCHIT.  │  │ SECURITY │  │ CODING   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## Pipeline Overview

```
REQUEST → SCAN → TEAM CREATE → ANALYZE (parallel) → SYNTHESIZE → GENERATE (parallel) → REVIEW → APPLY → CLEANUP
```

| Phase       | Action                            | Tools                                                                 |
| ----------- | --------------------------------- | --------------------------------------------------------------------- |
| 1. Scan     | Discover codebase structure       | `finder` (Amp/hdcode) / `Explore` subagent (Claude)                   |
| 2. Analyze  | Create team, 4 parallel workers   | `team_create`, `task_create` × 4, `Task("worker")` × 4               |
| 2.3 Synth.  | Synthesize analysis results       | `message_fetch`, `oracle` / `Plan` subagent                          |
| 3. Generate | N parallel doc workers            | `task_create` × N, `Task("worker")` × N                              |
| 4. Review   | Collect + validate docs           | `message_fetch`, `task_list`                                          |
| 5. Apply    | Write docs, clean up team         | `Write` / `Edit`, `team_delete`                                       |

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
<tree output from finder (Amp/hdcode) / Explore subagent (Claude)>

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

## Phase 2: Analyze Architecture (Agent Team)

### 2.0 Create Docs Init Team

```
team_create(teamName="docs-init-<PROJECT_SLUG>", description="Documentation init for <project name>")
```

### 2.1 Create Analysis Tasks

Create 4 analysis tasks — all independent (no dependencies):

```
task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="Architecture Analysis",
  description="Analyze codebase architecture:\n1. Explore key directories\n2. Find entry points (main, index, app, server)\n3. Identify core classes/functions\n4. Map data flow\n\nReturn JSON: layers, entry_points, core_modules, data_flow\n\nScan report: <scan.md path>",
  metadata='{"analyst": "arch", "phase": "analysis"}'
)
# → returns taskId "1"

task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="Pattern Discovery",
  description="Analyze coding patterns:\n1. Find hooks, middleware, decorators, handlers\n2. Identify naming conventions\n3. Document error handling patterns\n4. Identify testing approach\n\nReturn JSON: naming_conventions, patterns, error_handling, testing_approach\n\nScan report: <scan.md path>",
  metadata='{"analyst": "pattern", "phase": "analysis"}'
)
# → returns taskId "2"

task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="API/CLI Surface Discovery",
  description="Discover public interfaces:\n1. Find routes, endpoints, commands, exports\n2. Identify exported symbols\n3. Map API routes or CLI commands\n\nReturn JSON: api_routes, cli_commands, exported_functions\n\nScan report: <scan.md path>",
  metadata='{"analyst": "api", "phase": "analysis"}'
)
# → returns taskId "3"

task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="External Integrations Discovery",
  description="Discover external integrations:\n1. Find database connections\n2. Identify external API clients\n3. Map service dependencies\n4. List infrastructure requirements\n\nReturn JSON: databases, external_apis, services, infra_requirements\n\nScan report: <scan.md path>",
  metadata='{"analyst": "integration", "phase": "analysis"}'
)
# → returns taskId "4"
```

### 2.1b Spawn Analysis Workers

Spawn all 4 workers simultaneously:

| Worker | Task | Model | Focus |
|--------|------|-------|-------|
| `analyst-arch` | #1 | haiku | Architecture, entry points, data flow |
| `analyst-pattern` | #2 | haiku | Patterns, naming, error handling |
| `analyst-api` | #3 | haiku | API/CLI surface, exports |
| `analyst-integration` | #4 | haiku | Databases, APIs, services |

**Worker prompt template:**

```
You are an analysis worker executing task #{TASK_ID} in team "docs-init-<PROJECT_SLUG>".

## Protocol

### 1. Start
- task_get(teamName="docs-init-<PROJECT_SLUG>", taskId="{TASK_ID}") — read full task details
- task_update(teamName="docs-init-<PROJECT_SLUG>", taskId="{TASK_ID}", status="in_progress")

### 2. Analyze
- Read the scan report
- Use finder/Explore to explore the codebase
- Gather data for your assigned analysis focus
- Be thorough but concise

### 3. Complete
- task_update(teamName="docs-init-<PROJECT_SLUG>", taskId="{TASK_ID}", status="completed",
    description="<append analysis summary>")
- message_send(teamName="docs-init-<PROJECT_SLUG>", type="message", from="{AGENT_ID}",
    recipient="lead", content="<structured analysis output as JSON>")

### 4. Done
- Return analysis results
```

### 2.1c Monitor Analysis

```
WHILE analysis tasks remain in_progress:
  task_list(teamName="docs-init-<PROJECT_SLUG>")
  → check statuses
  message_fetch(teamName="docs-init-<PROJECT_SLUG>", agent="lead")
  → collect analysis results as they arrive
```

### 2.2 Analysis Prompts

> Analysis prompts are embedded in the task descriptions above (Step 2.1). Each worker receives its full prompt via `task_get`. See the task descriptions for exact analysis instructions per domain.

### 2.3 Synthesis

After all 4 analysis workers complete, the lead synthesizes results using `oracle` / `Plan` subagent:

## Phase 3: Generate Docs (Agent Team — Parallel)

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
| Review standards    | `docs/REVIEW_STANDARDS.md`   |

> **AGENTS.md vs CLAUDE.md**: `AGENTS.md` is the full development guidelines file read by Amp agents. `CLAUDE.md` is a short Claude Code configuration file that points Claude agents to `AGENTS.md`. Always generate both — they serve different agent runtimes but the same guidelines.

### 3.2 Create Doc Generation Tasks

Create one task per doc type. Doc generation tasks are blocked by all analysis tasks (must wait for synthesis):

```
task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="Generate README.md",
  description="Generate README.md from synthesis results.\n\nTemplate: <README template>\nAnalysis: <synthesis output>\nScan: <scan.md>",
  addBlockedBy="1,2,3,4",
  metadata='{"doc": "README.md", "phase": "generation"}'
)

task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="Generate AGENTS.md",
  description="Generate AGENTS.md from synthesis results.\n\nTemplate: <AGENTS.md template>\nAnalysis: <synthesis output>\nScan: <scan.md>\nDOCS_LANGUAGE: <language>",
  addBlockedBy="1,2,3,4",
  metadata='{"doc": "AGENTS.md", "phase": "generation"}'
)

task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="Generate CLAUDE.md",
  description="Generate CLAUDE.md pointer file.\n\nTemplate: <CLAUDE.md template>",
  addBlockedBy="1,2,3,4",
  metadata='{"doc": "CLAUDE.md", "phase": "generation"}'
)

task_create(
  teamName="docs-init-<PROJECT_SLUG>",
  subject="Generate docs/ARCHITECTURE.md",
  description="Generate docs/ARCHITECTURE.md from synthesis results.\n\nTemplate: <ARCHITECTURE template>\nAnalysis: <synthesis output>",
  addBlockedBy="1,2,3,4",
  metadata='{"doc": "docs/ARCHITECTURE.md", "phase": "generation"}'
)

# Additional tasks for SECURITY_STANDARDS, CODING_STANDARDS, REVIEW_STANDARDS, KNOWN_ISSUES...
# Create one task per doc, all addBlockedBy="1,2,3,4"
```

### 3.2b Spawn Doc Generator Workers

After analysis tasks complete (auto-unblocked by task system), spawn doc generators:

| Worker | Doc | Model |
|--------|-----|-------|
| `docgen-readme` | README.md | haiku |
| `docgen-agents` | AGENTS.md | sonnet |
| `docgen-claude` | CLAUDE.md | haiku |
| `docgen-arch` | docs/ARCHITECTURE.md | haiku |
| `docgen-security` | docs/SECURITY_STANDARDS.md | haiku |
| `docgen-coding` | docs/CODING_STANDARDS.md | haiku |
| `docgen-review` | docs/REVIEW_STANDARDS.md | haiku |
| `docgen-ki` | docs/KNOWN_ISSUES.md | haiku |

> Use sonnet for AGENTS.md (most complex doc); haiku for all others.

**Worker prompt template:**

```
You are a doc generator executing task #{TASK_ID} in team "docs-init-<PROJECT_SLUG>".

## Protocol

### 1. Start
- task_get(teamName="docs-init-<PROJECT_SLUG>", taskId="{TASK_ID}")
- task_update(teamName="docs-init-<PROJECT_SLUG>", taskId="{TASK_ID}", status="in_progress")

### 2. Generate
- Read the synthesis analysis from task description
- Generate the doc following the template provided
- Ensure accuracy against codebase (use finder/Explore to verify claims)

### 3. Complete
- task_update(teamName="docs-init-<PROJECT_SLUG>", taskId="{TASK_ID}", status="completed",
    description="<doc file generated successfully>")
- message_send(teamName="docs-init-<PROJECT_SLUG>", type="message", from="{AGENT_ID}",
    recipient="lead", content="<full generated doc content>")

### 4. Done
- Return doc content
```

### 3.2c Monitor Doc Generation

```
WHILE doc generation tasks remain in_progress:
  task_list(teamName="docs-init-<PROJECT_SLUG>")
  → check statuses
  message_fetch(teamName="docs-init-<PROJECT_SLUG>", agent="lead")
  → collect generated docs as they arrive
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

---

### 3.6 REVIEW_STANDARDS.md Generation

Always generate `docs/REVIEW_STANDARDS.md` on every hd-docs-init run (no signal required).

1. Start from the base template at `skills/hd-code-review/REVIEW_STANDARDS.md`

2. Map detected project type to `tech_stack`:
   | Project type (from Phase 1.2) | tech_stack value |
   |-------------------------------|-----------------|
   | Node.js / TypeScript          | nodejs          |
   | Node.js Monorepo              | nodejs          |
   | .NET Core / .NET 5+           | dotnet          |
   | .NET Framework                | dotnet          |
   | .NET Solution (multi-project) | dotnet          |
   | Mixed (e.g. .NET API + Node frontend) | [dotnet, nodejs] |
   | Other / unknown               | ~ (leave blank) |

3. Pre-fill `tech_stack:` with the detected value as a convenience hint. The skill also auto-detects from diff
   extensions at review time, so this field can remain `~` if left unchanged.
   Add comment at top: `# Generated by docs-init — tech_stack is optional (auto-detected from diff); set only to override`
   Add reference: `# Base template: see hd-code-review/REVIEW_STANDARDS.md in your Claude skills directory (~/.claude/skills/hd-code-review/REVIEW_STANDARDS.md)`

4. Write to `docs/REVIEW_STANDARDS.md`

## Phase 4: Review

### 4.1 Validation

After all doc generation tasks complete, the lead validates generated docs against the codebase:

```
finder (Amp/hdcode) / Explore subagent (Claude): Verify generated docs match code reality
```

For each generated doc, check:
1. **Accuracy** — Does each doc match code reality?
2. **Completeness** — Any missing critical info?
3. **Consistency** — Terms match across docs?
4. **Clarity** — Would a new developer understand?

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
create_file (Amp/hdcode) / Write (Claude) → for new docs
edit_file (Amp/hdcode) / Edit (Claude)    → for existing docs (preserve existing content, extend rather than replace)
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

### 5.4 Team Cleanup

After all docs are written:

```
team_delete(teamName="docs-init-<PROJECT_SLUG>")
```

Display: `Docs init team cleaned up.`

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
   
3. `oracle` (Amp/hdcode) / `Plan` subagent (Claude) synthesizes:
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
   `oracle` (Amp/hdcode) / `Plan` subagent (Claude) validates all docs match code
   
6. Apply:
   create_file for each doc
   mermaid for architecture diagrams
```

## Tool Quick Reference

| Goal                  | Tool                                                          |
| --------------------- | ------------------------------------------------------------- |
| Find code/structure   | `finder` (Amp/hdcode) / `Explore` subagent (Claude)          |
| Create analysis team  | `team_create`                                                 |
| Create analysis/doc tasks | `task_create` (with `addBlockedBy` for doc tasks)         |
| Spawn workers         | `Task("worker")` (Amp/hdcode) / `Agent("worker")` (Claude)   |
| Monitor progress      | `task_list`, `message_fetch`                                  |
| Synthesis             | `oracle` (Amp/hdcode) / `Plan` (Claude)                      |
| Validate docs         | `finder` (Amp/hdcode) / `Explore` subagent (Claude)          |
| Create docs           | `create_file` (Amp/hdcode) / `Write` (Claude)                |
| Update docs           | `edit_file` (Amp/hdcode) / `Edit` (Claude)                   |
| Clean up team         | `team_delete`                                                 |

### Agent Team Tools Used

| Phase | Tool | Purpose |
|-------|------|---------|
| 2.0 | `team_create` | Create docs-init team |
| 2.1 | `task_create` × 4 | Analysis tasks (no dependencies) |
| 2.1b | `Task("worker")` × 4 | Spawn analysis workers |
| 2.1c | `task_list`, `message_fetch` | Monitor analysis |
| 3.2 | `task_create` × N | Doc generation tasks (blocked by analysis) |
| 3.2b | `Task("worker")` × N | Spawn doc generator workers |
| 3.2c | `task_list`, `message_fetch` | Monitor doc generation |
| 5.4 | `team_delete` | Clean up team |

### Team Naming Convention

Team name: `docs-init-<PROJECT_SLUG>` (e.g., `docs-init-billing-api`)

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
- [ ] docs/REVIEW_STANDARDS.md generated (always required)
- [ ] docs/KNOWN_ISSUES.md generated (always required)
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
| `docs/REVIEW_STANDARDS.md` | created | Verify `tech_stack` is correct; add `custom_aspects` and `aspect_escalations` as needed |
| `docs/KNOWN_ISSUES.md` | created | Populate with project-specific known issues and accepted configuration debt |

## Troubleshooting

**Large codebase**: Focus on `packages/` or `src/` first, expand later

**No clear entry point**: Look for `main`, `index`, `app`, `server` files

**Mixed languages**: Create separate sections per language in AGENTS.md

**Existing partial docs**: Read first, extend rather than replace
