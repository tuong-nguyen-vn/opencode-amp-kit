# Phase 2: Team Tools (Lifecycle)

## Overview
- **Priority**: P1 | **Effort**: 2h

Team lifecycle management in `.opencode/tools/team.ts`. 4 tools.

## Tools

### `team_create`
```
Args: teamName (kebab-case), template, agents: [{name, role}]
Logic:
  1. Create .team/{teamName}/ with subdirs: tasks/, messages/, reports/
  2. Write config.json with metadata + agent roster
  3. Return config
```

### `team_status`
```
Args: teamName
Logic:
  1. Read config.json
  2. Read all tasks → count by status (pending/blocked/in_progress/completed/cancelled)
  3. Read all messages → count
  4. Check reports/ for completed deliverables
  5. Return: { config, taskSummary, messageCount, reports, isComplete }
  6. isComplete = all tasks completed or cancelled
```

### `team_list`
```
Args: (none)
Logic:
  1. List subdirs of .team/
  2. Read each config.json
  3. Return array of { teamName, template, created, agentCount, isComplete }
```

### `team_delete`
```
Args: teamName
Logic:
  1. Verify .team/{teamName}/ exists
  2. rm -rf .team/{teamName}/
  3. Return confirmation
```

## Success Criteria
- [x] 4 tools exported from team.ts
- [x] team_create builds full directory structure
- [x] team_status gives aggregate view with completion flag
- [x] team_delete cleans up completely
