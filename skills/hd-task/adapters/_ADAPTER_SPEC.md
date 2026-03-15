# hd-task Adapter Specification

Adapters let hd-task work with any task tracker. Each adapter is a single JSON file.

**Reference implementation**: `linear.json` (fully implemented)
**Examples**: `jira.json`, `clickup.json`, `asana.json` (placeholder stubs)

---

## JSON Schema

```jsonc
{
  "platform":        string,   // REQUIRED — machine id (lowercase, no spaces): "linear", "jira"
  "display_name":    string,   // REQUIRED — shown in messages: "Linear", "Jira"
  "status":          string,   // REQUIRED — "implemented" | "placeholder"
  "url_pattern":     string,   // REQUIRED — regex to match task URLs (escape backslashes)
  "id_group":        int,      // REQUIRED — capture group index for task ID in url_pattern (1-based)
  "mcp_server":      string,   // OPTIONAL — npm package name (null if no MCP): "@linear/mcp-server"
  "mcp_server_name": string,   // OPTIONAL — key used in .mcp.json (matches hd-mcp catalog key)
  "tools": {                   // OPTIONAL — map hd-task ops → MCP tool names (null if no MCP)
    "get_task":     string,    //   fetch task details
    "update_task":  string,    //   update task fields
    "add_comment":  string,    //   add a comment
    "list_teams":   string,    //   list workspace teams
    "get_blockers": string,    //   get blocking/blocked-by relations
    "list_states":  string,    //   list workflow states for status change
    "link_pr":      string,    //   attach a PR URL to the task
    "search":       string     //   search/filter tasks
  },
  "fallback_script": string,   // OPTIONAL — Python script path relative to skill root (null if none)
  "workspace_url_pattern": string | null,
  // OPTIONAL — regex matching workspace/team/board/sprint URLs (NOT issue URLs).
  // Used by hd-tasks for bulk listing. Capture groups: (workspace, team?, cycle?).
  // null if bulk workspace listing is not supported for this platform in v1.

  "list_issues": string | null,
  // OPTIONAL — MCP tool name for listing/searching issues (used by hd-tasks Phase 1).
  // null if platform uses fallback script for listing.

  "list_cycles": string | null,
  // OPTIONAL — MCP tool name for listing sprint/cycle issues.
  // null if unsupported.

  "auth": {                    // REQUIRED
    "type":                 string,  // "env" — reads from environment variable
    "key":                  string,  // env var name: "LINEAR_API_KEY"
    "format":               string,  // key format hint: "lin_api_*"
    "get_credentials_url":  string   // where to obtain credentials
  },
  "notes": string              // OPTIONAL — human note (used in placeholder stubs)
}
```

---

## Runtime Detection Flow

When hd-task receives a URL:

```
1. Scan adapters/*.json (skip files starting with _)
2. Match URL against each adapter's url_pattern
3. If no match: "Unsupported URL. Supported platforms: Linear. See adapters/_ADAPTER_SPEC.md."
4. If status == "placeholder": "<Platform> adapter not yet implemented.
   Supported: Linear. See adapters/_ADAPTER_SPEC.md to contribute."
5. If mcp_server_name is set: probe MCP tool availability (call list-like tool)
   - If MCP responds: use tools map for all operations
   - If MCP absent + fallback_script set: use Python fallback script
   - If neither: "Run /hd-mcp to set up <platform> MCP, or add LINEAR_API_KEY to .env."
6. Extract task ID using id_group from the URL regex match
7. Proceed with task lifecycle
```

---

## MCP Scope

- **`"scope": "user"`** — personal credentials (e.g. `LINEAR_API_KEY`). Set in user-scope `.mcp.json`. Each developer runs `/hd-mcp` to configure their own machine.
- **`"scope": "project"`** — shared token (e.g. bot token for CI). Set in project `.mcp.json`. Committed to the repo (using `${ENV_VAR}` placeholder, never the real key).

Linear uses `user` scope. Prefer `user` scope unless the credential is intentionally shared.

---

## How to Add a New Adapter

1. Copy `linear.json` as `<platform>.json` in this directory.
2. Set `"status": "placeholder"` while implementing; change to `"implemented"` when complete.
3. Set `url_pattern` to match the platform's task URLs. Use `url-patterns.json` in hd-changelog as a reference for existing patterns.
4. Set `id_group` to the capture group index that extracts the task ID from the URL.
5. If an MCP server exists: fill `mcp_server`, `mcp_server_name`, and `tools` map. Add the server entry to `skills/hd-mcp/reference/mcp-catalog.md`.
6. If no MCP: write a Python fallback script in `scripts/adapters/<platform>_fallback.py` following the `linear_fallback.py` pattern. Set `fallback_script` to the relative path from the skill root.
7. Add `auth` config with the env var name, format hint, and credentials URL.
8. Test all `tools` map operations against the live platform API.

> `workspace_url_pattern`, `list_issues`, and `list_cycles` are optional. hd-task ignores them. hd-tasks requires them for bulk operations. Set to `null` if not yet implemented for the platform.
