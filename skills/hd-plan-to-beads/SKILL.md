---
name: hd-plan-to-beads
description: File detailed Beads epics and issues from a plan. Use when converting plans, roadmaps, or feature specs into structured Beads issues with proper dependencies.
license: proprietary
metadata:
  copyright: "© HDWEBSOFT. All rights reserved."
---

# File Beads Epics and Issues from Plan

You are tasked with converting a plan into a comprehensive set of Beads epics and issues. Follow these steps carefully:

## Step 1: Understand the Plan

First, review the plan context provided by the user.

If no specific plan is provided, ask the user to share the plan or point to a planning document (check `history/` directory for recent plans).

## Step 2: Analyze and Structure

Before filing any issues, analyze the plan for:

1. **Major workstreams** - These become epics
2. **Individual tasks** - These become issues under epics
3. **Dependencies** - What must complete before other work can start?
4. **Parallelization opportunities** - What can be worked on simultaneously?
5. **Technical risks** - What needs spikes or investigation first?
6. **UI standards context** — If UI standards were passed from `hd-planning`, note which patterns have standards defined. These will be embedded in Technical Notes for matching UI beads.

## Step 3: File Epics First

Create epics for major workstreams using:

```bash
br create "Epic: <title>" -t epic -p <priority> --json
```

Epics should:

- Have clear, descriptive titles
- Include acceptance criteria in the description
- Be scoped to deliverable milestones

## Step 4: File Detailed Issues

For each epic, create child issues with:

```bash
br create "<task title>" -t <type> -p <priority> --deps <parent-epic-id> --json
```

Each issue MUST include:

- **Clear title** - Action-oriented (e.g., "Implement X", "Add Y", "Configure Z")
- **Detailed description** - What exactly needs to be done
- **Acceptance criteria** - How do we know it's done?
- **Technical notes** - Implementation hints, gotchas, relevant files
- **UI Standard** *(UI beads only)* - If this bead involves UI work (pages, forms, views, dashboards, modals, tables, lists), add a UI Standard block:

  **A bead is a "UI bead" if its title or description contains**: page, view, form, layout, component, UI, screen, modal, dialog, dashboard, table, list.

  If a UI standard was provided for this pattern:
  ```markdown
  ### UI Standard
  - Pattern: <list-view / form / dashboard / etc.>
  - Standard: docs/ui-standards/<pattern>.md
    *(Read this file before implementing any UI in this bead)*
  ```

  If NO standard was defined for this pattern:
  ```markdown
  ### UI Standard
  - No standard defined — follow existing component patterns in the codebase.
  ```

  Non-UI beads (backend, infra, data, config): omit this block entirely.
- **Dependencies** - Link to blocking issues with `--deps bd-<id>`

## Step 5: Map Dependencies Carefully

For each issue, consider:

- Does this depend on another issue completing first?
- Can this be worked on in parallel with siblings?
- Are there cross-epic dependencies?

Use `--deps bd-X,bd-Y` (IDs like `bd-X`) for multiple dependencies.

## Step 6: Set Priorities Thoughtfully

- `0` - Critical path blockers, security issues
- `1` - Core functionality, high business value
- `2` - Standard work items (default)
- `3` - Nice-to-haves, polish
- `4` - Backlog, future considerations

## Step 7: Verify the Graph

After filing all issues, run:

```bash
br list --json
br ready --json
```

Verify:

- All epics have child issues
- Dependencies form a valid DAG (no cycles)
- Ready work exists (some issues have no blockers)
- Priorities make sense for execution order
- UI beads contain a `### UI Standard` block in Technical Notes (if any UI beads exist in the plan)

## Output Format

After completing, provide:

1. Summary of epics created
2. Summary of issues per epic
3. Dependency graph overview (what unblocks what)
4. Suggested starting points (ready issues)
5. Parallelization opportunities
