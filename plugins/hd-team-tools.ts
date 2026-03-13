/**
 * HD-Team Tools Plugin for OpenCode
 * Claude Code Agent Teams parity: per-agent inboxes, integer task IDs,
 * bidirectional dependency tracking (blocks[] + blockedBy[]), file locking.
 *
 * Hooks:
 * - session.compacting: Injects active team state into compaction context
 */
import { type Plugin, tool } from "@opencode-ai/plugin";
import { readdir, mkdir, rm, rename, unlink } from "node:fs/promises";
import { join } from "node:path";

// ============================================================================
// Types
// ============================================================================

type TaskStatus = "pending" | "in_progress" | "completed";

type MessageType =
  | "message"
  | "broadcast"
  | "shutdown_request"
  | "shutdown_response"
  | "plan_approval_response";

interface TeamConfig {
  name: string;
  description: string;
  createdAt: number;
  leadAgentId: string;
  members: TeamMember[];
}

interface TeamMember {
  agentId: string;
  name: string;
  agentType: string;
  model: string;
  prompt?: string;
  color?: string;
  planModeRequired: boolean;
  joinedAt: number;
  cwd: string;
  isActive: boolean;
  taskSessionId?: string;
}

interface Task {
  id: string;
  subject: string;
  description: string;
  activeForm?: string;
  status: TaskStatus;
  blocks: string[];
  blockedBy: string[];
  owner?: string;
  metadata?: Record<string, unknown>;
}

interface InboxMessage {
  from: string;
  text: string;
  summary?: string;
  timestamp: string;
  color?: string;
  read: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const TEAM_ROOT = ".team";
const SAFE_NAME = /^[a-z0-9-]+$/;

const LOCK_TIMEOUT_MS = 10_000;
const LOCK_RETRY_MS = 50;
const LOCK_MAX_RETRIES = 100;

function validateName(name: string, label: string): void {
  if (!SAFE_NAME.test(name)) {
    throw new Error(`Invalid ${label}: "${name}" (must be lowercase alphanumeric + hyphens)`);
  }
}

function teamDir(base: string, teamName: string): string {
  validateName(teamName, "teamName");
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
  return entries
    .filter((e) => e.endsWith(".json"))
    .map((e) => join(dir, e));
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

// ---- File Locking ----

async function withLock<T>(lockPath: string, fn: () => Promise<T>): Promise<T> {
  let acquired = false;
  for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
    if (await exists(lockPath)) {
      const content = await Bun.file(lockPath).text().catch(() => "0");
      const lockTime = parseInt(content, 10) || 0;
      if (Date.now() - lockTime > LOCK_TIMEOUT_MS) {
        // Stale lock — overwrite
        await Bun.write(lockPath, Date.now().toString());
        acquired = true;
        break;
      }
      await Bun.sleep(LOCK_RETRY_MS);
    } else {
      await Bun.write(lockPath, Date.now().toString());
      acquired = true;
      break;
    }
  }

  if (!acquired) {
    throw new Error(`Failed to acquire lock: ${lockPath} (timed out after ${LOCK_MAX_RETRIES * LOCK_RETRY_MS}ms)`);
  }

  try {
    return await fn();
  } finally {
    await unlink(lockPath).catch(() => {});
  }
}

// ---- Task ID Generation ----

async function nextTaskId(tasksDir: string): Promise<string> {
  const counterPath = join(tasksDir, ".counter");
  let counter = 0;
  if (await exists(counterPath)) {
    const content = await Bun.file(counterPath).text();
    counter = parseInt(content, 10) || 0;
  }
  counter++;
  await Bun.write(counterPath, counter.toString());
  return counter.toString();
}

// ---- Inbox Helpers ----

async function readInbox(inboxPath: string): Promise<InboxMessage[]> {
  if (!(await exists(inboxPath))) return [];
  return readJson<InboxMessage[]>(inboxPath);
}

async function appendToInbox(inboxPath: string, message: InboxMessage): Promise<void> {
  const messages = await readInbox(inboxPath);
  messages.push(message);
  await writeJsonAtomic(inboxPath, messages);
}

// ---- Task Loading ----

async function loadAllTasks(base: string, teamName: string): Promise<Task[]> {
  const dir = join(teamDir(base, teamName), "tasks");
  const files = await listJsonFiles(dir);
  const tasks: Task[] = [];
  for (const f of files) {
    tasks.push(await readJson<Task>(f));
  }
  return tasks;
}

function taskFilePath(base: string, teamName: string, taskId: string): string {
  return join(teamDir(base, teamName), "tasks", `${taskId}.json`);
}

// ---- Dependency Helpers ----

function hasCycle(taskId: string, blockedBy: string[], allTasks: Map<string, Task>): boolean {
  const visited = new Set<string>();
  const queue = [...blockedBy];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const task = allTasks.get(current);
    if (task) queue.push(...task.blockedBy);
  }
  return false;
}

async function unblockDependents(
  base: string,
  teamName: string,
  completedTaskId: string,
): Promise<string[]> {
  const unblocked: string[] = [];
  const allTasks = await loadAllTasks(base, teamName);

  for (const t of allTasks) {
    if (t.id === completedTaskId) continue;
    if (!t.blockedBy.includes(completedTaskId)) continue;

    t.blockedBy = t.blockedBy.filter((bid) => bid !== completedTaskId);
    if (t.blockedBy.length === 0 && t.status === "pending") {
      unblocked.push(t.id);
    }
    await writeJsonAtomic(taskFilePath(base, teamName, t.id), t);
  }

  return unblocked;
}

// ---- Team Summary ----

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
      const members = config.members.filter((m) => m.isActive).length;

      if (pending > 0 || inProgress > 0) {
        summaries.push(
          `- Team "${config.name}" (${config.description}): ${members} active members, ${inProgress} in_progress, ${pending} pending, ${completed} completed`,
        );
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

    "experimental.session.compacting": async (_input, output) => {
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
      // ==== Team Tools ====

      team_create: tool({
        description:
          "Create a new agent team with directory structure and CC-aligned config. Lead is automatically added as first member. Returns the team config.",
        args: {
          teamName: tool.schema
            .string()
            .regex(/^[a-z0-9-]+$/)
            .describe("Team name in kebab-case"),
          description: tool.schema.string().describe("Team description"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (await exists(join(dir, "config.json"))) {
            return `Error: Team "${args.teamName}" already exists`;
          }

          await ensureDir(join(dir, "tasks"));
          await ensureDir(join(dir, "inboxes"));
          await ensureDir(join(dir, "reports"));

          const now = Date.now();
          const leadId = `team-lead@${args.teamName}`;

          const config: TeamConfig = {
            name: args.teamName,
            description: args.description,
            createdAt: now,
            leadAgentId: leadId,
            members: [
              {
                agentId: leadId,
                name: "team-lead",
                agentType: "team-lead",
                model: "unknown",
                planModeRequired: false,
                joinedAt: now,
                cwd: context.directory,
                isActive: true,
              },
            ],
          };

          await writeJsonAtomic(join(dir, "config.json"), config);

          // Create lead inbox
          await writeJsonAtomic(join(dir, "inboxes", "team-lead.json"), []);

          return JSON.stringify(config, null, 2);
        },
      }),

      team_delete: tool({
        description: "Delete a team and all its data (tasks, inboxes, reports).",
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
        description:
          "Create a task with auto-increment integer ID. Supports optional dependencies (addBlocks/addBlockedBy) at creation. If blockedBy tasks are not completed, status stays pending. Returns created task.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          subject: tool.schema.string().describe("Task subject, <60 chars, imperative"),
          description: tool.schema.string().describe("Task description"),
          activeForm: tool.schema.string().optional().describe("Spinner text when in_progress"),
          addBlocks: tool.schema
            .string()
            .optional()
            .describe('JSON array of task IDs this task blocks, e.g. ["3","4"]'),
          addBlockedBy: tool.schema
            .string()
            .optional()
            .describe('JSON array of task IDs that block this task, e.g. ["1"]'),
          metadata: tool.schema.string().optional().describe("JSON object of arbitrary metadata"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const tasksDir = join(dir, "tasks");
          await ensureDir(tasksDir);
          const tasksLockPath = join(tasksDir, ".lock");

          return withLock(tasksLockPath, async () => {
            const id = await nextTaskId(tasksDir);

            let addBlocks: string[] = [];
            let addBlockedBy: string[] = [];
            let metadata: Record<string, unknown> | undefined;

            if (args.addBlocks) {
              try {
                addBlocks = JSON.parse(args.addBlocks);
              } catch {
                return "Error: Invalid addBlocks JSON";
              }
            }
            if (args.addBlockedBy) {
              try {
                addBlockedBy = JSON.parse(args.addBlockedBy);
              } catch {
                return "Error: Invalid addBlockedBy JSON";
              }
            }
            if (args.metadata) {
              try {
                metadata = JSON.parse(args.metadata);
              } catch {
                return "Error: Invalid metadata JSON";
              }
            }

            const allTasks = await loadAllTasks(context.directory, args.teamName);
            const taskMap = new Map(allTasks.map((t) => [t.id, t]));

            // Validate referenced tasks exist
            for (const bid of addBlockedBy) {
              if (!taskMap.has(bid)) return `Error: Blocker task "${bid}" not found`;
            }
            for (const bid of addBlocks) {
              if (!taskMap.has(bid)) return `Error: Blocked task "${bid}" not found`;
            }

            // Cycle detection
            if (addBlockedBy.length > 0 && hasCycle(id, addBlockedBy, taskMap)) {
              return `Error: Circular dependency detected for task ${id}`;
            }

            // Determine if any blockers are still active
            const hasActiveBlockers = addBlockedBy.some((bid) => {
              const t = taskMap.get(bid);
              return t && t.status !== "completed";
            });

            const task: Task = {
              id,
              subject: args.subject,
              description: args.description,
              ...(args.activeForm && { activeForm: args.activeForm }),
              status: "pending",
              blocks: addBlocks,
              blockedBy: addBlockedBy,
              ...(metadata && { metadata }),
            };

            await writeJsonAtomic(join(tasksDir, `${id}.json`), task);

            // Sync bidirectional deps: add this task's ID to target tasks
            // addBlockedBy: this task is blocked by targets → targets' blocks[] should include this task
            for (const targetId of addBlockedBy) {
              const targetPath = taskFilePath(context.directory, args.teamName, targetId);
              const target = await readJson<Task>(targetPath);
              if (!target.blocks.includes(id)) {
                target.blocks.push(id);
                await writeJsonAtomic(targetPath, target);
              }
            }

            // addBlocks: this task blocks targets → targets' blockedBy[] should include this task
            for (const targetId of addBlocks) {
              const targetPath = taskFilePath(context.directory, args.teamName, targetId);
              const target = await readJson<Task>(targetPath);
              if (!target.blockedBy.includes(id)) {
                target.blockedBy.push(id);
                await writeJsonAtomic(targetPath, target);
              }
            }

            return JSON.stringify(task, null, 2);
          });
        },
      }),

      task_update: tool({
        description:
          "Update task fields, manage dependencies, auto-unblock. Status transitions: pending→in_progress, pending→completed, in_progress→completed. On completion: auto-unblocks dependents. Returns {task, unblocked[]}.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          taskId: tool.schema.string().describe("Task ID (integer string)"),
          status: tool.schema
            .enum(["pending", "in_progress", "completed"])
            .optional()
            .describe("New status"),
          subject: tool.schema.string().optional().describe("New subject"),
          description: tool.schema.string().optional().describe("New description"),
          activeForm: tool.schema.string().optional().describe("Spinner text when in_progress"),
          owner: tool.schema.string().optional().describe("Agent name claiming this task"),
          addBlocks: tool.schema
            .string()
            .optional()
            .describe('JSON array of task IDs to add to blocks[]'),
          addBlockedBy: tool.schema
            .string()
            .optional()
            .describe('JSON array of task IDs to add to blockedBy[]'),
          metadata: tool.schema
            .string()
            .optional()
            .describe("JSON object to merge into metadata"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const tasksDir = join(dir, "tasks");
          const tasksLockPath = join(tasksDir, ".lock");

          return withLock(tasksLockPath, async () => {
            const tPath = taskFilePath(context.directory, args.teamName, args.taskId);
            if (!(await exists(tPath))) {
              return `Error: Task "${args.taskId}" not found in team "${args.teamName}"`;
            }

            const task = await readJson<Task>(tPath);

            // Status transition validation
            if (args.status) {
              const validTransitions: Record<string, TaskStatus[]> = {
                pending: ["in_progress", "completed"],
                in_progress: ["completed"],
                completed: [],
              };
              const allowed = validTransitions[task.status];
              if (!allowed || !allowed.includes(args.status as TaskStatus)) {
                return `Error: Invalid transition ${task.status} → ${args.status}`;
              }

              // Cannot start if still blocked
              if (
                args.status === "in_progress" &&
                task.blockedBy.length > 0
              ) {
                // Check if blockers are actually still active
                const activeBlockers: string[] = [];
                for (const bid of task.blockedBy) {
                  const blockerPath = taskFilePath(context.directory, args.teamName, bid);
                  if (await exists(blockerPath)) {
                    const blocker = await readJson<Task>(blockerPath);
                    if (blocker.status !== "completed") {
                      activeBlockers.push(bid);
                    }
                  }
                }
                if (activeBlockers.length > 0) {
                  return `Error: Cannot start task with unresolved blockers: ${activeBlockers.join(", ")}`;
                }
              }

              task.status = args.status as TaskStatus;
            }

            if (args.subject !== undefined) task.subject = args.subject;
            if (args.description !== undefined) task.description = args.description;
            if (args.activeForm !== undefined) task.activeForm = args.activeForm;
            if (args.owner !== undefined) task.owner = args.owner;

            // Merge metadata
            if (args.metadata) {
              let newMeta: Record<string, unknown>;
              try {
                newMeta = JSON.parse(args.metadata);
              } catch {
                return "Error: Invalid metadata JSON";
              }
              task.metadata = { ...task.metadata, ...newMeta };
            }

            // Handle addBlocks
            if (args.addBlocks) {
              let newBlocks: string[];
              try {
                newBlocks = JSON.parse(args.addBlocks);
              } catch {
                return "Error: Invalid addBlocks JSON";
              }
              for (const targetId of newBlocks) {
                if (!task.blocks.includes(targetId)) {
                  task.blocks.push(targetId);
                }
                // Sync: add this task to target's blockedBy
                const targetPath = taskFilePath(context.directory, args.teamName, targetId);
                if (await exists(targetPath)) {
                  const target = await readJson<Task>(targetPath);
                  if (!target.blockedBy.includes(task.id)) {
                    target.blockedBy.push(task.id);
                    await writeJsonAtomic(targetPath, target);
                  }
                }
              }
            }

            // Handle addBlockedBy
            if (args.addBlockedBy) {
              let newBlockedBy: string[];
              try {
                newBlockedBy = JSON.parse(args.addBlockedBy);
              } catch {
                return "Error: Invalid addBlockedBy JSON";
              }
              for (const targetId of newBlockedBy) {
                if (!task.blockedBy.includes(targetId)) {
                  task.blockedBy.push(targetId);
                }
                // Sync: add this task to target's blocks
                const targetPath = taskFilePath(context.directory, args.teamName, targetId);
                if (await exists(targetPath)) {
                  const target = await readJson<Task>(targetPath);
                  if (!target.blocks.includes(task.id)) {
                    target.blocks.push(task.id);
                    await writeJsonAtomic(targetPath, target);
                  }
                }
              }
            }

            await writeJsonAtomic(tPath, task);

            // Auto-unblock on completion
            let unblocked: string[] = [];
            if (task.status === "completed") {
              unblocked = await unblockDependents(context.directory, args.teamName, task.id);
            }

            return JSON.stringify({ task, unblocked }, null, 2);
          });
        },
      }),

      task_get: tool({
        description: "Get a single task by ID.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          taskId: tool.schema.string().describe("Task ID (integer string)"),
        },
        async execute(args, context) {
          const tPath = taskFilePath(context.directory, args.teamName, args.taskId);
          if (!(await exists(tPath))) {
            return `Error: Task "${args.taskId}" not found in team "${args.teamName}"`;
          }
          return JSON.stringify(await readJson<Task>(tPath), null, 2);
        },
      }),

      task_list: tool({
        description: "List all tasks in a team with full details, sorted by integer ID.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const tasks = await loadAllTasks(context.directory, args.teamName);
          tasks.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
          return tasks.length > 0 ? JSON.stringify(tasks, null, 2) : "No tasks found";
        },
      }),

      // ==== Message Tools ====

      message_send: tool({
        description:
          "Send a message to a recipient's inbox or broadcast to all agents. Types: message, broadcast, shutdown_request, shutdown_response, plan_approval_response. Returns {sent: true, recipients: [...]}.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          type: tool.schema
            .enum([
              "message",
              "broadcast",
              "shutdown_request",
              "shutdown_response",
              "plan_approval_response",
            ])
            .describe("Message type"),
          recipient: tool.schema
            .string()
            .optional()
            .describe("Recipient agent name (required for non-broadcast types)"),
          content: tool.schema.string().describe("Message content (markdown)"),
          summary: tool.schema.string().optional().describe("5-10 word preview"),
          from: tool.schema.string().optional().describe("Sender name (defaults to team-lead)"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          const configPath = join(dir, "config.json");
          if (!(await exists(configPath))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const sender = args.from || "team-lead";
          const inboxesDir = join(dir, "inboxes");
          await ensureDir(inboxesDir);
          const inboxesLockPath = join(inboxesDir, ".lock");

          const message: InboxMessage = {
            from: sender,
            text: args.content,
            ...(args.summary && { summary: args.summary }),
            timestamp: new Date().toISOString(),
            read: false,
          };

          if (args.type === "broadcast") {
            // Broadcast to all members
            const config = await readJson<TeamConfig>(configPath);
            const recipients: string[] = [];

            return withLock(inboxesLockPath, async () => {
              for (const member of config.members) {
                if (member.name === sender) continue;
                const inboxPath = join(inboxesDir, `${member.name}.json`);
                await appendToInbox(inboxPath, message);
                recipients.push(member.name);
              }
              return JSON.stringify({ sent: true, recipients }, null, 2);
            });
          } else {
            // Direct message
            if (!args.recipient) {
              return "Error: recipient is required for non-broadcast messages";
            }

            return withLock(inboxesLockPath, async () => {
              const inboxPath = join(inboxesDir, `${args.recipient}.json`);
              await appendToInbox(inboxPath, message);
              return JSON.stringify({ sent: true, recipients: [args.recipient] }, null, 2);
            });
          }
        },
      }),

      message_fetch: tool({
        description:
          "Fetch messages from an agent's inbox. Optionally filter by timestamp and mark as read.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
          agent: tool.schema.string().describe("Agent name whose inbox to read"),
          since: tool.schema
            .string()
            .optional()
            .describe("ISO timestamp — return only messages after this time"),
          markRead: tool.schema
            .boolean()
            .optional()
            .describe("Mark fetched messages as read (default false)"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const inboxPath = join(dir, "inboxes", `${args.agent}.json`);
          let messages = await readInbox(inboxPath);

          if (args.since) {
            const sinceDate = new Date(args.since);
            messages = messages.filter((m) => new Date(m.timestamp) > sinceDate);
          }

          if (args.markRead && messages.length > 0) {
            // Re-read full inbox, mark matching messages as read, write back
            const allMessages = await readInbox(inboxPath);
            const sinceDate = args.since ? new Date(args.since) : null;
            let changed = false;
            for (const m of allMessages) {
              if (sinceDate && new Date(m.timestamp) <= sinceDate) continue;
              if (!m.read) {
                m.read = true;
                changed = true;
              }
            }
            if (changed) {
              await writeJsonAtomic(inboxPath, allMessages);
            }
          }

          messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          return messages.length > 0 ? JSON.stringify(messages, null, 2) : "No messages found";
        },
      }),

      // ==== Team Status Tools ====

      team_status: tool({
        description:
          "Get team status: config, task summary by status, message counts per agent, reports, completion flag.",
        args: {
          teamName: tool.schema.string().describe("Team name"),
        },
        async execute(args, context) {
          const dir = teamDir(context.directory, args.teamName);
          if (!(await exists(join(dir, "config.json")))) {
            return `Error: Team "${args.teamName}" not found`;
          }

          const config = await readJson<TeamConfig>(join(dir, "config.json"));
          const tasks = await loadAllTasks(context.directory, args.teamName);

          const summary = { pending: 0, in_progress: 0, completed: 0 };
          for (const t of tasks) {
            if (t.status in summary) {
              summary[t.status as keyof typeof summary]++;
            }
          }

          // Count messages per agent
          const inboxesDir = join(dir, "inboxes");
          const messageCounts: Record<string, { total: number; unread: number }> = {};
          if (await exists(inboxesDir)) {
            const inboxFiles = await listJsonFiles(inboxesDir);
            for (const f of inboxFiles) {
              const agentName = f.split("/").pop()!.replace(".json", "");
              const messages = await readInbox(f);
              messageCounts[agentName] = {
                total: messages.length,
                unread: messages.filter((m) => !m.read).length,
              };
            }
          }

          const reportDir = join(dir, "reports");
          const reports = (await exists(reportDir))
            ? (await readdir(reportDir)).filter((f) => !f.startsWith("."))
            : [];

          const total = Object.values(summary).reduce((a, b) => a + b, 0);
          const isComplete =
            total > 0 && summary.pending === 0 && summary.in_progress === 0;

          return JSON.stringify(
            { config, taskSummary: summary, messageCounts, reports, isComplete },
            null,
            2,
          );
        },
      }),

      team_list: tool({
        description: "List all teams with basic info.",
        args: {},
        async execute(_args, context) {
          const root = join(context.directory, TEAM_ROOT);
          if (!(await exists(root))) return "No teams found";

          const entries = await readdir(root, { withFileTypes: true });
          const teams = [];

          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const configPath = join(root, entry.name, "config.json");
            if (!(await exists(configPath))) continue;

            const config = await readJson<TeamConfig>(configPath);
            const tasks = await loadAllTasks(context.directory, entry.name);

            const pending = tasks.filter((t) => t.status === "pending").length;
            const inProgress = tasks.filter((t) => t.status === "in_progress").length;
            const completed = tasks.filter((t) => t.status === "completed").length;
            const isComplete = tasks.length > 0 && pending === 0 && inProgress === 0;

            teams.push({
              name: config.name,
              description: config.description,
              createdAt: config.createdAt,
              memberCount: config.members.length,
              taskSummary: { pending, in_progress: inProgress, completed },
              isComplete,
            });
          }

          return teams.length > 0 ? JSON.stringify(teams, null, 2) : "No teams found";
        },
      }),
    },
  };
};
