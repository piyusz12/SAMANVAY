# SAMANVAY (समन्वय) — Acceptance Criteria & Verification Matrix
## SIH PS 26264: Integrated Dashboard for Monitoring and Tracking Institution Complaint Cases

---

## 1. Traceability & Requirements-to-Phase Mapping Matrix

| Req ID | Mandatory / Recommended | Feature Scope | Verification Method | Planned Phase | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **AC-01** | Mandatory (PS 26264) | Consolidated Institution-Centric View | Pytest + E2E Browser Subagent | Phase 01 | **Verified** |
| **AC-02** | Mandatory (PS 26264) | Bureau Tracking & File Custody Identification | Pytest (`test_complaints.py`) | Phase 01 | **Verified** |
| **AC-03** | Mandatory (PS 26264) | Cross-Bureau Conflict & Overlap Radar | Pytest (`test_conflicts.py`) | Phase 01 | **Verified** |
| **AC-04** | Mandatory (PS 26264) | Full Lifecycle Tracking & State Transitions | Pytest (`test_complaints.py`) | Phase 01 | **Verified** |
| **AC-05** | Mandatory (PS 26264) | 30-Day Citizen's Charter SLA Ageing & Alerts | Pytest (`test_analytics.py`) | Phase 01 | **Verified** |
| **AC-06** | Mandatory (PS 26264) | Inter-Departmental File Transfer Workflow | Pytest (`test_movements.py`) | Phase 01 | **Verified** |
| **AC-07** | Mandatory (PS 26264) | Cross-Bureau Analytics & Regional Reports | Pytest (`test_analytics.py`) | Phase 01 | **Verified** |
| **AC-08** | Recommended (Rule 14) | Explainable AI Semantic Similarity & Linkage | Pytest (`test_similarity.py`) | Phase 01 | **Verified** |
| **AC-09** | Recommended (Rule 07) | Immutable Regulatory Audit Ledger | Pytest (`test_analytics.py`) | Phase 01 | **Verified** |
| **AC-10** | Recommended (Rule 10) | Bureau-Scoped RBAC & Token Auth | Pytest (`test_auth.py`) | Phase 01 | **Verified** |

---

## 2. Testable Acceptance Criteria (Gherkin Scenarios)

### AC-01: Consolidated Institution-Centric Dossier (360° Profile)
```gherkin
Scenario: Authorized official retrieves an institution's unified cross-bureau dossier
  Given the database contains institution "Apex Institute of Engineering" with AICTE ID "1-10293847"
  And active complaints exist for this institution under both "PGRC" and "REGULATION_BUREAU"
  When the user queries "GET /api/v1/institutions/{id}/dossier"
  Then the response status code must be 200 OK
  And the response payload must contain the institution's official metadata
  And the "bureaus_involved" array must list both "PGRC" and "REGULATION_BUREAU"
  And the "conflict_alert.has_conflict" flag must be true
  And the response must include a chronological array of all recent complaints
```

### AC-02: Live Bureau Tracking & File Custody
```gherkin
Scenario: Tracking the specific bureau and desk officer managing an inquiry
  Given a complaint registered with tracking number "AICTE/PGRC/2026/0001"
  When an authorized Bureau Head assigns officer with ID 6 to this complaint
  Then the complaint record must update "assigned_officer_id" to 6
  And "assigned_officer_name" must reflect the officer's full name
  And the complaint status must automatically advance to "UNDER_INQUIRY" if previously "LODGED"
  And an immutable audit log entry of type "OFFICER_ASSIGNED" must be recorded
```

### AC-03: Cross-Bureau Conflict & Overlap Radar
```gherkin
Scenario: Automated detection of concurrent multi-departmental actions on an institution
  Given an institution has active complaints in Regulation Bureau and Legal Cell
  When any authorized official navigates to "GET /api/v1/conflicts/overlapping"
  Then the response must return all institutions with active complaints in 2 or more distinct bureaus
  And the payload must include the specific conflicting cases side-by-side
  And the top dashboard banner must prominently warn of multi-bureau collisions
```

### AC-04: Complaint Lifecycle & Controlled State Transitions
```gherkin
Scenario: Formal status transition from UNDER_INQUIRY to SHOW_CAUSE_ISSUED
  Given a complaint exists with status "UNDER_INQUIRY"
  When a Bureau Officer sends "PATCH /api/v1/complaints/{id}/status" with:
    | status | SHOW_CAUSE_ISSUED |
    | notes  | Notice served under Approval Process Handbook 2026-27 |
  Then the response status code must be 200 OK
  And the complaint's "status" must be updated to "SHOW_CAUSE_ISSUED"
  And the complaint's "internal_notes" must append the timestamped inquiry note
  And an audit log entry must record previous_state "UNDER_INQUIRY" and new_state "SHOW_CAUSE_ISSUED"
```

```gherkin
Scenario: Closing a case requires mandatory official disposal summary
  Given a complaint exists with status "HEARING_SCHEDULED"
  When a Bureau Administrator sets status to "RESOLVED" without a resolution summary
  Then the system must reject the operation with HTTP 422 Unprocessable Entity
  When the Bureau Administrator resubmits with an official resolution summary
  Then the complaint status must update to "RESOLVED"
  And "disposed_at" must be populated with the current UTC timestamp
```

### AC-05: 30-Day Citizen's Charter SLA Ageing & Overdue Tracking
```gherkin
Scenario: Calculation of case ageing and overdue SLA flags
  Given a complaint registered 35 days ago with an SLA deadline of 30 days
  When the complaint is fetched via "GET /api/v1/complaints/{id}"
  Then "days_open" must equal 35
  And "is_overdue" must be true
  And "sla_status" must equal "OVERDUE"
  And the UI badge must display with the red danger alert style
```

```gherkin
Scenario: Approaching deadline warning window
  Given a complaint registered 25 days ago with an SLA deadline of 30 days
  When the complaint is fetched via "GET /api/v1/complaints/{id}"
  Then "days_open" must equal 25
  And "is_overdue" must be false
  And "sla_status" must equal "APPROACHING_DEADLINE"
  And the UI badge must display with the amber warning style
```

### AC-06: Inter-Departmental File Transfer Workflow
```gherkin
Scenario: Full inter-bureau transfer request and authorization lifecycle
  Given a complaint currently assigned to "PGRC"
  When an officer submits "POST /api/v1/movements/complaint/{id}" targeting "VIGILANCE_CELL"
  Then a new CaseMovement record is created with status "PENDING_APPROVAL"
  And an audit log entry of type "TRANSFER_REQUESTED" is recorded
  When the Bureau Head of "VIGILANCE_CELL" approves the transfer via "PATCH /movements/{id}/decide"
  Then the movement status updates to "ACCEPTED"
  And the complaint's "bureau" field atomically updates to "VIGILANCE_CELL"
  And the complaint's "status" updates to "TRANSFERRED"
```

### AC-07: Explainable AI Similarity & Deduplication (Rule 14)
```gherkin
Scenario: Semantic similarity check produces explainable attribution breakdown
  Given an existing complaint alleging withholding of degree certificates for capitation fees
  When a new complaint narrative with matching allegations is submitted to "POST /api/v1/similarity/check"
  Then the response must return candidate matches with a composite score between 0.0 and 1.0
  And each match must include an "explanation" object containing:
    | overall_score         | Float (0.0 to 1.0) |
    | text_similarity_score | Float (0.0 to 1.0) |
    | category_match        | Boolean            |
    | institution_match     | Boolean            |
    | shared_keywords       | Array of strings   |
    | rationale             | String             |
  And the system MUST NOT automatically merge or mutate any existing complaint records
```

### AC-08: Bureau-Scoped Authorization & Non-Repudiation Audit
```gherkin
Scenario: Unauthorized role attempting administrative assignment
  Given an authenticated user with role "CASE_OFFICER"
  When the user sends "PATCH /api/v1/complaints/{id}/assign"
  Then the API must reject the request with HTTP 403 Forbidden
  And no assignment changes or audit events may be persisted
```

---

## 3. Assumptions & Resolved Contradictions

1. **Procedural Deadlines Assumption:** While official AICTE citizen charters prescribe general grievance disposal targets (nominally 30 calendar days), statutory show-cause notices or legal cell court proceedings may have distinct judicial timelines. Therefore, `sla_deadline_days` is parameterized per complaint (default 30 days) and fully configurable per case.
2. **AI Autonomy Assumption:** Under mandatory Rule 14, automated natural-language deduplication cannot make regulatory decisions or automatically dismiss cases. All AI linkage outputs are treated as `PROPOSED_BY_AI` until explicitly accepted or dismissed by a human scrutiny officer.
3. **Synthetic Demonstration Data (Rule 9):** No real-world AICTE credentials or official private institutional dispute records are stored in this codebase. All seeded demonstration institutions and grievances are explicitly marked with `[SYNTHETIC]`.
