import { tool } from "@opencode-ai/plugin";
import { join } from "node:path";
import { exists } from "node:fs/promises";
import type { Message } from "./lib/types";
import {
  teamDir,
  ensureDir,
  writeJsonAtomic,
  readJson,
  listJsonFiles,
  nextId,
} from "./lib/store";

export const message_send = tool({
  description:
    'Send a message to an agent or broadcast to all. Types: message, broadcast, finding, blocker, complete.',
  args: {
    teamName: tool.schema.string().describe("Team name"),
    from: tool.schema.string().describe("Sender agent name"),
    to: tool.schema.string().describe('Recipient agent name or "all" for broadcast'),
    type: tool.schema
      .enum(["message", "broadcast", "finding", "blocker", "complete"])
      .describe("Message type: message, broadcast, finding, blocker, complete"),
    content: tool.schema.string().describe("Message content"),
  },
  async execute(args) {
    const dir = teamDir(args.teamName);
    if (!(await exists(dir))) {
      return `Error: Team "${args.teamName}" not found`;
    }

    const msgDir = join(dir, "messages");
    await ensureDir(msgDir);

    const id = await nextId(msgDir, "msg");
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
});

export const message_fetch = tool({
  description:
    "Fetch messages for an agent. Returns broadcasts (to=all) plus DMs. Filter by type and since timestamp.",
  args: {
    teamName: tool.schema.string().describe("Team name"),
    to: tool.schema
      .string()
      .optional()
      .describe("Recipient filter — returns messages to this agent + broadcasts"),
    type: tool.schema
      .enum(["message", "broadcast", "finding", "blocker", "complete"])
      .optional()
      .describe("Filter by type: message, broadcast, finding, blocker, complete"),
    since: tool.schema
      .string()
      .optional()
      .describe("ISO timestamp — return only messages after this time"),
  },
  async execute(args) {
    const dir = teamDir(args.teamName);
    if (!(await exists(dir))) {
      return `Error: Team "${args.teamName}" not found`;
    }

    const msgDir = join(dir, "messages");
    const files = await listJsonFiles(msgDir);
    let messages: Message[] = [];

    for (const f of files) {
      messages.push(await readJson<Message>(f));
    }

    if (args.to) {
      messages = messages.filter(
        (m) => m.to === args.to || m.to === "all"
      );
    }
    if (args.type) {
      messages = messages.filter((m) => m.type === args.type);
    }
    if (args.since) {
      const sinceDate = new Date(args.since);
      messages = messages.filter((m) => new Date(m.created) > sinceDate);
    }

    messages.sort((a, b) => a.created.localeCompare(b.created));
    return messages.length > 0
      ? JSON.stringify(messages, null, 2)
      : "No messages found";
  },
});
