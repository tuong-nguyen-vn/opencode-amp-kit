# Phase 6: End-to-End Testing

## Overview
- **Priority**: P2 | **Effort**: 2h

Validate complete flow with real tool invocations.

## Test 1: Tool Discovery
- Restart OpenCode
- Verify all 10 tools visible: `team_create`, `team_status`, `team_list`, `team_delete`, `task_create`, `task_update`, `task_get`, `task_list`, `message_send`, `message_fetch`
- Verify tools accessible from Task-spawned subagents

## Test 2: Dependency Auto-Unblock
```
1. team_create("dep-test", "cook", [{name:"dev-1",role:"dev"},{name:"tester",role:"tester"}])
2. task_create("dep-test", "Backend API", ..., owner:"dev-1", blockedBy:[])
   → expect: task-001, status: "pending"
3. task_create("dep-test", "Testing", ..., owner:"tester", blockedBy:["task-001"])
   → expect: task-002, status: "blocked"
4. task_list("dep-test", status:"pending")
   → expect: [task-001] only
5. task_update("dep-test", "task-001", status:"completed")
   → expect: task-001 completed, AND task-002 auto-unblocked to "pending"
6. task_list("dep-test", status:"pending")
   → expect: [task-002]
7. team_delete("dep-test")
```

## Test 3: Multi-Wave Cook Flow
```
1. team_create("cook-test", "cook", [dev-1, dev-2, tester])
2. task_create × 2 (dev tasks, no deps) + 1 (tester, blockedBy both dev tasks)
3. task_list(status:"pending") → [dev-1-task, dev-2-task]
4. Spawn 2 dev agents via Task tool
5. Agents call task_update(status:"completed")
6. task_list(status:"pending") → [tester-task] (auto-unblocked)
7. Spawn tester agent
8. Tester calls task_update(status:"completed")
9. team_status → isComplete: true
10. team_delete
```

## Test 4: Full Skill Integration
```
1. Activate hd-team skill
2. Run: hd-team research "plugin architecture"
3. Verify: team_create called, 3× task_create, 3 researchers spawned
4. Verify: each researcher calls task_update(completed)
5. Verify: synthesis report in plans/reports/
6. Verify: team_delete called
```

## Test 5: Messaging
```
1. Create team + task
2. message_send(team, from:"dev-1", to:"all", type:"finding", content:"...")
3. message_send(team, from:"dev-1", to:"lead", type:"blocker", content:"...")
4. message_fetch(team, to:"lead") → both messages (broadcast + DM)
5. message_fetch(team, to:"dev-2") → only broadcast
6. message_fetch(team, type:"blocker") → only blocker message
```

## Success Criteria
- [x] All tools discoverable by agents and subagents
- [x] Dependency auto-unblock works correctly
- [x] Multi-wave spawn loop works (cook template)
- [x] Messaging filters work (DM, broadcast, type, since)
- [x] Full skill flow completes end-to-end
- [x] All 10 tools validated (30/30 tests PASS — 100%)
- [x] Code review completed (2 CRITICAL + 5 IMPORTANT fixes applied)
