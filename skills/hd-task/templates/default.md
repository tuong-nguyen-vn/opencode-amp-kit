<!--
hd-task Default Task Template
==============================
This template structures task descriptions updated by hd-task.

AI content marker:
  > 🤖 AI Generated on YYYY-MM-DD HH:MM — delete this line to accept

Rules:
  AI-fillable sections: Background, Verification Criteria, Implementation Details, Dependencies,
    Tasks, Scope of Changes, Security Considerations, Testing Checklist, Links, Config Changes,
    Document Changes.
    → On first fill: AI writes content + prepends the 🤖 marker.
    → On re-run: if marker present → overwrite from marker to end of section (update datetime).
    → If marker absent (human accepted/deleted it) → AI appends new block at section bottom
      with a fresh dated marker (propose-only, never replaces accepted content above).

  Sacred fields (AI never touches, not even to propose): Estimate, Developer Notes.

  Mixed section convention: human items go ABOVE the 🤖 marker line. To freely mix after
  accepting AI content, delete the marker first, then add items anywhere.

Project templates override this file at: docs/tasks/templates/default.md
Project-key templates (e.g. HDMW.md) override for specific Linear/Jira projects.
-->

## Background
<!-- Context: where this task comes from, motivation, related features.
     AI-filled on first run; accept by deleting the 🤖 marker line. -->

## Verification Criteria
<!-- Requirements this task must meet, in user-facing terms.
     AI-filled from acceptance criteria; accept by deleting the 🤖 marker line. -->

## Implementation Details
<!-- Relevant services, libraries, architectural notes, related plans.
     AI-filled from planning/brainstorming output; accept by deleting the 🤖 marker line. -->

## Dependencies
<!-- Tasks, services, or PRs that must complete before this one starts, and what this blocks.
     AI-infers from implementation details and related task context; accept by deleting the 🤖 marker line. -->
- Blocked by:
- Blocks:

## Tasks
<!-- Individual work items.
     AI-proposes checklist; accept by deleting the 🤖 marker line. -->
- [ ]

## Scope of Changes
<!-- Areas QA and UAT should focus on.
     AI-filled from changed files and plan scope; accept by deleting the 🤖 marker line. -->

## Security Considerations
<!-- Data classification, PII touched, auth/authz implications, injection surface, external exposure.
     AI-fills from scope analysis; write N/A if no security implications apply.
     Accept by deleting the 🤖 marker line. -->

## Testing Checklist
<!-- Steps using "Confirm" for expected behaviour. Format: Visit/Click/Do → Confirm outcome.
     AI-proposes based on scope; human items go ABOVE the 🤖 marker line.
     Accept AI items by deleting the 🤖 marker line. -->
- [ ]

## Links
<!-- PR links, related tasks, sub-tasks, external references.
     AI-filled during Close Loop phase; accept by deleting the 🤖 marker line. -->

## Config Changes
<!-- Environment variables, feature flags, infrastructure changes needed for this task.
     AI-proposes (with 🤖 marker) based on scope; accept by deleting the marker line.
     Example: - [ ] Set SENTRY_TRACE_SAMPLE_RATE=0.1 on production environments -->
- [ ]

## Document Changes
<!-- Changes to help docs, user-facing documentation, or onboarding guides.
     AI-proposes (with 🤖 marker) based on scope; accept by deleting the marker line. -->
- [ ]

## Estimate
<!-- HUMAN-ONLY (sacred) — Developer fills. Format: Xh (e.g. 4h, 1.5h). AI never touches. -->

## Developer Notes
<!-- HUMAN-ONLY (sacred) — AI reads for context but NEVER writes here.
     Capture decisions, gotchas, and context for future reference. -->
