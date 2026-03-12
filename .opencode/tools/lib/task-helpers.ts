import { join } from "node:path";
import type { Task, TaskStatus } from "./types";
import { teamDir, readJson, listJsonFiles, writeJsonAtomic } from "./store";

export async function loadAllTasks(teamName: string): Promise<Task[]> {
  const dir = join(teamDir(teamName), "tasks");
  const files = await listJsonFiles(dir);
  const tasks: Task[] = [];
  for (const f of files) {
    tasks.push(await readJson<Task>(f));
  }
  return tasks;
}

export function hasCycle(
  newTaskId: string,
  blockedBy: string[],
  allTasks: Map<string, Task>
): boolean {
  const visited = new Set<string>();
  const queue = [...blockedBy];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === newTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const task = allTasks.get(current);
    if (task) queue.push(...task.blockedBy);
  }
  return false;
}

export const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  pending: ["in_progress"],
  in_progress: ["completed", "cancelled"],
  blocked: [],
  completed: [],
  cancelled: [],
};

export async function unblockDependents(
  teamName: string,
  completedTaskId: string
): Promise<string[]> {
  const unblocked: string[] = [];
  const allTasks = await loadAllTasks(teamName);

  for (const t of allTasks) {
    if (t.id === completedTaskId) continue;
    if (!t.blockedBy.includes(completedTaskId)) continue;

    t.blockedBy = t.blockedBy.filter((bid) => bid !== completedTaskId);
    if (t.blockedBy.length === 0 && t.status === "blocked") {
      t.status = "pending";
      unblocked.push(t.id);
    }
    t.updated = new Date().toISOString();
    await writeJsonAtomic(
      join(teamDir(teamName), "tasks", `${t.id}.json`),
      t
    );
  }

  return unblocked;
}
