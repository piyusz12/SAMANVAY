# SAMANVAY (समन्वय) — API Contract Outline Specification
## Integrated Dashboard for Monitoring and Tracking Institution Complaint Cases

---

## 1. Global API Standards

* **Base URL:** `/api/v1`
* **Protocol:** HTTPS / JSON
* **Authentication Scheme:** Bearer HTTP Authorization Header (`Authorization: Bearer <JWT>`)
* **Standard Error Envelope (RFC 7807):**
```json
{
  "detail": "Descriptive human-readable error explanation",
  "status_code": 400,
  "error_code": "RESOURCE_CONFLICT_ERROR",
  "timestamp": "2026-10-26T17:40:00Z"
}
```

---

## 2. Authentication Endpoints

### 2.1 Authenticate User Session
* **Route:** `POST /api/v1/auth/login`
* **Auth Required:** None (Public)
* **Request Body:**
```json
{
  "email": "head.rb@samanvay.aicte.gov.in",
  "password": "Demo@AICTE2026!"
}
```
* **Success Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": 2,
    "email": "head.rb@samanvay.aicte.gov.in",
    "full_name": "Prof. Anita Desai [SYNTHETIC]",
    "role": "BUREAU_HEAD",
    "bureau": "REGULATION_BUREAU",
    "designation": "Advisor & Head, Regulation Bureau",
    "phone": "+91 11 2958 1020",
    "is_active": true
  }
}
```

### 2.2 Retrieve Current User Profile
* **Route:** `GET /api/v1/auth/me`
* **Auth Required:** Any valid Bearer JWT
* **Success Response (200 OK):** `UserOut` schema matching user object above.

---

## 3. Institution Registry & 360° Dossier Endpoints

### 3.1 List Institutions with Faceted Filter
* **Route:** `GET /api/v1/institutions`
* **Query Parameters:**
  * `search` (string, optional): Matches institution name, AICTE ID, or city.
  * `region` (string, optional): AICTE Regional Office (`Northern`, `Western`, `Southern`, etc.).
  * `state` (string, optional): Filter by state / union territory.
* **Success Response (200 OK):** Array of `InstitutionOut` items.

### 3.2 Institution 360° Comprehensive Dossier
* **Route:** `GET /api/v1/institutions/{institution_id}/dossier`
* **Path Parameter:** `institution_id` (integer)
* **Success Response (200 OK):**
```json
{
  "institution": {
    "id": 1,
    "aicte_id": "1-10293847",
    "name": "Apex Institute of Engineering & Technology [SYNTHETIC]",
    "state": "Maharashtra",
    "city": "Pune",
    "region": "Western",
    "institution_type": "Private-Self-Financed",
    "approval_status": "SHOW_CAUSE_NOTICE",
    "address": "Survey 42, Hinjawadi Phase 2, Pune",
    "contact_email": "registrar@apex-tech-synthetic.edu.in",
    "contact_phone": "+91 20 2293 8470",
    "created_at": "2026-10-26T17:00:00Z",
    "updated_at": "2026-10-26T17:00:00Z"
  },
  "total_complaints": 3,
  "active_complaints": 3,
  "disposed_complaints": 0,
  "bureaus_involved": ["PGRC", "REGULATION_BUREAU", "LEGAL_CELL"],
  "conflict_alert": {
    "has_conflict": true,
    "bureaus_involved": ["PGRC", "REGULATION_BUREAU", "LEGAL_CELL"],
    "active_cases_count": 3,
    "message": "CROSS-BUREAU OVERLAP DETECTED: 3 bureaus are concurrently investigating cases against Apex Institute."
  },
  "recent_complaints": [
    {
      "id": 1,
      "complaint_no": "AICTE/PGRC/2026/0001",
      "bureau": "PGRC",
      "subject": "Withholding original B.Tech degree certificates...",
      "category": "FEE_EXTORTION",
      "status": "UNDER_INQUIRY",
      "priority": "HIGH",
      "days_open": 12,
      "is_overdue": false,
      "sla_status": "ON_TRACK",
      "assigned_officer_name": "Pooja Hegde [SYNTHETIC]",
      "created_at": "2026-10-14T17:00:00Z"
    }
  ]
}
```

---

## 4. Complaint Management Endpoints

### 4.1 Query Complaint Repository
* **Route:** `GET /api/v1/complaints`
* **Query Parameters:**
  * `page` (int, default: 1), `page_size` (int, default: 20, max: 100)
  * `bureau` (string): Filter by handling bureau
  * `status` (string): Filter by lifecycle state
  * `priority` (string): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
  * `institution_id` (int): Restrict to specific institution
  * `is_overdue` (bool): Filter by SLA deadline breach
  * `search` (string): Full-text query on subject, tracking ID, complainant, or institution
* **Success Response (200 OK):**
```json
{
  "total": 42,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "complaint_no": "AICTE/PGRC/2026/0001",
      "institution_id": 1,
      "institution_name": "Apex Institute of Engineering [SYNTHETIC]",
      "institution_aicte_id": "1-10293847",
      "bureau": "PGRC",
      "complainant_name": "Aarav Sharma [SYNTHETIC]",
      "complainant_category": "STUDENT",
      "complainant_email": "aarav.student@synthetic.in",
      "subject": "Withholding original degree certificates...",
      "description": "Full complaint narrative particulars...",
      "category": "FEE_EXTORTION",
      "status": "UNDER_INQUIRY",
      "priority": "HIGH",
      "sla_deadline_days": 30,
      "days_open": 12,
      "is_overdue": false,
      "sla_status": "ON_TRACK",
      "assigned_officer_id": 7,
      "assigned_officer_name": "Pooja Hegde [SYNTHETIC]",
      "internal_notes": "Notice issued to Registrar.",
      "evidence_file_name": null,
      "resolution_summary": null,
      "created_at": "2026-10-14T17:00:00Z",
      "updated_at": "2026-10-16T17:00:00Z",
      "disposed_at": null
    }
  ]
}
```

### 4.2 Lodge New Complaint
* **Route:** `POST /api/v1/complaints`
* **Status Code:** `201 Created`
* **Request Body:**
```json
{
  "institution_id": 1,
  "bureau": "PGRC",
  "complainant_name": "Rahul Verma",
  "complainant_category": "STUDENT",
  "complainant_email": "rahul@student.in",
  "subject": "Charging non-refundable library caution fee",
  "description": "Detailed grievance narrative...",
  "category": "FEE_EXTORTION",
  "priority": "MEDIUM",
  "sla_deadline_days": 30,
  "internal_notes": "Intake portal submission"
}
```

### 4.3 Transition Lifecycle State
* **Route:** `PATCH /api/v1/complaints/{complaint_id}/status`
* **Auth Required:** Authenticated Officer / Bureau Admin
* **Request Body:**
```json
{
  "status": "RESOLVED",
  "notes": "Verified compliance with fee refund norms.",
  "resolution_summary": "Institution released certificates and refunded excess deposit."
}
```

### 4.4 Assign Case Officer
* **Route:** `PATCH /api/v1/complaints/{complaint_id}/assign`
* **Auth Required:** `BUREAU_HEAD` or `SUPER_ADMIN`
* **Request Body:**
```json
{
  "officer_id": 6
}
```

### 4.5 Upload Evidence Document
* **Route:** `POST /api/v1/complaints/{complaint_id}/upload`
* **Content-Type:** `multipart/form-data`
* **Form Field:** `file` (binary stream, allowed types: `.pdf`, `.docx`, `.png`, `.jpg`, max 15MB)
* **Success Response (200 OK):**
```json
{
  "filename": "complaint_1_1761502400_audit_report.pdf",
  "status": "Uploaded successfully"
}
```

---

## 5. Master Conflict Radar Endpoints

### 5.1 Query All Active Cross-Bureau Overlaps
* **Route:** `GET /api/v1/conflicts/overlapping`
* **Auth Required:** Any authenticated role / Auditor
* **Success Response (200 OK):**
```json
[
  {
    "institution_id": 1,
    "institution_name": "Apex Institute of Engineering & Technology [SYNTHETIC]",
    "aicte_id": "1-10293847",
    "state": "Maharashtra",
    "region": "Western",
    "bureaus_involved": ["PGRC", "REGULATION_BUREAU", "LEGAL_CELL"],
    "active_cases_count": 3,
    "cases": [
      {
        "id": 1,
        "complaint_no": "AICTE/PGRC/2026/0001",
        "bureau": "PGRC",
        "subject": "Withholding original certificates...",
        "status": "UNDER_INQUIRY",
        "priority": "HIGH",
        "created_at": "2026-10-14T17:00:00Z"
      },
      {
        "id": 2,
        "complaint_no": "AICTE/RB/2026/0002",
        "bureau": "REGULATION_BUREAU",
        "subject": "Severe deficit in faculty cadre ratio...",
        "status": "SHOW_CAUSE_ISSUED",
        "priority": "HIGH",
        "created_at": "2026-10-04T17:00:00Z"
      }
    ]
  }
]
```

---

## 6. Explainable AI Similarity & Linkage Endpoints

### 6.1 Check Explainable Similarity
* **Route:** `POST /api/v1/similarity/check`
* **Request Body:**
```json
{
  "institution_id": 1,
  "subject": "Charging non-refundable library caution fee and withholding degrees",
  "description": "Graduating batch not released degrees until caution fee cleared.",
  "category": "FEE_EXTORTION",
  "exclude_complaint_id": null
}
```
* **Success Response (200 OK):**
```json
{
  "matches": [
    {
      "complaint_id": 1,
      "complaint_no": "AICTE/PGRC/2026/0001",
      "institution_id": 1,
      "institution_name": "Apex Institute of Engineering [SYNTHETIC]",
      "bureau": "PGRC",
      "status": "UNDER_INQUIRY",
      "subject": "Withholding original B.Tech degree certificates...",
      "category": "FEE_EXTORTION",
      "similarity_score": 0.885,
      "explanation": {
        "overall_score": 0.885,
        "text_similarity_score": 0.810,
        "category_match": true,
        "institution_match": true,
        "shared_keywords": ["certificates", "degree", "withholding", "fee"],
        "rationale": "High match (88.5%): Identical institution (Apex Institute), matching category (FEE_EXTORTION), and 81% semantic overlap highlighting certificate retention."
      }
    }
  ],
  "highest_score": 0.885,
  "duplicate_suspected": true,
  "cross_bureau_overlap_suspected": false
}
```

### 6.2 Confirm Case Linkage (Human-in-the-Loop)
* **Route:** `POST /api/v1/similarity/link`
* **Auth Required:** Case Officer / Bureau Admin
* **Request Body:**
```json
{
  "source_complaint_id": 1,
  "target_complaint_id": 4,
  "link_type": "RELATED_INQUIRY",
  "similarity_score": 0.885,
  "explanation": { "rationale": "Shared financial extortion allegation" },
  "notes": "Verified by Scrutiny Desk Officer for coordinated review."
}
```

---

## 7. Inter-Bureau Movement & Transfer Endpoints

### 7.1 Request Case Transfer
* **Route:** `POST /api/v1/movements/complaint/{complaint_id}`
* **Request Body:**
```json
{
  "to_bureau": "VIGILANCE_CELL",
  "movement_type": "TRANSFER_REQUEST",
  "reason": "Affidavit indicates forged faculty Aadhaar documentation."
}
```

### 7.2 Authorize / Decide Transfer
* **Route:** `PATCH /api/v1/movements/{movement_id}/decide`
* **Auth Required:** Target `BUREAU_HEAD` or `SUPER_ADMIN`
* **Request Body:**
```json
{
  "decision": "ACCEPTED",
  "notes": "Approved for formal vigilance inquiry."
}
```

---

## 8. Analytics & Audit Log Endpoints

### 8.1 Executive Council Overview
* **Route:** `GET /api/v1/analytics/overview`
* **Success Response (200 OK):** `DashboardOverviewOut` with total complaint counts, active load, multi-bureau collisions, bureau-wise performance matrices, regional distribution, and hotspot radar.

### 8.2 Query Immutable Regulatory Audit Ledger
* **Route:** `GET /api/v1/audit/logs`
* **Query Parameters:** `complaint_id` (optional), `institution_id` (optional), `limit` (default 50)
* **Success Response (200 OK):** Array of `AuditLogOut` items.
