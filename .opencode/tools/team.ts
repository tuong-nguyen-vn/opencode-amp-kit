import { tool } from "@opencode-ai/plugin";
import { readdir, rm, exists } from "node:fs/promises";
import { join } from "node:path";
import type { TeamConfig, Task } from "./lib/types";
import {
  teamDir,
  ensureDir,
  writeJsonAtomic,
  readJson,
  listJsonFiles,
} from "./lib/store";

export const team_create = tool({
  description:
    "Create a new agent team with directory structure and config. Returns the team config.",
  args: {
    teamName: tool.schema
      .string()
      .regex(/^[a-z0-9-]+$/)
      .describe("Team name in kebab-case"),
    template: tool.schema
      .string()
      .describe('Template type: research, cook, review, debug, or custom'),
    agents: tool.schema
      .string()
      .describe(
        'JSON array of agents: [{"name":"dev-1","role":"developer"}]'
      ),
  },
  async execute(args) {
    const dir = teamDir(args.teamName);
    if (await exists(dir)) {
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

    if (
      !Array.isArray(agents) ||
      !agents.every((a) => typeof a.name === "string" && typeof a.role === "string")
    ) {
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
});

export const team_status = tool({
  description:
    "Get team status: config, task summary by status, message count, reports, completion flag.",
  args: {
    teamName: tool.schema.string().describe("Team name"),
  },
  async execute(args) {
    const dir = teamDir(args.teamName);
    if (!(await exists(dir))) {
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
    const isComplete =
      total > 0 && summary.pending === 0 && summary.blocked === 0 && summary.in_progress === 0;

    return JSON.stringify(
      { config, taskSummary: summary, messageCount: msgFiles.length, reports, isComplete },
      null,
      2
    );
  },
});

export const team_list = tool({
  description: "List all active teams with basic info.",
  args: {},
  async execute() {
    const root = ".team";
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
});

export const team_delete = tool({
  description: "Delete a team and all its data (tasks, messages, reports).",
  args: {
    teamName: tool.schema.string().describe("Team name to delete"),
  },
  async execute(args) {
    const dir = teamDir(args.teamName);
    if (!(await exists(dir))) {
      return `Error: Team "${args.teamName}" not found`;
    }
    await rm(dir, { recursive: true, force: true });
    return `Team "${args.teamName}" deleted successfully`;
  },
});
