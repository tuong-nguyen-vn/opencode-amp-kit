import { readdir, mkdir, exists, rename } from "node:fs/promises";
import { join } from "node:path";

const TEAM_ROOT = ".team";
const SAFE_ID = /^[a-z0-9-]+$/;

export function validateId(id: string, label: string): void {
  if (!SAFE_ID.test(id)) {
    throw new Error(`Invalid ${label}: "${id}" (must be lowercase alphanumeric + hyphens)`);
  }
}

export function teamDir(teamName: string): string {
  validateId(teamName, "teamName");
  return join(TEAM_ROOT, teamName);
}

export function taskPath(teamName: string, id: string): string {
  validateId(teamName, "teamName");
  validateId(id, "taskId");
  return join(TEAM_ROOT, teamName, "tasks", `${id}.json`);
}

export function messagePath(teamName: string, id: string): string {
  validateId(teamName, "teamName");
  validateId(id, "messageId");
  return join(TEAM_ROOT, teamName, "messages", `${id}.json`);
}

export async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  const tmp = path + ".tmp";
  await Bun.write(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, path);
}

export async function readJson<T>(path: string): Promise<T> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${path}`);
  }
  return file.json() as Promise<T>;
}

export async function listJsonFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir);
  return entries.filter((e) => e.endsWith(".json")).map((e) => join(dir, e));
}

export async function nextId(dir: string, prefix: string): Promise<string> {
  const files = await listJsonFiles(dir);
  let max = 0;
  const needle = prefix + "-";
  for (const f of files) {
    const basename = f.split("/").pop() ?? "";
    if (basename.startsWith(needle) && basename.endsWith(".json")) {
      const numStr = basename.slice(needle.length, -5);
      const n = parseInt(numStr, 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
