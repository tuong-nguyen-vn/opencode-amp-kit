# Compliance Checklists — hd-security-review

Reference checklists used by Phase 4 (Compliance Gate) of the `hd-security-review` skill.
Load the relevant section(s) based on the declared compliance frameworks in the project's `SECURITY_STANDARDS.md`.

---

## ISO 27001 — Information Security Management System

_Last verified: 2026-02-25_
_Applicable when: Any organization handling business or customer data. Applies broadly across all system types._

| # | Area | Requirement | CRITICAL if violated |
|---|------|-------------|----------------------|
| 1 | A.9 Access Control | Documented access control policy exists and is enforced | Yes |
| 2 | A.9 Access Control | User access is provisioned based on least-privilege principle | No |
| 3 | A.9 Access Control | Access rights reviewed and revoked on role change or departure | No |
| 4 | A.9 Access Control | Privileged accounts logged and monitored separately | No |
| 5 | A.10 Cryptography | Sensitive data at rest encrypted using approved algorithms (AES-256 or equivalent) | Yes |
| 6 | A.10 Cryptography | Cryptographic key management process documented (generation, storage, rotation, revocation) | Yes |
| 7 | A.10 Cryptography | Sensitive data in transit protected with TLS 1.2+ | No |
| 8 | A.12 Operations Security | Change management process documented for system changes | No |
| 9 | A.12 Operations Security | Malware protection in place for systems handling sensitive data | No |
| 10 | A.12 Operations Security | Operational procedures for backup, monitoring, and capacity management documented | No |
| 11 | A.13 Communications | Network segmentation in place; sensitive systems isolated | No |
| 12 | A.13 Communications | Data transfer agreements in place for external parties | No |
| 13 | A.16 Incident Management | Information security incident response plan documented | Yes |
| 14 | A.16 Incident Management | Incident classification procedure defined (severity levels) | No |
| 15 | General | Risk assessment conducted before system launch | Yes |
| 16 | General | Risk register maintained and reviewed periodically | No |
| 17 | General | Statement of Applicability (SoA) maintained | No |
| 18 | General | Security responsibilities assigned (Security Officer or equivalent) | No |

**Reference:** [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)

---

## HIPAA — US Healthcare Data (Protected Health Information)

_Last verified: 2026-02-25_
_Applicable when: Any system that creates, receives, stores, or transmits Protected Health Information (PHI) on behalf of a US-covered entity or business associate._

| # | Area | Requirement | CRITICAL if violated |
|---|------|-------------|----------------------|
| 1 | Administrative Safeguards | Security Officer designated | No |
| 2 | Administrative Safeguards | Workforce security training documented | No |
| 3 | Administrative Safeguards | Risk analysis (assessment) conducted and documented | Yes |
| 4 | Administrative Safeguards | Access management policies in place | Yes |
| 5 | Administrative Safeguards | Incident response procedures established | No |
| 6 | Administrative Safeguards | Business Associate Agreements (BAAs) in place with all PHI-accessing vendors | No |
| 7 | Physical Safeguards | Physical access to PHI-housing systems controlled | No |
| 8 | Physical Safeguards | Workstation and device controls implemented | No |
| 9 | Technical Safeguards — Access Control | PHI accessible only with role-based access control (RBAC) | Yes |
| 10 | Technical Safeguards — Access Control | Unique user IDs assigned; no shared accounts for PHI access | No |
| 11 | Technical Safeguards — Access Control | Automatic logoff implemented for PHI-accessing systems | No |
| 12 | Technical Safeguards — Audit Controls | Audit trail maintained for all PHI read, write, and delete operations | Yes |
| 13 | Technical Safeguards — Audit Controls | PHI not present in application logs, error logs, or access logs | Yes |
| 14 | Technical Safeguards — Integrity | Mechanisms in place to verify PHI has not been improperly altered | No |
| 15 | Technical Safeguards — Transmission Security | PHI encrypted in transit (TLS 1.2+ minimum) | Yes |
| 16 | Technical Safeguards — Transmission Security | PHI encrypted at rest | Yes |
| 17 | Breach Notification | Breach notification procedure: affected individuals notified within 60 days | No |
| 18 | Breach Notification | HHS notification process defined | No |
| 19 | Breach Notification | Media notification process defined for breaches affecting 500+ individuals in a state | No |
| 20 | Retention | PHI-related documentation retained for minimum 6 years | No |

**Reference:** [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

---

## PCI-DSS — Payment Card Industry Data Security Standard

_Last verified: 2026-02-25_
_Applicable when: Any system that processes, stores, or transmits payment card data (cardholder data or sensitive authentication data)._

| # | Area | Requirement | CRITICAL if violated |
|---|------|-------------|----------------------|
| 1 | Network Security | Network security controls in place; vendor-supplied defaults changed | No |
| 2 | Network Security | Cardholder Data Environment (CDE) isolated from other networks | No |
| 3 | Cardholder Data Protection | Primary Account Number (PAN) not stored as plain text; tokenization or strong encryption required | Yes |
| 4 | Cardholder Data Protection | CVV/CVC/CAV2 not stored at any time — prohibited regardless of encryption | Yes |
| 5 | Cardholder Data Protection | Track data (full magnetic stripe) not stored post-authorization | Yes |
| 6 | Cardholder Data Protection | PAN truncated or masked in display (show only last 4 digits) | Yes |
| 7 | Cardholder Data Protection | Card data (PAN, CVV, track data) absent from all log entries | Yes |
| 8 | Data in Transit | Payment-related endpoints use TLS 1.2 or higher | Yes |
| 9 | Data in Transit | No sensitive cardholder data transmitted in URL parameters | Yes |
| 10 | Key Management | Documented key management process (generation, distribution, storage, rotation, revocation) | Yes |
| 11 | Vulnerability Management | Anti-malware protection deployed on applicable systems | No |
| 12 | Vulnerability Management | Secure SDLC practices followed; patch management process in place | No |
| 13 | Access Control | Access to cardholder data restricted by business need-to-know | No |
| 14 | Access Control | RBAC implemented; least-privilege principle applied | No |
| 15 | Access Control | MFA required for administrative access to CDE | No |
| 16 | Monitoring | All access to cardholder data logged and monitored | No |
| 17 | Monitoring | Log review process defined; anomaly detection in place | No |
| 18 | Testing | Regular vulnerability scans and penetration testing scheduled | No |
| 19 | Security Policy | Information security policy documented and reviewed annually | No |
| 20 | Identifiers | No sequential or guessable account/transaction identifiers exposed | No |

**Reference:** [PCI Security Standards Council — PCI-DSS v4.0](https://www.pcisecuritystandards.org/document_library/)

---

## GDPR — EU General Data Protection Regulation

_Last verified: 2026-02-25_
_Applicable when: Any system collecting or processing personal data of individuals located in the EU or EEA, regardless of where the organization is based._

| # | Area | Requirement | CRITICAL if violated |
|---|------|-------------|----------------------|
| 1 | Lawful Basis | Documented lawful basis for every category of personal data processing | Yes |
| 2 | Lawful Basis | Special category data (health, biometric, racial/ethnic, political, sexual orientation) has explicit consent or explicit legal basis | Yes |
| 3 | Data Minimization | Only personal data strictly necessary for the stated purpose is collected | No |
| 4 | Purpose Limitation | Personal data not used for purposes incompatible with original collection purpose | No |
| 5 | Consent | Where consent is the lawful basis: it is specific, informed, freely given, and withdrawable | No |
| 6 | Data Subject Rights | Mechanism exists for right of access (subject can request their data) | No |
| 7 | Data Subject Rights | Mechanism exists for right of rectification (subject can correct their data) | No |
| 8 | Data Subject Rights | Mechanism exists for right of erasure (right to be forgotten) | Yes |
| 9 | Data Subject Rights | Mechanism exists for right to data portability | No |
| 10 | Data Subject Rights | Mechanism exists to restrict processing on request | No |
| 11 | Retention | Data retention policy defined per personal data category | Yes |
| 12 | Retention | Deletion/anonymization mechanism implemented when retention period expires | Yes |
| 13 | Third Party Transfers | Data Processing Agreement (DPA) in place with all processors handling personal data | Yes |
| 14 | Third Party Transfers | Legal mechanism documented for transfers outside EU/EEA (adequacy decision, SCCs, or BCRs) | No |
| 15 | Breach Notification | Breach notification plan: supervisory authority notified within 72 hours | Yes |
| 16 | Breach Notification | Affected data subjects notified without undue delay for high-risk breaches | No |
| 17 | DPIA | Data Protection Impact Assessment (DPIA) conducted for high-risk processing activities | No |
| 18 | DPO | Data Protection Officer appointed where required (public authority, large-scale monitoring, large-scale special category data) | No |
| 19 | Privacy by Design | Privacy considerations incorporated at design phase (not bolted on) | No |
| 20 | Records | Records of processing activities maintained (Article 30) | No |

**Reference:** [GDPR Full Text — EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679)

---

## NĐ 13/2023 — Vietnamese Personal Data Protection Decree

_Last verified: 2026-02-25_
_Applicable when: Any system collecting or processing personal data of Vietnamese individuals. Effective July 1, 2023._

> ⚠️ **Legal Advisory:** This summary is as of 2026-02-25. Verify against the current regulation text and consult qualified legal counsel for Vietnamese projects. The decree and its implementing guidance may be updated by the Ministry of Public Security (Bộ Công an).

| # | Area | Requirement | CRITICAL if violated |
|---|------|-------------|----------------------|
| 1 | Điều 11 — Consent | Explicit, documented consent obtained before collecting or processing personal data | Yes |
| 2 | Điều 11 — Consent | Consent is specific, informed, voluntary, and in writing (hoặc hình thức tương đương) | Yes |
| 3 | Điều 11 — Consent | Mechanism exists to withdraw consent | No |
| 4 | Purpose Limitation | Personal data processed only for the stated purpose for which consent was given | No |
| 5 | Data Subject Rights | Right to know: subjects can be informed of what data is collected and how it is used | No |
| 6 | Data Subject Rights | Right of access: subjects can request their personal data | No |
| 7 | Data Subject Rights | Right to correct: subjects can request correction of inaccurate data | No |
| 8 | Data Subject Rights | Right to delete: mechanism exists to fulfill deletion requests | Yes |
| 9 | Data Subject Rights | Right to restrict processing on request | No |
| 10 | Data Subject Rights | Right to data portability | No |
| 11 | Data Subject Rights | Right to object and right to complain | No |
| 12 | Điều 25 — Cross-Border Transfer | Cross-border transfer of Vietnamese personal data has approval from Ministry of Public Security OR documented valid legal basis | Yes |
| 13 | Điều 25 — Cross-Border Transfer | Impact assessment conducted and submitted to Ministry for cross-border transfers | No |
| 14 | Security Measures | Appropriate technical and organizational security measures implemented to protect personal data | No |
| 15 | Sensitive Personal Data | Sensitive personal data (health/sức khỏe, biometric/sinh trắc học, financial/tài chính, political views, religious beliefs/tôn giáo, sexual orientation, criminal records) has additional protection measures beyond standard personal data | Yes |
| 16 | Sensitive Personal Data | Explicit consent for each category of sensitive personal data processed | Yes |
| 17 | Data Protection Officer | DPO designated for organizations processing sensitive personal data at scale | No |
| 18 | Impact Assessment | Personal Data Processing Impact Assessment conducted for high-risk processing | No |
| 19 | Incident Notification | Breach notification capability: Ministry of Public Security notified within 72 hours of discovering a personal data breach | Yes |
| 20 | Incident Notification | Documented incident response plan specific to personal data breaches | No |
| 21 | Retention | Personal data retention period defined and deletion implemented on expiry | No |
| 22 | Records | Records of personal data processing activities maintained | No |

**Reference:** [Nghị định 13/2023/NĐ-CP](https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=207273)

_⚠️ This summary is as of 2026-02-25. Verify against the current regulation text and consult qualified legal counsel for Vietnamese projects._
