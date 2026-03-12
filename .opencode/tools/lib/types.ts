export type TaskStatus = "pending" | "blocked" | "in_progress" | "completed" | "cancelled";

export interface Task {
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

export interface TeamConfig {
  team_name: string;
  template: string;
  created: string;
  agents: Array<{ name: string; role: string; status: string }>;
}

export interface Message {
  id: string;
  teamName: string;
  from: string;
  to: string;
  type: "message" | "broadcast" | "finding" | "blocker" | "complete";
  content: string;
  created: string;
}
