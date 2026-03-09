---
name: hd-security-review
description: "Security review in 3 modes: plan-review (15-30 min), code-review (30-60 min), pre-launch (60-120 min). Runs OWASP Top 10 checklist, PII audit, auth/authz analysis, injection checks, tenant isolation, and compliance gate. Outputs APPROVED or NOT APPROVED verdict with severity-classified findings."
license: proprietary
metadata:
  version: "1.0.0"
  copyright: "© HDWEBSOFT. All rights reserved."
---

# Security Review Skill

> **[IMPORTANT]** This skill is THINKING-HEAVY — no external tools required for core review.
> Core review relies on AI reasoning against checklists in `reference/checklists.md`.
> It does NOT replace automated SAST/secret scanning or penetration testing.
> See Phase 6 for optional tooling recommendations.

## Mode Overview

| Mode | Input | Duration | Use When |
|------|-------|----------|----------|
| `plan-review` | spec / plan / approach doc | ~15-30 min | Before coding — fastest, highest ROI |
| `code-review` | source code files | ~30-60 min | Code written, before PR merge |
| `pre-launch` | full system (code + config + infra) | ~60-120 min | Before go-live — most thorough |

## Pipeline

```
INPUT → Mode Detection → Standards Load → Core Review → CRITICAL Gate → Compliance Gate → Verdict → Optional Tooling
```

---

## Phase 1: Mode + Standards Setup

1. Detect mode from invocation argument (`plan-review` / `code-review` / `pre-launch`)
   - If no mode specified: ask user "Which mode? plan-review / code-review / pre-launch"

1b. **(code-review mode only) Diff-scope detection:**
   - Check for `--source=<branch>` and `--target=<branch>` flags (default target: `main`)
   - If either flag is present:
     ```bash
     git diff <TARGET_BRANCH>..<SOURCE_BRANCH> --name-only
     ```
     Store result as `CHANGED_FILES` (list of file paths).
     Display: `🔍 Diff scope: <N> files changed — review restricted to these files`
   - If no flags present: `CHANGED_FILES = unset` — review covers all provided files/context
   - **Phase 2 scoping rule:** If `CHANGED_FILES` is set, apply all checks in Phase 2 **only to files in that list**. Skip sections, files, or patterns not touched by the diff.

2. Load `SECURITY_STANDARDS.md` via **inheritance**:

   | Layer | Path | Role |
   |-------|------|------|
   | Base (always) | `SECURITY_STANDARDS.md` (in this skill's own folder) | Generic baseline — OWASP rules, compliance templates |
   | Override (if exists) | `<project-root>/docs/SECURITY_STANDARDS.md` | Project-specific — `applicable_compliance` and `project_rules` override base |

   Effective standards = base + project overrides. Project values WIN where both define the same field.

3. Extract declared compliance frameworks from loaded standards (`applicable_compliance` field)
4. Display summary:
   ```
   🔍 Security Review — [mode] mode
   📋 Standards: [project-local | generic fallback]
   ⚖️  Compliance declared: [list of frameworks | none]
   ```

---

## Phase 2: Core Review

Review the provided input against ALL of the following areas. For `plan-review`, review the spec/plan. For `code-review`, trace actual code. For `pre-launch`, review both.

### 2.1 API Exposure
- Response fields whitelisted (not blacklisted)?
- Sensitive fields in any response: `password_hash`, `secret_token`, `card_number`, `CVV`, `SSN`, `private_key`, `refresh_token`?
- Internal sequential IDs exposed? (recommend UUID)
- Internal paths, DB names, or system details leaked in responses?

### 2.2 Authentication
- Every endpoint has explicit auth declaration?
- Anonymous/public endpoints intentional and documented?
- Session expiry and invalidation on logout?
- Tokens stored securely (not in localStorage for sensitive tokens)?

### 2.3 Authorization
- RBAC implemented with least-privilege principle?
- In multi-tenant systems: every data query filtered by `tenant_id`?
- Privilege escalation paths possible?
- Horizontal access: can user A access user B's data?

### 2.4 Injection Prevention
- SQL: parameterized statements / ORM used? No string concatenation with user input?
- NoSQL: no operator injection (`$where`, `$regex` with raw user input)?
- Command injection in shell/exec calls?
- Path traversal in file operations?

### 2.5 PII Handling
- All PII fields identified and inventoried?
- PII retention policy defined?
- PII appearing in logs (names, emails, IPs, device IDs)?
- PII transmitted to 3rd parties without consent flow?
- Data minimization: collecting only what's needed?

### 2.6 Secrets Management
- Hardcoded API keys, passwords, or tokens in code?
- Secrets in committed config files?
- Environment variable pattern followed?

### 2.7 Error Handling
- Stack traces returned to client?
- Error messages contain PII or internal system details?
- Consistent error format (no differential info leakage)?

### 2.8 Audit Trail
- PII operations logged (create/read/update/delete on sensitive data)?
- Logs capture: who (user ID), what (action), when (timestamp)?
- Sensitive operations audited (password change, role change, data export)?

### 2.9 Input Validation
- All external input validated at entry point?
- File uploads: type, size, and content validated?
- Numeric/string range constraints enforced?

### 2.10 Transport Security
- All external endpoints HTTPS-only?
- Internal service-to-service using TLS?
- No sensitive data in URL parameters?

---

## Phase 3: CRITICAL Gate

Evaluate each check. **If ANY fails → output NOT APPROVED immediately** without waiting for remaining phases.

| # | Check | PASS condition | FAIL condition |
|---|-------|----------------|----------------|
| C1 | Unauthenticated endpoints | All endpoints have auth OR explicitly documented as public | Any endpoint missing auth without justification |
| C2 | Injection vectors | All external input to DB/shell/file uses parameterized/safe patterns | Any direct string concatenation with user input into queries |
| C3 | Sensitive fields in API response | No `password_hash`, `secret_token`, `card_number`, `CVV`, `private_key` in any response | Any sensitive field present in response |
| C4 | Hardcoded secrets | No credentials, API keys, or tokens in source code or config | Any hardcoded secret found |
| C5 | Tenant isolation | All data queries filter by `tenant_id` OR system is confirmed single-tenant | Any data access path missing tenant filter in multi-tenant system |
| C6 | Compliance violations | No violations of frameworks declared in project `SECURITY_STANDARDS.md` | Any violation of a declared compliance framework |

If all 6 PASS → proceed to Phase 4.
If ANY FAIL → go directly to Phase 5 verdict with NOT APPROVED.

---

## Phase 4: Compliance Gate

**If compliance declared in project SECURITY_STANDARDS.md:**
- Load relevant checklist from `reference/checklists.md` for each declared framework
- Review input strictly against each checklist
- Any violation = CRITICAL finding
- PCI-DSS example: card number plain text → CRITICAL; CVV stored → CRITICAL; no TLS → CRITICAL

**If no compliance declared:**
Analyze signals from review and suggest applicable frameworks:

| Signal | Suggested Framework |
|--------|---------------------|
| Payment card data | PCI-DSS |
| EU resident data | GDPR |
| Vietnamese user data | NĐ 13/2023 |
| Health / medical records | HIPAA |
| Enterprise B2B / internal systems | ISO 27001 |

Output: "Based on signals detected, consider declaring these frameworks in your project `SECURITY_STANDARDS.md`: [list]"

---

## Phase 5: Verdict + Report

Output in this format:

```markdown
## Security Review — [mode] Mode
**Reviewed:** [date]
**Input:** [plan name / files reviewed]
**Compliance:** [declared frameworks or 'none declared']

---

### 🔴 CRITICAL Issues (must fix — blocking sign-off)
- [C1] [description] — [location if known]

### 🟠 HIGH Issues (fix before deploy)
- [H1] [description]

### 🟡 MEDIUM Issues (track as tech debt)
- [M1] [description]

### 🔵 LOW / Advisory
- [L1] [description]

---

## Verdict

### ✅ APPROVED
No blocking issues found. HIGH and MEDIUM items noted above should be addressed before or shortly after deployment.

### ❌ NOT APPROVED
Fix all CRITICAL issues listed above before proceeding. Re-run security review after fixes.

---

> ⚠️ **Disclaimer:** This is AI-assisted security review. It does NOT certify the
> absence of all vulnerabilities. It does not replace automated SAST/secret scanning,
> dependency auditing (SCA), or penetration testing. See tooling recommendations below.
```

---

## Phase 6: Optional Tooling Suggestions

Suggest only tools relevant to what was found. Do NOT list all tools every time.

```
IF public-facing API endpoints detected:
  → **Nuclei** or **OWASP ZAP Baseline** — scan staging environment before promoting to prod
    `nuclei -u https://staging.yourdomain.com -t cves/ -t exposures/`

IF Docker/container files in scope:
  → **Trivy** image scan
    `trivy image your-image:tag`

IF IaC files (Terraform, k8s YAML, docker-compose) in scope:
  → **Trivy** config scan
    `trivy config .`

IF new npm/pip/gem/go dependencies added:
  → **Snyk SCA**
    `snyk test`

IF SAST not yet in CI/CD:
  → **Snyk Code** or **Semgrep** as PR gate

IF pre-launch mode:
  → **ZAP Full scan** on staging + **Snyk Monitor** for scheduled CVE monitoring
```

Output format:
```markdown
## Recommended Next Steps (Optional Tooling)
Based on this review, consider:
- [ ] **[Tool]** — [specific reason from this review]
- [ ] **[Tool]** — [specific reason from this review]

> These are optional suggestions. Not required to unblock deployment.
```
