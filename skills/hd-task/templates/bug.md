<!--
hd-task Bug Task Template
==========================
Extends default.md for tasks routed via bug labels (bug, defect, regression).
All default sections apply. Bug-specific sections (Steps to Reproduce, Expected Behavior,
Actual Behavior, Environment) are inserted after Background.

AI content marker:
  > 🤖 AI Generated on YYYY-MM-DD HH:MM — delete this line to accept

Rules:
  AI-fillable sections: Background, Steps to Reproduce, Expected Behavior, Actual Behavior,
    Environment, Verification Criteria, Implementation Details, Dependencies,
    Tasks, Scope of Changes, Security Considerations, Testing Checklist, Links,
    Config Changes, Document Changes.
    → On first fill: AI writes content + prepends the 🤖 marker.
    → On re-run: if marker present → overwrite from marker to end of section (update datetime).
    → If marker absent (human accepted/deleted it) → AI appends new block at section bottom
      with a fresh dated marker (propose-only, never replaces accepted content above).

  Sacred fields (AI never touches, not even to propose): Estimate, Developer Notes.

  Mixed section convention: human items go ABOVE the 🤖 marker line. To freely mix after
  accepting AI content, delete the marker first, then add items anywhere.

Project templates override this file at: docs/tasks/templates/bug.md
-->

## Background
<!-- Context: where this bug was reported, what feature/flow it affects.
     AI-filled on first run; accept by deleting the 🤖 marker line. -->

## Steps to Reproduce
<!-- Minimal sequence to reliably trigger the bug.
     AI-fills from task description; accept by deleting the 🤖 marker line. -->
1.
2.
3.

## Expected Behavior
<!-- What should happen when following the steps above.
     AI-filled from task description; accept by deleting the 🤖 marker line. -->

## Actual Behavior
<!-- What actually happens — the incorrect outcome.
     AI-filled from task description; accept by deleting the 🤖 marker line. -->

## Environment
<!-- OS, browser/runtime version, deployment environment, feature flags active.
     AI-fills what is known from task context; human completes the rest.
     Accept by deleting the 🤖 marker line. -->
- OS / Browser:
- Version / Build:
- Environment (local / staging / production):

## Verification Criteria
<!-- Requirements this fix must meet, in user-facing terms.
     AI-filled from acceptance criteria; accept by deleting the 🤖 marker line. -->

## Implementation Details
<!-- Root cause analysis, relevant services, architectural notes, related plans.
     AI-filled from hd-issue-resolution output; accept by deleting the 🤖 marker line. -->

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
     AI-filled from changed files and fix scope; accept by deleting the 🤖 marker line. -->

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
<!-- Environment variables, feature flags, infrastructure changes needed for this fix.
     AI-proposes (with 🤖 marker) based on scope; accept by deleting the marker line. -->
- [ ]

## Document Changes
<!-- Changes to help docs, user-facing documentation, or onboarding guides.
     AI-proposes (with 🤖 marker) based on scope; accept by deleting the marker line. -->
- [ ]

## Estimate
<!-- HUMAN-ONLY (sacred) — Developer fills. Format: Xh (e.g. 4h, 1.5h). AI never touches. -->

## Developer Notes
<!-- HUMAN-ONLY (sacred) — AI reads for context but NEVER writes here.
     Capture root cause decisions, gotchas, and context for future reference. -->
