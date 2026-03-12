import { tool } from "@opencode-ai/plugin";
import { join } from "node:path";
import { exists } from "node:fs/promises";
import type { Task, TaskStatus } from "./lib/types";
import { teamDir, ensureDir, writeJsonAtomic, readJson, nextId } from "./lib/store";
import {
  loadAllTasks,
  hasCycle,
  VALID_TRANSITIONS,
  unblockDependents,
} from "./lib/task-helpers";

export const task_create = tool({
  description:
    "Create a new task in a team. Auto-sets status to pending (no blockers) or blocked (has blockers). Returns created task.",
  args: {
    teamName: tool.schema.string().describe("Team name"),
    subject: tool.schema.string().describe("Task subject, <60 chars, imperative"),
    description: tool.schema.string().describe("Task description"),
    owner: tool.schema.string().optional().describe("Agent name to assign"),
    blockedBy: tool.schema
      .string()
      .optional()
      .describe('JSON array of task IDs this depends on, e.g. ["task-001"]'),
    fileScope: tool.schema
      .string()
      .optional()
      .describe('JSON array of glob patterns, e.g. ["src/auth/**"]'),
  },
  async execute(args) {
    const dir = teamDir(args.teamName);
    if (!(await exists(dir))) return `Error: Team "${args.teamName}" not found`;

    const tasksDir = join(dir, "tasks");
    await ensureDir(tasksDir);

    const id = await nextId(tasksDir, "task");
    let blockedBy: string[] = [];
    let fileScope: string[] = [];

    if (args.blockedBy) {
      try { blockedBy = JSON.parse(args.blockedBy); }
      catch { return "Error: Invalid blockedBy JSON"; }
    }
    if (args.fileScope) {
      try { fileScope = JSON.parse(args.fileScope); }
      catch { return "Error: Invalid fileScope JSON"; }
    }

    const allTasks = await loadAllTasks(args.teamName);
    const taskMap = new Map(allTasks.map((t) => [t.id, t]));

    for (const bid of blockedBy) {
      if (!taskMap.has(bid)) return `Error: Blocker task "${bid}" not found`;
    }

    if (blockedBy.length > 0 && hasCycle(id, blockedBy, taskMap)) {
      return `Error: Circular dependency detected for ${id}`;
    }

    const activeBlockers = blockedBy.filter((bid) => {
      const t = taskMap.get(bid);
      return t && t.status !== "completed" && t.status !== "cancelled";
    });

    const now = new Date().toISOString();
    const task: Task = {
      id,
      teamName: args.teamName,
      subject: args.subject,
      description: args.description,
      status: activeBlockers.length > 0 ? "blocked" : "pending",
      owner: args.owner ?? null,
      blockedBy: activeBlockers,
      fileScope,
      created: now,
      updated: now,
    };

    await writeJsonAtomic(join(tasksDir, `${id}.json`), task);
    return JSON.stringify(task, null, 2);
  },
});

export const task_update = tool({
  description:
    "Update task status/owner. On completion/cancellation, auto-unblocks dependent tasks. Returns updated task + list of unblocked task IDs.",
  args: {
    teamName: tool.schema.string().describe("Team name"),
    taskId: tool.schema.string().describe("Task ID (e.g. task-001)"),
    status: tool.schema
      .enum(["in_progress", "completed", "cancelled"])
      .optional()
      .describe("New status: in_progress, completed, cancelled"),
    owner: tool.schema.string().optional().describe("Agent name"),
  },
  async execute(args) {
    const taskFile = join(teamDir(args.teamName), "tasks", `${args.taskId}.json`);
    if (!(await exists(taskFile))) {
      return `Error: Task "${args.taskId}" not found in team "${args.teamName}"`;
    }

    const task = await readJson<Task>(taskFile);

    if (args.status) {
      const newStatus = args.status as TaskStatus;
      const allowed = VALID_TRANSITIONS[task.status];
      if (!allowed || !allowed.includes(newStatus)) {
        return `Error: Invalid transition ${task.status} → ${newStatus}`;
      }
      task.status = newStatus;
    }

    if (args.owner !== undefined) task.owner = args.owner;
    task.updated = new Date().toISOString();
    await writeJsonAtomic(taskFile, task);

    let unblocked: string[] = [];
    if (task.status === "completed" || task.status === "cancelled") {
      unblocked = await unblockDependents(args.teamName, task.id);
    }

    return JSON.stringify({ task, unblocked }, null, 2);
  },
});

export const task_get = tool({
  description: "Get a single task by ID.",
  args: {
    teamName: tool.schema.string().describe("Team name"),
    taskId: tool.schema.string().describe("Task ID (e.g. task-001)"),
  },
  async execute(args) {
    const taskFile = join(teamDir(args.teamName), "tasks", `${args.taskId}.json`);
    if (!(await exists(taskFile))) {
      return `Error: Task "${args.taskId}" not found in team "${args.teamName}"`;
    }
    return JSON.stringify(await readJson<Task>(taskFile), null, 2);
  },
});

export const task_list = tool({
  description: "List tasks in a team, optionally filtered by status and/or owner.",
  args: {
    teamName: tool.schema.string().describe("Team name"),
    status: tool.schema
      .string()
      .optional()
      .describe("Filter by status: pending, blocked, in_progress, completed, cancelled"),
    owner: tool.schema.string().optional().describe("Filter by owner agent name"),
  },
  async execute(args) {
    const dir = teamDir(args.teamName);
    if (!(await exists(dir))) return `Error: Team "${args.teamName}" not found`;

    let tasks = await loadAllTasks(args.teamName);
    if (args.status) tasks = tasks.filter((t) => t.status === args.status);
    if (args.owner) tasks = tasks.filter((t) => t.owner === args.owner);
    tasks.sort((a, b) => a.id.localeCompare(b.id));
    return tasks.length > 0 ? JSON.stringify(tasks, null, 2) : "No tasks found";
  },
});
