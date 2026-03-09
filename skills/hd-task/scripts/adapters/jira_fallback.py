#!/usr/bin/env python3
"""
Jira REST API v3 fallback client for hd-task.
Used when the Jira MCP server is unavailable.

Usage: python3 jira_fallback.py <command> [args]

Requires env vars: JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN
"""

import base64
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


def get_credentials():
    """Get JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN from environment.

    Returns (url, email, token) tuple. Exits with clear error if any missing.
    """
    load_env()
    url = os.environ.get("JIRA_URL", "").rstrip("/")
    email = os.environ.get("JIRA_EMAIL", "")
    token = os.environ.get("JIRA_API_TOKEN", "")

    missing = []
    if not url:
        missing.append("JIRA_URL")
    if not email:
        missing.append("JIRA_EMAIL")
    if not token:
        missing.append("JIRA_API_TOKEN")

    if missing:
        print(f"ERROR: Missing env vars: {', '.join(missing)}")
        print("  Add to .env:")
        print("  JIRA_URL=https://yourcompany.atlassian.net")
        print("  JIRA_EMAIL=you@yourcompany.com")
        print("  JIRA_API_TOKEN=<token-from-atlassian-api-tokens>")
        sys.exit(1)

    return url, email, token


# ============== REST CORE ==============

def api_request(method, path, payload=None):
    """Make a Jira REST API v3 request.

    Args:
        method: HTTP method string ('GET', 'POST', 'PUT').
        path: API path starting with /rest/api/3/...
        payload: Optional dict to send as JSON body.

    Returns:
        Parsed JSON response dict, or None for 204 responses.
    """
    base_url, email, token = get_credentials()
    credentials = base64.b64encode(f"{email}:{token}".encode()).decode()
    headers = {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    url = f"{base_url}{path}"
    response = requests.request(method, url, json=payload, headers=headers)

    if response.status_code == 429:
        print("Rate limit hit. Wait and retry.")
        sys.exit(1)
    elif response.status_code == 401:
        print("JIRA_API_TOKEN is invalid or expired. Update it in .env or re-run hd-task init.")
        sys.exit(1)
    elif response.status_code == 404:
        print(f"Not found: {path}")
        sys.exit(1)
    elif response.status_code == 204:
        return None
    elif not response.ok:
        print(f"HTTP {response.status_code}: {response.text}")
        sys.exit(1)

    return response.json()


# ============== ISSUE OPERATIONS ==============

def get_issue(key):
    """Fetch a Jira issue by its key (e.g. 'PROJ-123').

    Args:
        key: Issue key string such as 'PROJ-123'.

    Returns:
        Issue dict from the API response.
    """
    fields = "summary,description,status,assignee,priority,labels,issuelinks,comment,attachment,fixVersions,components"
    data = api_request("GET", f"/rest/api/3/issue/{key}?fields={fields}")
    return data


def update_issue(key, field, value):
    """Update a single field on a Jira issue.

    Args:
        key: Issue key string such as 'PROJ-123'.
        field: Field name to update (summary, description, priority, assignee, labels).
        value: New value for the field.

    Returns:
        None (Jira returns 204 on success).
    """
    allowed_fields = {"summary", "description", "priority", "assignee", "labels"}
    if field not in allowed_fields:
        print(f"Unknown field: {field}. Allowed: {', '.join(sorted(allowed_fields))}")
        sys.exit(1)

    if field == "priority":
        payload = {"fields": {"priority": {"name": value}}}
    elif field == "assignee":
        payload = {"fields": {"assignee": {"accountId": value}}}
    elif field == "labels":
        payload = {"fields": {"labels": value.split(",") if isinstance(value, str) else value}}
    else:
        payload = {"fields": {field: value}}

    api_request("PUT", f"/rest/api/3/issue/{key}", payload)
    print(f"Issue {key} updated: {field} = {value}")


def create_comment(key, body):
    """Add a comment to a Jira issue.

    Args:
        key: Issue key string such as 'PROJ-123'.
        body: Plain text comment body (converted to Atlassian Document Format).

    Returns:
        Response dict from the API.
    """
    # ADF (Atlassian Document Format) for plain text
    payload = {
        "body": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": body}]
                }
            ]
        }
    }
    data = api_request("POST", f"/rest/api/3/issue/{key}/comment", payload)
    print(f"Comment added (id: {data.get('id')}).")
    return data


def list_transitions(key):
    """List available workflow transitions for an issue.

    Args:
        key: Issue key string such as 'PROJ-123'.

    Returns:
        Dict mapping transition name -> transition id.
    """
    data = api_request("GET", f"/rest/api/3/issue/{key}/transitions")
    transitions = {t["name"]: t["id"] for t in data.get("transitions", [])}
    return transitions


def transition_issue(key, transition_id):
    """Move an issue to a new status via a workflow transition.

    Args:
        key: Issue key string such as 'PROJ-123'.
        transition_id: Transition ID string from list_transitions().

    Returns:
        None (Jira returns 204 on success).
    """
    payload = {"transition": {"id": str(transition_id)}}
    api_request("POST", f"/rest/api/3/issue/{key}/transitions", payload)
    print(f"Issue {key} transitioned (id: {transition_id}).")


def list_statuses(project_key):
    """List all workflow statuses for a Jira project.

    Args:
        project_key: Project key string (e.g. 'PROJ').

    Returns:
        List of status dicts: [{name, id, statusCategory}].
    """
    data = api_request("GET", f"/rest/api/3/project/{project_key}/statuses")
    statuses = []
    seen = set()
    for issue_type in data:
        for s in issue_type.get("statuses", []):
            if s["id"] not in seen:
                statuses.append({
                    "id": s["id"],
                    "name": s["name"],
                    "category": s.get("statusCategory", {}).get("name"),
                })
                seen.add(s["id"])
    return statuses


def create_attachment(key, url, title):
    """Attach a PR/external URL to a Jira issue as a comment link.

    Note: Jira file attachments require multipart upload. For URL attachments
    (e.g. PR links) we add a comment with the linked text instead.

    Args:
        key: Issue key string such as 'PROJ-123'.
        url: URL to attach (e.g. PR URL).
        title: Display text for the link.

    Returns:
        Response dict from the API.
    """
    body = f"{title}: {url}"
    return create_comment(key, body)


def get_relations(key):
    """Return the list of linked issues for a Jira issue.

    Args:
        key: Issue key string such as 'PROJ-123'.

    Returns:
        List of dicts: [{type, direction, issue: {key, summary, status}}].
    """
    data = api_request("GET", f"/rest/api/3/issue/{key}?fields=issuelinks")
    links = data.get("fields", {}).get("issuelinks", [])
    relations = []
    for link in links:
        link_type = link.get("type", {}).get("name", "")
        if "inwardIssue" in link:
            issue = link["inwardIssue"]
            relations.append({
                "type": link_type,
                "direction": "inward",
                "issue": {
                    "key": issue["key"],
                    "summary": issue["fields"].get("summary", ""),
                    "status": issue["fields"].get("status", {}).get("name", ""),
                },
            })
        if "outwardIssue" in link:
            issue = link["outwardIssue"]
            relations.append({
                "type": link_type,
                "direction": "outward",
                "issue": {
                    "key": issue["key"],
                    "summary": issue["fields"].get("summary", ""),
                    "status": issue["fields"].get("status", {}).get("name", ""),
                },
            })
    return relations


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
Jira Fallback API Client
Usage: jira_fallback.py <command> [args]

COMMANDS:
  get-issue <key>                      Fetch issue by key (e.g. PROJ-123)
  update-issue <key> <field> <value>   Update a field on an issue
                                         Fields: summary, description, priority,
                                                 assignee (accountId), labels (csv)
  create-comment <key> <body>          Add comment to issue
  list-transitions <key>               List available workflow transitions
  transition-issue <key> <trans_id>    Move issue to new status
  list-statuses <project_key>          List all statuses for a project
  create-attachment <key> <url> <title>  Attach a URL to an issue (as comment)
  get-relations <key>                  List linked issues
  --redact-pii <text|->                Redact PII from text (use - to read stdin)

Env vars required: JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN
"""


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    args = sys.argv[2:]

    if cmd == "get-issue":
        if not args:
            print("Usage: jira_fallback.py get-issue <key>")
            sys.exit(1)
        issue = get_issue(args[0])
        print(json.dumps(issue, indent=2))

    elif cmd == "update-issue":
        if len(args) < 3:
            print("Usage: jira_fallback.py update-issue <key> <field> <value>")
            sys.exit(1)
        key = args[0]
        field = args[1]
        value = " ".join(args[2:])
        update_issue(key, field, value)

    elif cmd == "create-comment":
        if len(args) < 2:
            print("Usage: jira_fallback.py create-comment <key> <body>")
            sys.exit(1)
        key = args[0]
        body = " ".join(args[1:])
        create_comment(key, body)

    elif cmd == "list-transitions":
        if not args:
            print("Usage: jira_fallback.py list-transitions <key>")
            sys.exit(1)
        transitions = list_transitions(args[0])
        print(json.dumps(transitions, indent=2))

    elif cmd == "transition-issue":
        if len(args) < 2:
            print("Usage: jira_fallback.py transition-issue <key> <transition_id>")
            sys.exit(1)
        transition_issue(args[0], args[1])

    elif cmd == "list-statuses":
        if not args:
            print("Usage: jira_fallback.py list-statuses <project_key>")
            sys.exit(1)
        statuses = list_statuses(args[0])
        print(json.dumps(statuses, indent=2))

    elif cmd == "create-attachment":
        if len(args) < 3:
            print("Usage: jira_fallback.py create-attachment <key> <url> <title>")
            sys.exit(1)
        key = args[0]
        url = args[1]
        title = " ".join(args[2:])
        create_attachment(key, url, title)

    elif cmd == "get-relations":
        if not args:
            print("Usage: jira_fallback.py get-relations <key>")
            sys.exit(1)
        relations = get_relations(args[0])
        print(json.dumps(relations, indent=2))

    elif cmd == "--redact-pii":
        if not args:
            print("Usage: jira_fallback.py --redact-pii <text>  (use - to read stdin)")
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
