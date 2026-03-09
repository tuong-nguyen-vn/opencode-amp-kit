#!/usr/bin/env python3
"""
Linear GraphQL fallback client for hd-task.
Used when the Linear MCP server is unavailable.

Usage: python3 linear_fallback.py <command> [args]
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

LINEAR_API_URL = "https://api.linear.app/graphql"

# ============== PII PATTERNS ==============

PII_PATTERNS = [
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED-EMAIL]'),
    (r'\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', '[REDACTED-PHONE]'),
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
    """Get LINEAR_API_KEY from environment.

    Returns the token string. Exits with a clear error if not found.
    """
    load_env()
    token = os.environ.get("LINEAR_API_KEY") or os.environ.get("LINEAR_TOKEN")
    if not token:
        print("ERROR: LINEAR_API_KEY not found. See skills/hd-task/.env.example")
        print("  Create a .env file with:")
        print("  LINEAR_API_KEY=lin_api_your_key_here")
        sys.exit(1)
    return token


# ============== GRAPHQL CORE ==============

def graphql_request(query, variables=None):
    """POST a GraphQL request to the Linear API.

    Args:
        query: GraphQL query/mutation string.
        variables: Optional dict of GraphQL variables.

    Returns:
        Parsed JSON response dict.
    """
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    response = requests.post(LINEAR_API_URL, json=payload, headers=headers)

    if response.status_code == 429:
        print("Rate limit hit (1500/hr). Wait and retry.")
        sys.exit(1)
    elif response.status_code == 401:
        print("Invalid LINEAR_API_KEY. Check your .env file.")
        sys.exit(1)
    elif not response.ok:
        print(f"HTTP {response.status_code}: {response.text}")
        sys.exit(1)

    return response.json()


# ============== ISSUE OPERATIONS ==============

QUERY_GET_ISSUE = """
query($identifier: String!) {
  issue(id: $identifier) {
    id
    identifier
    title
    description
    state { id name type }
    labels { nodes { id name } }
    assignee { id name }
    priority
    estimate
    updatedAt
    createdAt
    relations { nodes { type relatedIssue { id identifier title state { name } } } }
    attachments { nodes { id url title } }
  }
}
"""


def get_issue(identifier):
    """Fetch a Linear issue by its human-readable identifier (e.g. 'HDMW-317').

    Args:
        identifier: Issue identifier string such as 'HDMW-317'.

    Returns:
        Issue dict from the API response.
    """
    result = graphql_request(QUERY_GET_ISSUE, {"identifier": identifier})
    issue = result.get("data", {}).get("issue")
    if not issue:
        errors = result.get("errors", [])
        print(f"Issue '{identifier}' not found.")
        if errors:
            for err in errors:
                print(f"  {err.get('message')}")
        sys.exit(1)
    return issue


MUTATION_UPDATE_ISSUE = """
mutation($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue {
      id
      identifier
      title
      updatedAt
    }
  }
}
"""


def update_issue(issue_id, updates):
    """Update fields on an existing issue.

    Args:
        issue_id: Internal UUID of the issue.
        updates: Dict with any of: description, stateId, assigneeId,
                 labelIds, estimate, title.

    Returns:
        Response dict from the API.
    """
    allowed_fields = {"description", "stateId", "assigneeId", "labelIds", "estimate", "title"}
    filtered = {k: v for k, v in updates.items() if k in allowed_fields}
    if not filtered:
        print("No valid fields to update. Allowed: " + ", ".join(sorted(allowed_fields)))
        sys.exit(1)

    result = graphql_request(MUTATION_UPDATE_ISSUE, {"id": issue_id, "input": filtered})
    data = result.get("data", {}).get("issueUpdate", {})
    if data.get("success"):
        updated = data.get("issue", {})
        print(f"Issue {updated.get('identifier')} updated successfully.")
    else:
        errors = result.get("errors", [])
        print("Update failed.")
        for err in errors:
            print(f"  {err.get('message')}")
    return result


MUTATION_CREATE_COMMENT = """
mutation($issueId: String!, $body: String!) {
  commentCreate(input: { issueId: $issueId, body: $body }) {
    success
    comment {
      id
      createdAt
    }
  }
}
"""


def create_comment(issue_id, body):
    """Add a markdown comment to an issue.

    Args:
        issue_id: Internal UUID of the issue.
        body: Markdown-formatted comment text.

    Returns:
        Response dict from the API.
    """
    result = graphql_request(MUTATION_CREATE_COMMENT, {"issueId": issue_id, "body": body})
    data = result.get("data", {}).get("commentCreate", {})
    if data.get("success"):
        print(f"Comment added successfully (id: {data.get('comment', {}).get('id')}).")
    else:
        errors = result.get("errors", [])
        print("Failed to create comment.")
        for err in errors:
            print(f"  {err.get('message')}")
    return result


# ============== WORKFLOW STATES ==============

QUERY_WORKFLOW_STATES = """
query($teamId: String!) {
  workflowStates(filter: { team: { id: { eq: $teamId } } }) {
    nodes {
      id
      name
      type
    }
  }
}
"""


def list_workflow_states(team_id):
    """Return a dict mapping state name -> UUID for the given team.

    Args:
        team_id: UUID of the Linear team.

    Returns:
        Dict of {state_name: state_id}.
    """
    result = graphql_request(QUERY_WORKFLOW_STATES, {"teamId": team_id})
    nodes = result.get("data", {}).get("workflowStates", {}).get("nodes", [])
    states = {node["name"]: node["id"] for node in nodes}
    return states


# ============== ATTACHMENTS ==============

MUTATION_CREATE_ATTACHMENT = """
mutation($issueId: String!, $url: String!, $title: String!) {
  attachmentCreate(input: { issueId: $issueId, url: $url, title: $title }) {
    success
    attachment {
      id
      url
      title
    }
  }
}
"""


def create_attachment(issue_id, url, title):
    """Link a URL (e.g. a PR) to an issue as an attachment.

    Args:
        issue_id: Internal UUID of the issue.
        url: URL to attach.
        title: Display title for the attachment.

    Returns:
        Response dict from the API.
    """
    result = graphql_request(
        MUTATION_CREATE_ATTACHMENT,
        {"issueId": issue_id, "url": url, "title": title},
    )
    data = result.get("data", {}).get("attachmentCreate", {})
    if data.get("success"):
        attachment = data.get("attachment", {})
        print(f"Attachment created: '{attachment.get('title')}' -> {attachment.get('url')}")
    else:
        errors = result.get("errors", [])
        print("Failed to create attachment.")
        for err in errors:
            print(f"  {err.get('message')}")
    return result


# ============== RELATIONS ==============

QUERY_ISSUE_RELATIONS = """
query($issueId: String!) {
  issue(id: $issueId) {
    relations {
      nodes {
        type
        relatedIssue {
          identifier
          title
          state { name }
        }
      }
    }
  }
}
"""


def get_issue_relations(issue_id):
    """Return the list of relations for an issue.

    Args:
        issue_id: UUID or identifier of the issue.

    Returns:
        List of dicts: [{type, relatedIssue: {identifier, title, state}}]
    """
    result = graphql_request(QUERY_ISSUE_RELATIONS, {"issueId": issue_id})
    nodes = (
        result.get("data", {})
        .get("issue", {})
        .get("relations", {})
        .get("nodes", [])
    )
    return nodes


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
Linear Fallback API Client
Usage: linear_fallback.py <command> [args]

COMMANDS:
  get-issue <identifier>               Fetch issue by identifier (e.g. HDMW-317)
  update-issue <issue_id> <field> <v>  Update a field on an issue
                                         Fields: title, description, stateId,
                                                 assigneeId, estimate
  create-comment <issue_id> <body>     Add markdown comment to issue
  list-states <team_id>                List workflow states for a team
  create-attachment <issue_id> <url> <title>
                                       Attach a URL to an issue
  get-relations <issue_id>             List relations for an issue
  --redact-pii <text|->>               Redact PII from text (use - to read stdin)
"""


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    args = sys.argv[2:]

    if cmd == "get-issue":
        if not args:
            print("Usage: linear_fallback.py get-issue <identifier>")
            sys.exit(1)
        issue = get_issue(args[0])
        print(json.dumps(issue, indent=2))

    elif cmd == "update-issue":
        if len(args) < 3:
            print("Usage: linear_fallback.py update-issue <issue_id> <field> <value>")
            sys.exit(1)
        issue_id = args[0]
        field = args[1]
        value = " ".join(args[2:])
        # Coerce numeric estimate field
        if field == "estimate":
            try:
                value = int(value)
            except ValueError:
                print("ERROR: estimate must be an integer.")
                sys.exit(1)
        update_issue(issue_id, {field: value})

    elif cmd == "create-comment":
        if len(args) < 2:
            print("Usage: linear_fallback.py create-comment <issue_id> <body>")
            sys.exit(1)
        issue_id = args[0]
        body = " ".join(args[1:])
        create_comment(issue_id, body)

    elif cmd == "list-states":
        if not args:
            print("Usage: linear_fallback.py list-states <team_id>")
            sys.exit(1)
        states = list_workflow_states(args[0])
        print(json.dumps(states, indent=2))

    elif cmd == "create-attachment":
        if len(args) < 3:
            print("Usage: linear_fallback.py create-attachment <issue_id> <url> <title>")
            sys.exit(1)
        issue_id = args[0]
        url = args[1]
        title = " ".join(args[2:])
        create_attachment(issue_id, url, title)

    elif cmd == "get-relations":
        if not args:
            print("Usage: linear_fallback.py get-relations <issue_id>")
            sys.exit(1)
        relations = get_issue_relations(args[0])
        print(json.dumps(relations, indent=2))

    elif cmd == "--redact-pii":
        if not args:
            print("Usage: linear_fallback.py --redact-pii <text>  (use - to read stdin)")
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
