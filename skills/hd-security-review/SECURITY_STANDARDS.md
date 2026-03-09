# Security Standards

This document defines the baseline security standards, data classification tiers, compliance templates, and tooling matrix used by all security-aware skills in this workflow system. It is the generic fallback reference — loaded at runtime by skills such as `hd-brainstorming`, `hd-planning`, and `hd-security-review` when no project-specific version exists.

---

## Table of Contents

1. [Loading Convention](#1-loading-convention)
2. [Data Classification](#2-data-classification)
3. [Generic Security Rules](#3-generic-security-rules)
4. [CRITICAL Gate](#4-critical-gate)
5. [Severity Levels](#5-severity-levels)
6. [Security Tooling Matrix](#6-security-tooling-matrix)
7. [Compliance Templates](#7-compliance-templates)
8. [Project-Specific Override Convention](#8-project-specific-override-convention)

---

## 1. Loading Convention

Skills load `SECURITY_STANDARDS.md` using a two-level fallback pattern:

```
1. <project-root>/docs/SECURITY_STANDARDS.md        ← project-specific (checked first)
2. <this-skill-dir>/SECURITY_STANDARDS.md           ← this file, bundled with skill (generic fallback)
```

**Resolution rules:**

- If a project's `docs/SECURITY_STANDARDS.md` exists, load it as the primary source.
- If no project-local file exists, load this generic file (bundled with the skill).
- A project-local file is **additive** — it declares applicable compliance frameworks and project-specific rules that extend (not replace) the generic rules in this file.
- Skills must apply generic rules from this file AND project-specific rules simultaneously. The project file does not override or waive any generic rule unless it explicitly states an exemption with a documented justification.

**Path for sibling skills (e.g. `hd-brainstorming`, `hd-planning`):**

These skills live in a sibling directory. They access this file via:
```
../hd-security-review/SECURITY_STANDARDS.md
```
(one level up from their own base dir, then into the `hd-security-review` folder)

**Encoding this convention in skills:**

Each skill that reads security standards must implement the load order explicitly in its logic. The convention is not enforced by tooling — it is a behavioral contract for AI skills.

---

## 2. Data Classification

| Tier | Description | Examples |
|------|-------------|---------|
| **Public** | Information intended for public consumption. No access controls required. | Marketing content, public documentation, product landing pages, open API specs |
| **Internal** | Information for internal use. Not sensitive, but not intended for external parties. | Internal tools, operational runbooks, non-sensitive business metrics, team wikis |
| **Confidential** | Sensitive information. Exposure causes reputational, legal, or operational harm. | PII (name, email, phone, date of birth, address), user accounts, authentication tokens, business logic, internal pricing |
| **Restricted** | Highest sensitivity. Exposure causes severe legal, financial, or safety harm. Strict access controls and encryption required. | Payment card data (PAN, CVV, expiry), health records (PHI), government ID numbers (SSN, CCCD), cryptographic private keys, credentials and secrets |

**Classification determines:**
- Required encryption at rest and in transit
- Access control strictness (who can read, write, delete)
- Retention and deletion policy
- Audit logging requirements
- Applicable compliance frameworks

---

## 3. Generic Security Rules

These rules apply to all projects. They are grounded in the OWASP Top 10 and represent the minimum acceptable security posture.

### 3.1 Authentication

- Every endpoint must explicitly declare its authentication requirement.
- Unauthenticated (public) endpoints must be intentional and documented with justification.
- Use industry-standard protocols: OAuth 2.0, OpenID Connect, JWT with short expiry, API keys for service-to-service.
- Implement token revocation and session invalidation on logout.

### 3.2 Authorization

- Apply role-based access control (RBAC) — users may only access resources their role permits.
- In multi-tenant systems: every data query must be filtered by `tenant_id`. Cross-tenant data leakage is a CRITICAL violation.
- Apply authorization checks server-side. Never rely on client-side filtering as a security control.
- Use the principle of least privilege: grant minimum access required for the function.

### 3.3 Injection Prevention

- Use parameterized queries / prepared statements for all SQL and NoSQL database interactions.
- Never concatenate user input directly into query strings, shell commands, or file paths.
- Validate and sanitize all external inputs before use.
- Applies to: SQL injection, NoSQL injection (e.g., MongoDB operator injection), OS command injection, LDAP injection, template injection.

### 3.4 Sensitive Field Protection

- API responses must use an explicit field whitelist — never serialize full ORM objects or database rows.
- The following fields must never appear in any API response, log entry, or error message:
  - `password_hash`, `password`, `hashed_password`
  - Authentication tokens, refresh tokens, session tokens, API keys
  - `card_number` (PAN), `cvv`, `cvc`, `card_expiry`
  - `ssn`, `national_id`, `tax_id`
  - `private_key`, `secret_key`, `client_secret`
- Mask or omit these fields at the serialization layer, not in ad-hoc code.

### 3.5 Secrets Management

- No hardcoded credentials, passwords, API keys, or cryptographic keys in source code or committed configuration files.
- Use environment variables or a secrets vault (e.g., HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) for all secrets.
- Rotate secrets regularly; revoke compromised secrets immediately.
- `.env` files must be listed in `.gitignore` and never committed.

### 3.6 PII Inventory

- Identify all PII fields in the data model at design time (brainstorm/planning phase).
- Define retention policy: maximum retention duration for each PII field.
- Define deletion policy: how PII is deleted or anonymized when retention period expires or user requests deletion.
- PII in transit must be encrypted (TLS 1.2+).
- PII at rest must be encrypted for Confidential and Restricted tiers.

### 3.7 Input Validation

- Validate all external input at the system boundary (API layer, message queue consumer, file upload handler).
- Validate type, format, length, and allowable character set.
- Reject and return a structured error for invalid input — do not attempt to sanitize-and-continue for security-sensitive fields.
- Validate on the server; client-side validation is a UX enhancement only.

### 3.8 Error Handling

- Do not return stack traces, internal error messages, or debugging information to clients.
- Do not include PII in error messages returned to clients or written to logs.
- Return generic, user-safe error messages externally; log detailed diagnostic information internally with a correlation ID.
- Handle all error paths explicitly — do not rely on unhandled exception defaults.

### 3.9 Logging and Audit

- Do not log PII fields (name, email, phone, card numbers, tokens, etc.).
- Maintain an audit trail for all operations that read, write, or delete PII: record who (user/service identity), what (operation + resource), and when (timestamp).
- Log authentication events: login success, login failure, logout, token refresh.
- Log authorization failures: access denied events.
- Audit logs must be tamper-evident and retained according to the applicable compliance framework.

### 3.10 Transport Security

- All external-facing endpoints must use HTTPS (TLS 1.2 minimum; TLS 1.3 preferred).
- No mixed content: pages served over HTTPS must not load resources over HTTP.
- Do not transmit sensitive data (tokens, PII, credentials) in URL parameters — use request body or headers.
- Implement HSTS for web applications.

---

## 4. CRITICAL Gate

These are the 6 must-pass blocking checks enforced by `hd-security-review`. If **any single check fails**, the review verdict is **NOT APPROVED**.

| # | Check | Failure Condition |
|---|-------|------------------|
| 1 | **No unauthenticated endpoints** | Any endpoint lacks an authentication declaration, unless explicitly marked public with a documented justification |
| 2 | **No injection vectors** | Any SQL, NoSQL, or command injection pattern is present; parameterized statements not used |
| 3 | **No sensitive fields in API response** | Any of `password_hash`, tokens, `card_number`, `cvv`, `ssn`, `private_key`, or equivalent fields appear in any API response |
| 4 | **No hardcoded secrets** | Any credential, API key, password, or cryptographic key is hardcoded in source code or committed configuration |
| 5 | **Tenant isolation enforced** | In a multi-tenant system, any data query is not filtered by `tenant_id`, creating potential for cross-tenant data leakage |
| 6 | **Zero compliance violations** | Any violation of a compliance framework declared in the project's `SECURITY_STANDARDS.md` |

**Disclaimer:** The CRITICAL gate is an AI-assisted reasoning check. It does not replace automated SAST tooling, secret scanning, or formal penetration testing. A CRITICAL gate pass is not a certification of the absence of all vulnerabilities.

---

## 5. Severity Levels

| Level | Definition | Required Action |
|-------|------------|----------------|
| **CRITICAL** | Exploitable vulnerability or compliance violation with direct risk of data breach, unauthorized access, or regulatory penalty | Must fix — blocks sign-off. Review cannot be approved until resolved. |
| **HIGH** | Significant weakness that increases attack surface or violates a strong security principle | Fix before deploy. Must be resolved before production release. |
| **MEDIUM** | Security weakness that does not pose immediate risk but degrades overall posture | Track as tech debt. Schedule for resolution within an agreed timeframe. |
| **LOW** | Advisory finding, best-practice deviation, or minor hardening opportunity | Advisory. Log and address when convenient. |

---

## 6. Security Tooling Matrix

| Tool | Type | Stage | Scope | Action on Fail |
|------|------|-------|-------|----------------|
| Snyk IDE plugin | SAST/SCA | Local (optional) | deps + code | warn |
| Snyk | SAST + SCA | CI/CD PR gate | deps + source | block merge |
| Trivy | Container + IaC | CI/CD pre-deploy | image + config | block deploy |
| Nuclei / ZAP Baseline | DAST | CI/CD post-staging | endpoints | block promote to prod |
| ZAP Full | DAST deep | Scheduled / pre-launch | full app | alert + ticket |
| Snyk Monitor | SCA | Scheduled nightly | deps (new CVEs) | alert + ticket |
| OWASP Top 10 | Checklist | hd-security-review | manual AI review | findings report |

**Notes:**
- DAST tools (Nuclei, ZAP) require a running staging environment. Not all projects have one — apply where available.
- Snyk Monitor surfaces new CVEs against already-deployed dependencies. Configure on projects with active production traffic.
- The OWASP Top 10 checklist row represents the manual AI-driven review in `hd-security-review`, not an automated scan.

---

## 7. Compliance Templates

Each template is a summary-level reference for AI-driven review. Deep checklists per framework are maintained in `hd-security-review/reference/checklists.md`.

---

### 7.1 ISO 27001 — Information Security Management System

**Applicable when:** Any organization handling business or customer data. Applies broadly across all system types.

**Key requirements:**
- Establish, implement, and maintain an Information Security Management System (ISMS).
- Define and document an access control policy (Annex A.9).
- Apply cryptographic controls for sensitive data at rest and in transit (Annex A.10).
- Implement operational security procedures: change management, capacity management, malware protection (Annex A.12).
- Secure network communications and data transfer agreements (Annex A.13).
- Maintain an information security incident management process (Annex A.16).
- Conduct regular risk assessments and risk treatment.
- Maintain a risk register and Statement of Applicability (SoA).

**Strict rules (CRITICAL if violated):**
- No documented access control policy.
- Sensitive data at rest without encryption.
- No incident response plan or incident classification procedure.
- No risk assessment conducted before system launch.

**Reference:** [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)

_Last verified: 2026-02-25_

---

### 7.2 HIPAA — US Healthcare Data

**Applicable when:** Any system that creates, receives, stores, or transmits Protected Health Information (PHI) on behalf of a US-covered entity or business associate.

**Key requirements:**
- **Administrative Safeguards:** Designate a Security Officer; conduct workforce training; implement access management policies; establish incident response procedures; conduct regular risk analysis.
- **Physical Safeguards:** Control physical access to systems housing PHI; implement workstation and device controls.
- **Technical Safeguards:** Implement access controls (unique user IDs, automatic logoff, encryption); audit controls (hardware and software activity logs); integrity controls (verify PHI not improperly altered); transmission security (encrypt PHI in transit).
- **Breach Notification Rule:** Notify affected individuals within 60 days of discovery; notify HHS; notify media if breach affects 500+ in a state.
- Maintain Business Associate Agreements (BAAs) with all vendors who access PHI.
- Retain PHI-related documentation for 6 years.

**Strict rules (CRITICAL if violated):**
- PHI accessible without role-based access control.
- PHI present in log entries (access logs, error logs, application logs).
- No audit trail for PHI read, write, or delete operations.
- PHI transmitted without encryption (in transit).
- PHI stored without encryption at rest.
- No documented risk analysis.

**Reference:** [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

_Last verified: 2026-02-25_

---

### 7.3 PCI-DSS — Payment Card Industry Data Security Standard

**Applicable when:** Any system that processes, stores, or transmits payment card data (cardholder data or sensitive authentication data).

**Key requirements:**
- Install and maintain network security controls; do not use vendor-supplied defaults.
- Protect stored cardholder data: minimize storage, never store sensitive authentication data post-authorization.
- Protect cardholder data in transit with strong cryptography (TLS 1.2+).
- Use and regularly update anti-malware software.
- Develop and maintain secure systems and software (patch management, secure SDLC).
- Restrict access to cardholder data by business need to know (RBAC).
- Identify and authenticate all access to system components (MFA for administrative access).
- Restrict physical access to cardholder data.
- Log and monitor all access to network resources and cardholder data.
- Test security systems and processes regularly (vulnerability scans, penetration testing).
- Maintain an information security policy.

**Strict rules (CRITICAL if violated):**
- Primary Account Number (PAN) stored as plain text (tokenization or encryption required).
- CVV/CVC stored at all — prohibited by PCI-DSS regardless of encryption.
- Card data (PAN, CVV, track data) present in any log entry.
- Payment-related endpoints without TLS 1.2 or higher.
- No tokenization strategy for PAN storage.
- Sequential or guessable transaction/account identifiers.

**Reference:** [PCI Security Standards Council — PCI-DSS v4.0](https://www.pcisecuritystandards.org/document_library/)

_Last verified: 2026-02-25_

---

### 7.4 GDPR — EU General Data Protection Regulation

**Applicable when:** Any system collecting or processing personal data of individuals located in the European Union or European Economic Area, regardless of where the organization is based.

**Key requirements:**
- Establish and document a **lawful basis** for every category of personal data processing (consent, contract, legal obligation, legitimate interest, etc.).
- Apply **data minimization**: collect only what is necessary for the stated purpose.
- Implement **purpose limitation**: do not use data for purposes incompatible with the original collection purpose.
- Support **data subject rights**: right of access, rectification, erasure ("right to be forgotten"), restriction, portability, and objection.
- Notify supervisory authority of data breach within **72 hours** of discovery.
- Notify affected data subjects without undue delay for high-risk breaches.
- Maintain **Data Processing Agreements (DPAs)** with all processors handling personal data.
- Conduct a **Data Protection Impact Assessment (DPIA)** for high-risk processing activities.
- Appoint a **Data Protection Officer (DPO)** where required (public authority, large-scale systematic monitoring, or large-scale special category data processing).

**Strict rules (CRITICAL if violated):**
- Personal data collected or processed without a documented lawful basis.
- No retention policy or deletion mechanism for personal data.
- Personal data transmitted to a third party without a DPA or user consent.
- No mechanism to fulfill a user's deletion request (right to erasure).
- No 72-hour breach notification plan in place.
- Special category data (health, biometric, racial/ethnic origin, political opinion, sexual orientation) processed without explicit consent or another explicit legal basis.

**Reference:** [GDPR Full Text — EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679)

_Last verified: 2026-02-25_

---

### 7.5 NĐ 13/2023 — Vietnamese Personal Data Protection Decree

**Applicable when:** Any system collecting or processing personal data of Vietnamese individuals. Effective July 1, 2023.

**Key requirements:**
- Obtain **explicit consent** (Điều 11) before collecting or processing personal data. Consent must be specific, informed, voluntary, and documented.
- Apply **purpose limitation**: process personal data only for the stated purpose for which consent was given.
- Support **data subject rights**: right to know, right of access, right to correct, right to delete, right to restrict processing, right to data portability, right to object, right to complain.
- **Cross-border data transfer** (Điều 25): transferring personal data of Vietnamese individuals outside Vietnam requires approval from the Ministry of Public Security. Document the legal basis for any transfer.
- Implement appropriate **security measures** to protect personal data against unauthorized access, disclosure, or loss.
- **Incident notification**: notify the Ministry of Public Security within **72 hours** of discovering a personal data breach.
- Conduct and maintain a **Personal Data Processing Impact Assessment** for high-risk processing.
- **Sensitive personal data** (health information, biometric data, financial data, political views, religious beliefs, sexual orientation, criminal records) requires additional protections and explicit consent.

**Strict rules (CRITICAL if violated):**
- Personal data collected or processed without explicit, documented consent.
- Cross-border transfer of personal data without Ministry of Public Security approval or valid legal basis.
- No 72-hour incident notification plan for data breaches.
- Sensitive personal data (health, biometric, financial) processed without additional protections beyond standard personal data.
- No mechanism to fulfill data subject deletion or access requests.

**Reference:** [Nghị định 13/2023/NĐ-CP](https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=207273)

_Last verified: 2026-02-25_

_⚠️ Verify against current regulation text — consult legal counsel for Vietnamese projects_

---

## 8. Project-Specific Override Convention

A project creates its own `SECURITY_STANDARDS.md` at `docs/SECURITY_STANDARDS.md` to declare applicable compliance frameworks and project-specific rules. This file is loaded by skills before falling back to this generic file (bundled with the skill).

**Schema:**

```yaml
# Project: <project-name>
applicable_compliance:
  - PCI-DSS
  - GDPR

project_rules:
  - All user IDs must use UUID format (not sequential integers)
  - PII fields: [name, email, phone, date_of_birth, address]
  - All API responses use field whitelist (never serialize full ORM objects)
  - Audit log required for all write operations on user and payment records
  - ...
```

**Convention rules:**

- `applicable_compliance` lists the compliance frameworks that are **actively enforced** for this project. Skills treat violations of listed frameworks as CRITICAL findings.
- `project_rules` are **additive** — they extend and strengthen the generic rules in this file. They do not replace or waive any generic rule.
- If a project rule conflicts with a generic rule (e.g., a project rule is less strict), the more restrictive rule takes precedence.
- An exemption from a generic rule requires an explicit entry in `project_rules` with a documented justification and an owner.
- Compliance frameworks not listed in `applicable_compliance` are still suggested by `hd-security-review` if signals in the codebase indicate they may apply (e.g., payment card data found when PCI-DSS is not declared).
