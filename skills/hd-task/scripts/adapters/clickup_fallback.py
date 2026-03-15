#!/usr/bin/env python3
"""
ClickUp REST API v2 fallback client for hd-task.
Used when no ClickUp MCP server is available.

Usage: python3 clickup_fallback.py <command> [args]

Requires env var: CLICKUP_API_TOKEN
"""

import json
import os
import re
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package required. Install with: pip install requests")
    sys.exit(1)

CLICKUP_API_URL = "https://api.clickup.com/api/v2"

# ============== PII PATTERNS ==============

PII_PATTERNS = [
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED-EMAIL]'),
    (r'\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.s]?\d{3}[-.s]?\d{4}\b', '[REDACTED-PHONE]'),
    (r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[REDACTED-CARD]'),
]

# ============== ENV LOADING ==============

def load_env():
    """Load .env file following priority order.

    Priority: skill dir .env -> project root .env ->
              ~/.claude/skills/.env -> ~/.claude/.env
    """
    env_paths = [
        Path(__file__).parent / ".env",
        Path(__file__).parent.parent / ".env",
        Path.home() / ".claude" / "skills" / ".env",
        Path.home() / ".claude" / ".env",
    ]

    for env_path in env_paths:
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        if key.strip() not in os.environ:
                            os.environ[key.strip()] = value.strip().strip('"').strip("'")


def get_token():
    """Get CLICKUP_API_TOKEN from environment.

    Returns the token string. Exits with a clear error if not found.
    """
    load_env()
    token = os.environ.get("CLICKUP_API_TOKEN")
    if not token:
        print("ERROR: CLICKUP_API_TOKEN not found. See skills/hd-task/.env.example")
        print("  Create a .env file with:")
        print("  CLICKUP_API_TOKEN=<token-from-clickup-settings-apps>")
        sys.exit(1)
    return token


# ============== REST CORE ==============

def api_request(method, path, payload=None, params=None):
    """Make a ClickUp REST API v2 request.

    Args:
        method: HTTP method string ('GET', 'POST', 'PUT', 'DELETE').
        path: API path starting with /task/... (without base URL).
        payload: Optional dict to send as JSON body.
        params: Optional dict of query parameters.

    Returns:
        Parsed JSON response dict.
    """
    token = get_token()
    headers = {
        "Authorization": token,
        "Content-Type": "application/json",
    }
    url = f"{CLICKUP_API_URL}{path}"
    response = requests.request(method, url, json=payload, params=params, headers=headers)

    if response.status_code == 429:
        print("Rate limit hit. Wait and retry.")
        sys.exit(1)
    elif response.status_code == 401:
        print("CLICKUP_API_TOKEN is invalid or expired. Update it in .env or re-run hd-task init.")
        sys.exit(1)
    elif response.status_code == 404:
        print(f"Not found: {path}")
        sys.exit(1)
    elif not response.ok:
        print(f"HTTP {response.status_code}: {response.text}")
        sys.exit(1)

    return response.json()


# ============== TASK OPERATIONS ==============

def get_task(task_id):
    """Fetch a ClickUp task by its ID.

    Args:
        task_id: Task ID string (e.g. 'abc123xyz').

    Returns:
        Task dict from the API response.
    """
    data = api_request("GET", f"/task/{task_id}")
    return data


def update_task(task_id, field, value):
    """Update a single field on a ClickUp task.

    Args:
        task_id: Task ID string.
        field: Field name to update (name, description, status, priority, assignees).
        value: New value for the field.

    Returns:
        Updated task dict from the API.
    """
    allowed_fields = {"name", "description", "status", "priority", "assignees"}
    if field not in allowed_fields:
        print(f"Unknown field: {field}. Allowed: {', '.join(sorted(allowed_fields))}")
        sys.exit(1)

    if field == "priority":
        # ClickUp priority: 1=urgent, 2=high, 3=normal, 4=low
        priority_map = {"urgent": 1, "high": 2, "normal": 3, "low": 4}
        priority_val = priority_map.get(value.lower(), value)
        payload = {"priority": priority_val}
    elif field == "assignees":
        # Comma-separated user IDs
        ids = [int(x.strip()) for x in value.split(",")]
        payload = {"assignees": {"add": ids, "rem": []}}
    else:
        payload = {field: value}

    data = api_request("PUT", f"/task/{task_id}", payload)
    print(f"Task {task_id} updated: {field} = {value}")
    return data


def create_comment(task_id, body):
    """Add a comment to a ClickUp task.

    Args:
        task_id: Task ID string.
        body: Comment text (plain text or markdown).

    Returns:
        Response dict from the API.
    """
    payload = {"comment_text": body, "notify_all": False}
    data = api_request("POST", f"/task/{task_id}/comment", payload)
    print(f"Comment added (id: {data.get('id')}).")
    return data


def list_statuses(list_id):
    """List workflow statuses for a ClickUp list.

    Args:
        list_id: ClickUp list ID string (numeric).

    Returns:
        List of status dicts: [{status, type, color}].
    """
    data = api_request("GET", f"/list/{list_id}")
    statuses = data.get("statuses", [])
    return [{"status": s["status"], "type": s["type"], "color": s.get("color")} for s in statuses]


def list_statuses_from_task(task_id):
    """Get workflow statuses by looking up a task's parent list.

    Convenience wrapper: fetches the task to get its list_id, then calls list_statuses().

    Args:
        task_id: Task ID string.

    Returns:
        List of status dicts: [{status, type, color}].
    """
    task = get_task(task_id)
    list_id = task.get("list", {}).get("id")
    if not list_id:
        print("Could not determine list ID from task.")
        sys.exit(1)
    return list_statuses(list_id)


def create_attachment(task_id, url, title):
    """Attach a PR/external URL to a ClickUp task as a comment link.

    Note: ClickUp file attachments require multipart upload. For URL attachments
    (e.g. PR links) we add a comment with the linked text instead.

    Args:
        task_id: Task ID string.
        url: URL to attach (e.g. PR URL).
        title: Display text for the link.

    Returns:
        Response dict from the API.
    """
    body = f"{title}: {url}"
    return create_comment(task_id, body)


def get_relations(task_id):
    """Return dependencies and linked tasks for a ClickUp task.

    Args:
        task_id: Task ID string.

    Returns:
        Dict with 'dependencies' and 'dependents' lists.
    """
    data = api_request("GET", f"/task/{task_id}", params={"include_subtasks": "true"})
    dependencies = data.get("dependencies", [])
    dependents = data.get("dependents", [])
    return {
        "dependencies": [
            {"task_id": d.get("task_id"), "type": d.get("dependency_of")}
            for d in dependencies
        ],
        "dependents": [
            {"task_id": d.get("task_id")}
            for d in dependents
        ],
    }


# ============== PII REDACTION ==============

def redact_pii(text):
    """Replace PII patterns in text with redaction placeholders.

    Args:
        text: Input string potentially containing PII.

    Returns:
        String with PII replaced by [REDACTED-EMAIL], [REDACTED-PHONE],
        or [REDACTED-CARD] tokens.
    """
    for pattern, replacement in PII_PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text


# ============== CLI DISPATCH ==============

USAGE = """
ClickUp Fallback API Client
Usage: clickup_fallback.py <command> [args]

COMMANDS:
  get-task <task_id>                   Fetch task by ID
  update-task <task_id> <field> <v>    Update a field on a task
                                         Fields: name, description, status,
                                                 priority (urgent/high/normal/low),
                                                 assignees (comma-sep user IDs)
  create-comment <task_id> <body>      Add comment to task
  list-statuses <list_id>              List workflow statuses for a list
  list-statuses-from-task <task_id>    List statuses (auto-resolves list from task)
  create-attachment <task_id> <url> <title>
                                       Attach a URL to a task (as comment)
  get-relations <task_id>              List dependencies for a task
  --redact-pii <text|->                Redact PII from text (use - to read stdin)

Env var required: CLICKUP_API_TOKEN
"""


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    args = sys.argv[2:]

    if cmd == "get-task":
        if not args:
            print("Usage: clickup_fallback.py get-task <task_id>")
            sys.exit(1)
        task = get_task(args[0])
        print(json.dumps(task, indent=2))

    elif cmd == "update-task":
        if len(args) < 3:
            print("Usage: clickup_fallback.py update-task <task_id> <field> <value>")
            sys.exit(1)
        task_id = args[0]
        field = args[1]
        value = " ".join(args[2:])
        update_task(task_id, field, value)

    elif cmd == "create-comment":
        if len(args) < 2:
            print("Usage: clickup_fallback.py create-comment <task_id> <body>")
            sys.exit(1)
        task_id = args[0]
        body = " ".join(args[1:])
        create_comment(task_id, body)

    elif cmd == "list-statuses":
        if not args:
            print("Usage: clickup_fallback.py list-statuses <list_id>")
            sys.exit(1)
        statuses = list_statuses(args[0])
        print(json.dumps(statuses, indent=2))

    elif cmd == "list-statuses-from-task":
        if not args:
            print("Usage: clickup_fallback.py list-statuses-from-task <task_id>")
            sys.exit(1)
        statuses = list_statuses_from_task(args[0])
        print(json.dumps(statuses, indent=2))

    elif cmd == "create-attachment":
        if len(args) < 3:
            print("Usage: clickup_fallback.py create-attachment <task_id> <url> <title>")
            sys.exit(1)
        task_id = args[0]
        url = args[1]
        title = " ".join(args[2:])
        create_attachment(task_id, url, title)

    elif cmd == "get-relations":
        if not args:
            print("Usage: clickup_fallback.py get-relations <task_id>")
            sys.exit(1)
        relations = get_relations(args[0])
        print(json.dumps(relations, indent=2))

    elif cmd == "--redact-pii":
        if not args:
            print("Usage: clickup_fallback.py --redact-pii <text>  (use - to read stdin)")
            sys.exit(1)
        text = sys.stdin.read() if args[0] == "-" else " ".join(args)
        print(redact_pii(text))

    elif cmd in ("help", "--help", "-h") or not cmd:
        print(USAGE)

    else:
        print(f"Unknown command: {cmd}")
        print(USAGE)
        sys.exit(1)


if __name__ == "__main__":
    main()
