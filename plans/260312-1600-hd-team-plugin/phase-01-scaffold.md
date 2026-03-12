# Phase 1: Scaffold + Shared Library

## Overview
- **Priority**: P1 | **Effort**: 1h

Create `.opencode/` directory, install deps, build shared types and file I/O helpers.

## Implementation

### 1. `.opencode/package.json`
```json
{ "dependencies": { "@opencode-ai/plugin": "latest" } }
```

### 2. `.opencode/tools/lib/types.ts`

```typescript
export type TaskStatus = "pending" | "blocked" | "in_progress" | "completed" | "cancelled";

export interface Task {
  id: string;                // "task-001"
  teamName: string;
  subject: string;           // <60 chars, imperative
  description: string;
  status: TaskStatus;
  owner: string | null;      // agent name
  blockedBy: string[];       // task IDs — empty = pending, non-empty = blocked
  fileScope: string[];       // glob patterns for file ownership
  created: string;           // ISO
  updated: string;           // ISO
}

export interface TeamConfig {
  team_name: string;
  template: string;          // "research" | "cook" | "review" | "debug" | custom
  created: string;
  agents: Array<{ name: string; role: string; status: string }>;
}

export interface Message {
  id: string;                // "msg-001"
  teamName: string;
  from: string;
  to: string;                // agent name or "all"
  type: "message" | "broadcast" | "finding" | "blocker" | "complete";
  content: string;
  created: string;
}
```

### 3. `.opencode/tools/lib/store.ts`

```typescript
// Atomic JSON write: Bun.write to .tmp then rename
export async function writeJsonAtomic(path: string, data: unknown): Promise<void>
// Read + parse JSON with error handling
export async function readJson<T>(path: string): Promise<T>
// List all .json files in directory
export async function listJsonFiles(dir: string): Promise<string[]>
// Path helpers
export function teamDir(teamName: string): string      // ".team/{teamName}"
export function taskPath(teamName: string, id: string): string
export function messagePath(teamName: string, id: string): string
// Auto-increment ID: read existing files, find max, return next
export async function nextId(dir: string, prefix: string): Promise<string>
```

### 4. Run `bun install` in `.opencode/`

## Success Criteria
- [x] `bun install` succeeds
- [x] types.ts compiles without errors
- [x] store.ts helpers work (test with simple read/write)
