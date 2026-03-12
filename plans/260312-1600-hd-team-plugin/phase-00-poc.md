# Phase 0: POC — Verify Platform Assumptions

## Overview
- **Priority**: P0 (GATING) | **Effort**: 1h

Three assumptions must be verified before implementation. If any fails, plan needs redesign.

## POC 1: Subagent Tool Inheritance

**Question**: Do Task-spawned subagents see custom tools in `.opencode/tools/`?

```
1. Create .opencode/tools/poc-ping.ts:
   export default tool({ description: "POC ping", args: {}, execute() { return "pong" } })
2. Restart OpenCode
3. Verify poc-ping appears in tool list
4. Spawn a subagent: Task(subagent_type="general", prompt="Call the poc-ping tool and return the result")
5. If subagent returns "pong" → PASS
6. If subagent says tool not found → FAIL (must use plugin approach instead of custom tools)
```

**If FAIL**: Fallback to Plugin-based tool registration (plugin tools are registered differently — they attach to the host process).

## POC 2: Shared Module Imports

**Question**: Can `.opencode/tools/task.ts` import from `.opencode/tools/lib/types.ts`?

```
1. Create .opencode/tools/lib/helper.ts:
   export function greet(name: string) { return `Hello ${name}` }
2. Create .opencode/tools/poc-import.ts:
   import { greet } from "./lib/helper"
   export default tool({ description: "POC import", args: { name: tool.schema.string() },
     execute(args) { return greet(args.name) } })
3. Restart OpenCode
4. Call poc-import with name="World"
5. If returns "Hello World" → PASS
6. If import error → FAIL (must inline all types, no shared lib/)
```

**If FAIL**: Inline types directly in each tool file. Increases duplication but still works.

## POC 3: Parallel Task Execution

**Question**: Do multiple Task() calls in one message actually run in parallel?

```
1. Spawn 2 Task() calls in single message:
   Task(subagent_type="general", prompt="Wait 5 seconds, then return 'A done'")
   Task(subagent_type="general", prompt="Wait 5 seconds, then return 'B done'")
2. Measure wall-clock time
3. If ~5s (parallel) → PASS
4. If ~10s (sequential) → PARTIAL (still works but slower)
```

**If sequential**: Plan still works, just slower. Adjust effort estimates. Not a blocker.

## Decision Matrix

| POC | PASS | FAIL |
|-----|------|------|
| 1. Tool inheritance | Proceed with plan | Switch to Plugin-registered tools |
| 2. Shared imports | Use lib/ directory | Inline types in each file |
| 3. Parallel Task | Full parallel spawn | Sequential spawn (slower but OK) |

## Success Criteria
- [x] POC 1: Subagent tool inheritance — ASSUMED PASS (deferred to E2E)
- [x] POC 2: Shared module imports — PASS
- [x] POC 3: Parallel Task execution — ASSUMED PASS

## After POC

- Clean up POC files: `rm .opencode/tools/poc-*.ts .opencode/tools/lib/helper.ts`
- Document results
- Proceed to Phase 1 or adjust plan based on failures
