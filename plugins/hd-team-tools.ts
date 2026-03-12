/**
 * HD-Team Tools Plugin for OpenCode
 * Lead-only orchestration: compound tools (team_spawn, team_complete)
 * + backward-compatible individual tools (team_*, task_*, message_*)
 *
 * Hooks:
 * - session.compacting: Injects active team state into compaction context
 */
import { type Plugin, tool } from "@opencode-ai/plugin";
import { readdir, mkdir, rm, rename } from "node:fs/promises";
import { join } from "node:path";

// ============================================================================
// Types
// ============================================================================

type TaskStatus = "pending" | "blocked" | "in_progress" | "completed" | "cancelled";

interface Task {
  id: string;
  teamName: string;
  subject: string;
  description: string;
  status: TaskStatus;
  owner: string | null;
  blockedBy: string[];
  fileScope: string[];
  created: string;
  updated: string;
}

interface TeamConfig {
  team_name: string;
  template: string;
  created: string;
  agents: Array<{ name: string; role: string; status: string }>;
}

interface Message {
  id: string;
  teamName: string;
  from: string;
  to: string;
  type: "message" | "broadcast" | "finding" | "blocker" | "complete";
  content: string;
  created: string;
}

// ============================================================================
// Helpers
// ============================================================================

const TEAM_ROOT = ".team";
const SAFE_ID = /^[a-z0-9-]+$/;

function validateId(id: string, label: string): void {
  if (!SAFE_ID.test(id)) {
    throw new Error(`Invalid ${label}: "${id}" (must be lowercase alphanumeric + hyphens)`);
  }
}

function teamDir(base: string, teamName: string): string {
  validateId(teamName, "teamName");
  return join(base, TEAM_ROOT, teamName);
}

async function exists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  const tmp = path + ".tmp";
  await Bun.write(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, path);
}

async function readJson<T>(path: string): Promise<T> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${path}`);
  }
  return file.json() as Promise<T>;
}

async function listJsonFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir);
  return entries.filter((e) => e.endsWith(".json")).map((e) => join(dir, e));
}

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${ts}-${rand}`;
}

function taskPath(base: string, teamName: string, taskId: string): string {
  validateId(taskId, "taskId");
  return join(teamDir(base, teamName), "tasks", `${taskId}.json`);
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function loadAllTasks(base: string, teamName: string): Promise<Task[]> {
  const dir = join(teamDir(base, teamName), "tasks");
  const files = await listJsonFiles(dir);
  const tasks: Task[] = [];
  for (const f of files) {
    tasks.push(await readJson<Task>(f));
  }
  return tasks;
}

function hasCycle(newTaskId: string, blockedBy: string[], allTasks: Map<string, Task>): boolean {
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

const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  pending: ["in_progress", "cancelled"],
  blocked: ["cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

async function unblockDependents(base: string, teamName: string, completedTaskId: string): Promise<string[]> {
  const unblocked: string[] = [];
  const allTasks = await loadAllTasks(base, teamName);

  for (const t of allTasks) {
    if (t.id === completedTaskId) continue;
    if (!t.blockedBy.includes(completedTaskId)) continue;

    t.blockedBy = t.blockedBy.filter((bid) => bid !== completedTaskId);
    if (t.blockedBy.length === 0 && t.status === "blocked") {
      t.status = "pending";
      unblocked.push(t.id);
    }
    t.updated = new Date().toISOString();
    await writeJsonAtomic(join(teamDir(base, teamName), "tasks", `${t.id}.json`), t);
  }

  return unblocked;
}

async function getActiveTeamsSummary(base: string): Promise<string | null> {
  const root = join(base, TEAM_ROOT);
  if (!(await exists(root))) return null;

  const entries = await readdir(root, { withFileTypes: true });
  const summaries: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = join(root, entry.name, "config.json");
    if (!(await exists(configPath))) continue;

    try {
      const config = await readJson<TeamConfig>(configPath);
      const tasks = await loadAllTasks(base, entry.name);

      const pending = tasks.filter((t) => t.status === "pending").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const completed = tasks.filter((t) => t.status === "completed").length;

      if (pending > 0 || inProgress > 0) {
        summaries.push(`- Team "${config.team_name}" (${config.template}): ${inProgress} in_progress, ${pending} pending, ${completed} completed`);
      }
    } catch {
      // Skip teams with corrupted/deleted data
    }
  }

  return summaries.length > 0 ? summaries.join("\n") : null;
}

// ============================================================================
// Plugin Export
// ============================================================================

export const HDTeamToolsPlugin: Plugin = async ({ directory }) => {
  const base = directory;

  return {
    // ========================================================================
    // Hooks
    // ========================================================================

    "experimental.session.compacting": async (input, output) => {
      const teamSummary = await getActiveTeamsSummary(base);
      if (teamSummary) {
        output.context.push(`
## Active Agent Teams

The following teams are currently active with pending work:

${teamSummary}

Use team_status(teamName) to get full details. Continue any in-progress tasks.
`);
      }
    },

    // ========================================================================
    // Custom Tools
    // ========================================================================
    tool: {
      // ==== Compound Tools (Lead-Only) ====

      team_spawn: tool({
        description: "Create team + all tasks in one call. Sets non-blocked tasks to in_progress. Returns team config and created tasks.",
        args: {
          teamName: tool.schema.string().regex(/^[a-z0-9-]+$/).describe("Team name in kebab-case"),
          template: tool.schema.string().describe("Template type: research, cook, review, debug, or custom"),
          tasks: tool.schema.string().describe('JSON array: [{"subject":"...","description":"...","owner":"agent-1","role":"researcher","blockedBy":["task-id"],"fileScope":["glob"]}]'),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (await exists(join(dir, "config.json"))) {
            return `Error: Team "${args.teamName}" already exists`;
          }

          let taskDefs: Array<{
            subject: string;
            description: string;
            owner?: string;
            role?: string;
            blockedBy?: string[];
            fileScope?: string[];
          }>;
          try {
            taskDefs = JSON.parse(args.tasks);
          } catch {
            return "Error: Invalid tasks JSON";
          }

          if (!Array.isArray(taskDefs) || taskDefs.length === 0) {
            return "Error: tasks must be a non-empty array";
          }

          // Create directories
          await ensureDir(join(dir, "tasks"));
          await ensureDir(join(dir, "messages"));
          await ensureDir(join(dir, "reports"));

          // Derive agents from tasks
          const agents = taskDefs
            .filter((t) => t.owner)
            .map((t) => ({ name: t.owner!, role: t.role || "worker", status: "active" }));
          const uniqueAgents = Array.from(new Map(agents.map((a) => [a.name, a])).values());

          const config: TeamConfig = {
            team_name: args.teamName,
            template: args.template,
            created: new Date().toISOString(),
            agents: uniqueAgents,
          };
          await writeJsonAtomic(join(dir, "config.json"), config);

          // Create tasks with generated IDs
          const createdTasks: Task[] = [];
          const idMap = new Map<number, string>(); // index → generated ID

          // First pass: generate IDs
          for (let i = 0; i < taskDefs.length; i++) {
            idMap.set(i, generateId("task"));
          }

          // Second pass: resolve blockedBy references and create tasks
          const now = new Date().toISOString();
          try {
            for (let i = 0; i < taskDefs.length; i++) {
            const def = taskDefs[i];
            const id = idMap.get(i)!;

            // Resolve blockedBy — pure integer strings ("0","1") are index refs, others are literal IDs
            let blockedBy: string[] = [];
            if (def.blockedBy && def.blockedBy.length > 0) {
              blockedBy = def.blockedBy.map((ref) => {
                if (/^\d+$/.test(ref)) {
                  const idx = parseInt(ref, 10);
                  if (idMap.has(idx)) return idMap.get(idx)!;
                  throw new Error(`Invalid blockedBy index "${ref}" — out of range (0-${taskDefs.length - 1})`);
                }
                return ref; // already an ID string
              });
            }

            // Determine status based on active blockers
            const activeBlockers = blockedBy.filter((bid) => {
              const task = createdTasks.find((t) => t.id === bid);
              return !task || (task.status !== "completed" && task.status !== "cancelled");
            });

            const task: Task = {
              id,
              teamName: args.teamName,
              subject: def.subject,
              description: def.description,
              status: activeBlockers.length > 0 ? "blocked" : (def.owner ? "in_progress" : "pending"),
              owner: def.owner ?? null,
              blockedBy: activeBlockers,
              fileScope: def.fileScope ?? [],
              created: now,
              updated: now,
            };

            await writeJsonAtomic(join(dir, "tasks", `${id}.json`), task);
            createdTasks.push(task);
          }
          } catch (e) {
            await rm(dir, { recursive: true, force: true });
            return `Error: ${e instanceof Error ? e.message : String(e)}`;
          }

          // Cycle detection
          const taskMap = new Map(createdTasks.map((t) => [t.id, t]));
          for (const task of createdTasks) {
            if (task.blockedBy.length > 0 && hasCycle(task.id, task.blockedBy, taskMap)) {
              await rm(dir, { recursive: true, force: true });
              return `Error: Circular dependency detected involving task "${task.subject}"`;
            }
          }

          return JSON.stringify({ team: config, tasks: createdTasks }, null, 2);
        },
      }),

      team_complete: tool({
        description: "Bulk-complete tasks and write reports. Auto-unblocks dependents. Returns updated tasks and completion status.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          results: tool.schema.string().describe('JSON array: [{"taskId":"...","status":"completed","summary":"...","report":"optional full report"}]'),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          let results: Array<{
            taskId: string;
            status?: "completed" | "cancelled";
            summary: string;
            report?: string;
          }>;
          try {
            results = JSON.parse(args.results);
          } catch {
            return "Error: Invalid results JSON";
          }

          if (!Array.isArray(results) || results.length === 0) {
            return "Error: results must be a non-empty array";
          }

          const updated: Task[] = [];
          const allUnblocked: string[] = [];
          const errors: string[] = [];

          for (const r of results) {
            try {
              validateId(r.taskId, "taskId");
            } catch {
              errors.push(`Invalid taskId: "${r.taskId}"`);
              continue;
            }

            const taskFile = taskPath(context.directory, args.teamName, r.taskId);
            if (!(await exists(taskFile))) {
              errors.push(`Task "${r.taskId}" not found`);
              continue;
            }

            const task = await readJson<Task>(taskFile);
            const newStatus = r.status || "completed";

            // Validate transition
            const allowed = VALID_TRANSITIONS[task.status];
            if (allowed && !allowed.includes(newStatus)) {
              errors.push(`Invalid transition for ${r.taskId}: ${task.status} → ${newStatus}`);
              continue;
            }

            task.status = newStatus;
            task.updated = new Date().toISOString();
            await writeJsonAtomic(taskFile, task);
            updated.push(task);

            // Write report if provided (use owner-taskId to avoid collisions)
            if (r.report || r.summary) {
              const reportContent = r.report || `# ${task.subject}\n\n${r.summary}`;
              const reportName = `${task.owner || "unknown"}-${task.id}`;
              const reportPath = join(dir, "reports", `${reportName}-report.md`);
              const tmp = reportPath + ".tmp";
              await Bun.write(tmp, reportContent);
              await rename(tmp, reportPath);
            }

            // Unblock dependents
            if (newStatus === "completed" || newStatus === "cancelled") {
              const unblocked = await unblockDependents(context.directory, args.teamName, task.id);
              allUnblocked.push(...unblocked);
            }
          }

          // Check completion
          const allTasks = await loadAllTasks(context.directory, args.teamName);
          const isComplete = allTasks.length > 0 && allTasks.every(
            (t) => t.status === "completed" || t.status === "cancelled"
          );

          return JSON.stringify({ updated, unblocked: allUnblocked, errors, isComplete }, null, 2);
        },
      }),

      // ==== Backward-Compatible Tools ====

      team_create: tool({
        description: "Create a new agent team with directory structure and config. Returns the team config.",
        args: {
          teamName: tool.schema.string().regex(/^[a-z0-9-]+$/).describe("Team name in kebab-case"),
          template: tool.schema.string().describe("Template type: research, cook, review, debug, or custom"),
          agents: tool.schema.string().describe('JSON array of agents: [{"name":"dev-1","role":"developer"}]'),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (await exists(join(dir, "config.json"))) {
            return `Error: Team "${args.teamName}" already exists`;
          }

          await ensureDir(join(dir, "tasks"));
          await ensureDir(join(dir, "messages"));
          await ensureDir(join(dir, "reports"));

          let agents: Array<{ name: string; role: string }>;
          try {
            agents = JSON.parse(args.agents);
          } catch {
            return "Error: Invalid agents JSON";
          }

          if (!Array.isArray(agents) || !agents.every((a) => typeof a.name === "string" && typeof a.role === "string")) {
            return 'Error: agents must be [{name: string, role: string}, ...]';
          }

          const config: TeamConfig = {
            team_name: args.teamName,
            template: args.template,
            created: new Date().toISOString(),
            agents: agents.map((a) => ({ ...a, status: "idle" })),
          };

          await writeJsonAtomic(join(dir, "config.json"), config);
          return JSON.stringify(config, null, 2);
        },
      }),

      team_status: tool({
        description: "Get team status: config, task summary by status, message count, reports, completion flag.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const config = await readJson<TeamConfig>(join(dir, "config.json"));
          const taskFiles = await listJsonFiles(join(dir, "tasks"));
          const msgFiles = await listJsonFiles(join(dir, "messages"));

          const reportDir = join(dir, "reports");
          const reports = (await exists(reportDir))
            ? (await readdir(reportDir)).filter((f) => !f.startsWith("."))
            : [];

          const summary = { pending: 0, blocked: 0, in_progress: 0, completed: 0, cancelled: 0 };
          for (const f of taskFiles) {
            const task = await readJson<Task>(f);
            if (task.status in summary) {
              summary[task.status as keyof typeof summary]++;
            }
          }

          const total = Object.values(summary).reduce((a, b) => a + b, 0);
          const isComplete = total > 0 && summary.pending === 0 && summary.blocked === 0 && summary.in_progress === 0;

          return JSON.stringify({ config, taskSummary: summary, messageCount: msgFiles.length, reports, isComplete }, null, 2);
        },
      }),

      team_list: tool({
        description: "List all active teams with basic info.",
        args: {},
        async execute(args, context) {
          const root = join(context.directory, TEAM_ROOT);
          if (!(await exists(root))) return "No teams found";

          const entries = await readdir(root, { withFileTypes: true });
          const teams = [];

          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const configPath = join(root, entry.name, "config.json");
            if (!(await exists(configPath))) continue;

            const config = await readJson<TeamConfig>(configPath);
            const taskFiles = await listJsonFiles(join(root, entry.name, "tasks"));

            let allDone = taskFiles.length > 0;
            for (const f of taskFiles) {
              const task = await readJson<Task>(f);
              if (task.status !== "completed" && task.status !== "cancelled") {
                allDone = false;
                break;
              }
            }

            teams.push({
              teamName: config.team_name,
              template: config.template,
              created: config.created,
              agentCount: config.agents.length,
              isComplete: taskFiles.length > 0 && allDone,
            });
          }

          return teams.length > 0 ? JSON.stringify(teams, null, 2) : "No teams found";
        },
      }),

      team_delete: tool({
        description: "Delete a team and all its data (tasks, messages, reports).",
        args: {
          teamName: tool.schema.string().describe("Team name to delete"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }
          await rm(dir, { recursive: true, force: true });
          return `Team "${args.teamName}" deleted successfully`;
        },
      }),

      // ==== Task Tools ====

      task_create: tool({
        description: "Create a new task in a team. Auto-sets status to pending (no blockers) or blocked (has blockers). Returns created task.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          subject: tool.schema.string().describe("Task subject, <60 chars, imperative"),
          description: tool.schema.string().describe("Task description"),
          owner: tool.schema.string().optional().describe("Agent name to assign"),
          blockedBy: tool.schema.string().optional().describe('JSON array of task IDs this depends on, e.g. ["task-001"]'),
          fileScope: tool.schema.string().optional().describe('JSON array of glob patterns, e.g. ["src/auth/**"]'),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) return `Error: Team "${args.teamName}" not found`;

          const tasksDir = join(dir, "tasks");
          await ensureDir(tasksDir);

          const id = generateId("task");
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

          const allTasks = await loadAllTasks(context.directory, args.teamName);
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
      }),

      task_update: tool({
        description: "Update task status/owner. On completion/cancellation, auto-unblocks dependent tasks. Returns updated task + list of unblocked task IDs.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          taskId: tool.schema.string().describe("Task ID"),
          status: tool.schema.enum(["in_progress", "completed", "cancelled"]).optional().describe("New status"),
          owner: tool.schema.string().optional().describe("Agent name"),
        },
        async execute(args, context) {
          const taskFile = taskPath(context.directory, args.teamName, args.taskId);
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
            if (newStatus === "in_progress" && task.status === "blocked" && task.blockedBy.length > 0) {
              return `Error: Cannot start task with unresolved blockers: ${task.blockedBy.join(", ")}`;
            }
            task.status = newStatus;
          }

          if (args.owner !== undefined) task.owner = args.owner;
          task.updated = new Date().toISOString();
          await writeJsonAtomic(taskFile, task);

          let unblocked: string[] = [];
          if (task.status === "completed" || task.status === "cancelled") {
            unblocked = await unblockDependents(context.directory, args.teamName, task.id);
          }

          return JSON.stringify({ task, unblocked }, null, 2);
        },
      }),

      task_get: tool({
        description: "Get a single task by ID.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          taskId: tool.schema.string().describe("Task ID"),
        },
        async execute(args, context) {
          const taskFile = taskPath(context.directory, args.teamName, args.taskId);
          if (!(await exists(taskFile))) {
            return `Error: Task "${args.taskId}" not found in team "${args.teamName}"`;
          }
          return JSON.stringify(await readJson<Task>(taskFile), null, 2);
        },
      }),

      task_list: tool({
        description: "List tasks in a team, optionally filtered by status and/or owner.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          status: tool.schema.string().optional().describe("Filter by status: pending, blocked, in_progress, completed, cancelled"),
          owner: tool.schema.string().optional().describe("Filter by owner agent name"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) return `Error: Team "${args.teamName}" not found`;

          let tasks = await loadAllTasks(context.directory, args.teamName);
          if (args.status) tasks = tasks.filter((t) => t.status === args.status);
          if (args.owner) tasks = tasks.filter((t) => t.owner === args.owner);
          tasks.sort((a, b) => a.id.localeCompare(b.id));
          return tasks.length > 0 ? JSON.stringify(tasks, null, 2) : "No tasks found";
        },
      }),

      // ==== Message Tools ====

      message_send: tool({
        description: 'Send a message to an agent or broadcast to all. Types: message, broadcast, finding, blocker, complete.',
        args: {
          teamName: tool.schema.string().describe("Team name"),
          from: tool.schema.string().describe("Sender agent name"),
          to: tool.schema.string().describe('Recipient agent name or "all" for broadcast'),
          type: tool.schema.enum(["message", "broadcast", "finding", "blocker", "complete"]).describe("Message type"),
          content: tool.schema.string().describe("Message content"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const msgDir = join(dir, "messages");
          await ensureDir(msgDir);

          const id = generateId("msg");
          const msg: Message = {
            id,
            teamName: args.teamName,
            from: args.from,
            to: args.to,
            type: args.type,
            content: args.content,
            created: new Date().toISOString(),
          };

          await writeJsonAtomic(join(msgDir, `${id}.json`), msg);
          return JSON.stringify({ sent: true, id: msg.id }, null, 2);
        },
      }),

      message_fetch: tool({
        description: "Fetch messages for an agent. Returns broadcasts (to=all) plus DMs. Filter by type and since timestamp.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          to: tool.schema.string().optional().describe("Recipient filter — returns messages to this agent + broadcasts"),
          type: tool.schema.enum(["message", "broadcast", "finding", "blocker", "complete"]).optional().describe("Filter by type"),
          since: tool.schema.string().optional().describe("ISO timestamp — return only messages after this time"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const msgDir = join(dir, "messages");
          const files = await listJsonFiles(msgDir);
          let messages: Message[] = [];

          for (const f of files) {
            messages.push(await readJson<Message>(f));
          }

          if (args.to) {
            messages = messages.filter((m) => m.to === args.to || m.to === "all");
          }
          if (args.type) {
            messages = messages.filter((m) => m.type === args.type);
          }
          if (args.since) {
            const sinceDate = new Date(args.since);
            messages = messages.filter((m) => new Date(m.created) > sinceDate);
          }

          messages.sort((a, b) => a.created.localeCompare(b.created));
          return messages.length > 0 ? JSON.stringify(messages, null, 2) : "No messages found";
        },
      }),
    },
  };
};
