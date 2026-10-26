# SAMANVAY (समन्वय) — Requirements Specification Document
## SIH Problem Statement 26264: Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells

---

## 1. Executive Context & Problem Statement Analysis

### 1.1 Problem Statement Overview
The All India Council for Technical Education (AICTE) receives numerous grievances, regulatory non-compliance reports, and complaints concerning approved technical institutions across India. These submissions originate from students, faculty members, parents, staff, and external citizens. 

Currently, complaints are handled in organizational silos across multiple internal AICTE bureaus and cells:
* **Regulation Bureau (RB):** Land norms, infrastructure compliance, faculty cadre ratios, affiliation rules, and Approval Process Handbook (APH) violations.
* **Public Grievance Redressal Cell (PGRC):** Student and faculty personal grievances, fee refund disputes, harassment, delayed 7th CPC salaries, and withholding of certificates.
* **Approval Bureau (AB):** Extension of Approval (EOA) disputes, unapproved intake expansion, unapproved course specializations, and closure orders.
* **Legal Cell (LC):** High Court writ petitions, supreme court appeals, civil suits, and institutional litigation where AICTE is impleaded.
* **Vigilance Cell (VC):** Allegations of fraud, ghost faculty documentation, bribery, forged approval letters, and criminal malpractice.
* **Policy & Academic Planning Bureau (PAPB):** Curriculum credit compliance, reservation norm violations, and academic policy disputes.

### 1.2 Core Operational Challenges Identified in PS 26264
1. **Lack of Cross-Bureau Visibility:** Bureaus lack visibility into concurrent actions initiated by other cells regarding the same technical institution.
2. **Duplication of Effort & Overlapping Actions:** One bureau may schedule an inspection or issue a show-cause notice while another cell is independently mediating or while the Legal Cell is contesting a status-quo order.
3. **Contradictory Regulatory Directives:** A technical institution might receive punitive closure or penalty recommendations from one cell while receiving an Extension of Approval (EOA) from another.
4. **Resolution Delays & Loss of File Accountability:** Stakeholders cannot trace which specific desk officer or bureau currently retains custody of their grievance file.
5. **Absence of Unified Institutional Dossiers:** Regulators cannot review an institution's historical track record across all divisions in a single window.

---

## 2. Requirements Classification

To ensure regulatory compliance and engineering clarity, requirements are categorized into:
* **[MANDATORY - PS 26264]:** Explicitly required by the problem statement description.
* **[RECOMMENDED DESIGN DECISION]:** Best-practice engineering decisions introduced to ensure production-grade security, explainability, auditability, and scalability.

---

## 3. Detailed Functional Requirements

### FR-01: User Roles and Access Profiles (Prototype Model)
*Proposed prototype roles; not official AICTE service rules.*
* **FR-01.1 [RECOMMENDED]: Super Administrator (HQ / Council Leadership):** Council-wide read/write visibility across all bureaus, system configuration, regional assignment, user management, and global dispute arbitration.
* **FR-01.2 [RECOMMENDED]: Bureau Administrator (Bureau Head / Advisor / Director):** Authority over their specific bureau's queue, case assignment to desk officers, inter-bureau transfer authorization (accept/reject), and joint hearing sanction.
* **FR-01.3 [RECOMMENDED]: Bureau Officer (Senior Scrutiny Officer):** Bureau-level read/write access to examine complaints, request inter-bureau transfers, draft inquiry findings, and flag duplicates.
* **FR-01.4 [RECOMMENDED]: Case Officer (Desk / Inquiry Officer):** Assigned-case scope. Responsible for day-to-day inquiry, evidence uploads, hearing notices, and status updates for cases assigned to their desk.
* **FR-01.5 [RECOMMENDED]: Read-Only Auditor (Vigilance / Quality Reviewer):** Council-wide read-only access for compliance auditing, SLA reporting, and forensic review without data modification privileges.

### FR-02: Institution Registry and Identification
* **FR-02.1 [MANDATORY - PS 26264]: Unique AICTE Permanent ID Mapping:** Every complaint must strictly map to an authoritative AICTE Permanent Institute ID (e.g., `1-10293847`).
* **FR-02.2 [MANDATORY - PS 26264]: Consolidated Institutional Profile:** System must compile an institutional dossier indexing:
  * Official Name, Approval Status (Approved, Under Scrutiny, Show Cause, Withdrawn, Probation), Institution Category (Govt, Govt-Aided, Private-Self-Financed, Deemed University).
  * State, District, and AICTE Regional Office (Northern, North-West, Eastern, Western, Southern, South-West, Central).
  * Lifetime complaint counter, active inquiry counter, and disposed case counter.
* **FR-02.3 [RECOMMENDED]: Multi-Bureau History Timeline:** Interactive visual timeline showing every past and present case registered against the institution across all cells.

### FR-03: Complaint Registration, Lifecycle, and State Transitions
* **FR-03.1 [MANDATORY - PS 26264]: Unified Single-Window Intake:** Intake portal for registering complaints across all bureaus with structured categorization:
  * Categories: Fee Extortion, Faculty Salary Withheld, Infrastructure Deficit, Unapproved Courses, Harassment, Admission Fraud, Fake Faculty / Documents, Recognition Dispute.
  * Complainant Particulars: Name, category (Student, Faculty, Parent, Citizen, Anonymous), contact information, and detailed allegations.
* **FR-03.2 [RECOMMENDED]: Standard Case Tracking Numbering:** System automatically generates tracking identifiers following the pattern: `AICTE/{BUREAU_ACRONYM}/{YEAR}/{SEQUENCE:04d}` (e.g. `AICTE/PGRC/2026/0042`).
* **FR-03.3 [MANDATORY - PS 26264]: Complaint Lifecycle States:**
  1. `LODGED`: Formally recorded in intake queue; awaiting preliminary scrutiny.
  2. `SCRUTINY_PENDING`: Preliminary document verification underway.
  3. `UNDER_INQUIRY`: Formal inquiry initiated; communications issued to institution.
  4. `SHOW_CAUSE_ISSUED`: Formal regulatory show-cause notice served.
  5. `HEARING_SCHEDULED`: Formal hearing fixed (standing committee or joint bureau).
  6. `RESOLVED`: Substantive grievance resolved (compliance obtained or corrective action verified).
  7. `DISPOSED`: Case formally closed by competent authority with official closure order.
  8. `TRANSFERRED`: Case custody formally transferred to another bureau.
  9. `ESCALATED`: Case escalated to Vigilance, Legal, or Council Leadership.
* **FR-03.4 [MANDATORY - PS 26264]: Controlled State Transitions:** Status cannot transition arbitrarily. Every transition requires mandatory notes and records actor identity, timestamp, and state diff. Closures (`RESOLVED`, `DISPOSED`) require an Official Disposal Summary.

### FR-04: Cross-Bureau Overlap Detection & Explainable Related-Case Linking
* **FR-04.1 [MANDATORY - PS 26264]: Live Master Conflict Radar:** System must automatically detect when two or more distinct bureaus maintain active (non-disposed) cases against the same technical institution.
* **FR-04.2 [MANDATORY - PS 26264]: Multi-Bureau Collision Alerts:** Prominently flag conflicting institutions on executive and bureau dashboards with explicit identification of all involved bureaus.
* **FR-04.3 [RECOMMENDED]: Explainable NLP Semantic Similarity Matching:**
  * Uses vectorization and narrative token matching (TF-IDF cosine similarity + weighted metadata heuristics) to detect duplicate or closely related allegations.
  * Generates an **Explainable Attribution Breakdown** displaying:
    * Composite match score (0–100%).
    * Narrative cosine similarity score.
    * Exact category match indicator.
    * Exact institution match indicator.
    * Shared salient keywords list.
    * Natural language justification rationale.
* **FR-04.4 [RECOMMENDED - RULE 14]: Human-in-the-Loop Governance:** AI matching results are strictly advisory. The system is prohibited from automatically merging cases, modifying legal status, or taking punitive action based solely on AI output. Linking requires explicit officer verification.

### FR-05: Inter-Bureau Coordination Decisions & Follow-up Ownership
* **FR-05.1 [MANDATORY - PS 26264]: Inter-Departmental File Transfer Workflow:**
  * Bureau Officer initiates a transfer request specifying target bureau and factual justification.
  * Bureau Head or Super Admin of the target bureau reviews and explicitly `ACCEPTS` or `REJECTS` the transfer with documented reasons.
  * Upon acceptance, case custody updates atomically, and the originating bureau is designated as an observer.
* **FR-05.2 [RECOMMENDED]: Co-Handling & Lead Bureau Designation:**
  * When multi-bureau collisions occur, Council Leadership or Bureau Heads can designate a **Lead Bureau** (e.g. Regulation Bureau) while secondary cells (e.g. PGRC) co-handle specific aspects.
  * Centralized coordination notes accessible across involved bureaus.

### FR-06: Pending-Case Monitoring, Ageing, Deadlines, and Escalation
* **FR-06.1 [MANDATORY - PS 26264]: Real-Time Case Ageing & SLA Tracking:**
  * System tracks case duration against the Citizen's Charter standard deadline (configurable default: 30 calendar days).
  * Ageing Tiers:
    * Tier 1 (0–15 Days): `🟢 On Track`
    * Tier 2 (16–23 Days): `🟡 Normal Scrutiny`
    * Tier 3 (24–30 Days): `🟠 Approaching Deadline (Urgent Alert)`
    * Tier 4 (> 30 Days): `🚨 Overdue (SLA Breached)`
* **FR-06.2 [MANDATORY - PS 26264]: Automated Deadline Alerts & Escalation Triggers:**
  * Automated notifications dispatched to Desk Officers at 24 days.
  * Escalation alerts dispatched to Bureau Administrator and Super Admin upon day 31.

### FR-07: Dashboards, Search, Filters, and Management Reports
* **FR-07.1 [MANDATORY - PS 26264]: Cross-Bureau Analytical Dashboard:**
  * Executive KPIs: Total complaints, active load, multi-bureau overlaps, overdue breach counter, disposal rate.
  * Bureau Performance Matrix: Total cases, active inquiry load, resolved cases, overdue count, average resolution duration in days.
  * Regional Breakdown: Complaint density and overlap frequency across AICTE regions.
  * High-Risk Hotspot Radar: Top institutions ranked by active complaint volume and multi-bureau collision flags.
* **FR-07.2 [MANDATORY - PS 26264]: Multi-Facet Search & Filtering:**
  * Full-text search by Complaint Tracking ID, Institution Name, AICTE Permanent ID, and Complainant Name.
  * Multi-facet filtering by Bureau, Status, Priority, Grievance Category, and SLA Overdue flag.
* **FR-07.3 [RECOMMENDED]: Management Export Formats:** Export capability for filtered reports into standard tabular (CSV/Excel) and executive dossier views.

### FR-08: Evidence and Attachment Handling
* **FR-08.1 [RECOMMENDED]: Secure Document Vault:**
  * Support supporting verification documents: PDF, DOCX, PNG, JPG.
  * Strict validation of MIME types, file extensions, and maximum file size limits (configurable default: 15 MB).
  * Storage path isolation with unique collision-free naming hashes.
* **FR-08.2 [RECOMMENDED]: Integrity & Anti-Tamper:**
  * Compute and log cryptographic SHA-256 digest upon upload.
  * Prevent overwriting or in-place file mutation; revisions are stored as appended audit attachments.

### FR-09: Notifications and Complete Action History
* **FR-09.1 [MANDATORY - PS 26264]: Event-Driven In-App Alerts:**
  * Real-time notification drawer displaying: Cross-Bureau Collision Alerts, SLA Deadline Warnings, Transfer Requests, and Case Assignments.
* **FR-09.2 [MANDATORY - PS 26264]: Complete Immutable Action History:**
  * Every operational action is recorded in an immutable, append-only regulatory audit ledger.
  * Mandatory audit attributes: Event ID, Complaint ID, Institution ID, Actor ID, Actor Full Name, Actor Role, Actor Bureau, Action Type, Detailed Narrative, Pre-state, Post-state, and Timestamp.

### FR-10: Authentication, Authorization, Privacy, and Data Protection
* **FR-10.1 [RECOMMENDED]: Authentication:** Industry-standard JWT access tokens with bcrypt password hashing (minimum work factor 12).
* **FR-10.2 [MANDATORY - PS 26264]: Bureau-Scoped Authorization:** Backend enforcement of role and bureau boundaries on all API routes; UI button hiding is non-authoritative.
* **FR-10.3 [RECOMMENDED]: Complainant Privacy & PII Protection:**
  * Student/faculty sensitive identifiers (phone, personal email) are restricted to authorized scrutiny officers.
  * Support anonymous whistleblower protections where complainant identity is redacted from institutional notices.

---

## 4. Non-Functional Requirements (NFR)

* **NFR-01 (Performance):** Dashboard overview and conflict radar API queries must execute in < 250ms for databases with up to 50,000 active records.
* **NFR-02 (Data Consistency & Relational Integrity):** All status transitions, file transfers, and case linkages must execute inside strict transactional boundaries (`BEGIN ... COMMIT`) with rollback on error.
* **NFR-03 (Auditability):** Audit logs cannot be updated or deleted via application APIs (`DELETE` and `UPDATE` operations disabled on audit tables).
* **NFR-04 (Configurability):** SLA deadlines, regional boundaries, allowed attachment types, and similarity thresholds must be configurable via environment variables or central configuration without modifying core business logic.
* **NFR-05 (Accessibility & Usability):** Responsive design supporting desktop, tablet, and mobile layouts with accessible color contrast and native light/dark mode support.
