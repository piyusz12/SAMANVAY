# SAMANVAY (समन्वय) — System Architecture Document
## SIH PS 26264: Integrated Dashboard for Monitoring and Tracking Institution Complaint Cases

---

## 1. Architectural Philosophy & Principles
SAMANVAY is built upon a **Modular Monolithic Clean Architecture** prioritizing:
1. **Single Source of Truth:** A unified relational database where every institution is indexed by its unique AICTE Permanent ID.
2. **Explicit Layer Separation:** Strict separation between Presentation (React SPA), API Gateway / Orchestration (FastAPI), Domain Logic / Services, and Persistence (SQLAlchemy + Alembic).
3. **Transactional Integrity:** State changes, case movements, and audit log generation occur within atomic transactions (`ACID`).
4. **Human-in-the-Loop Explainability:** All machine-learning/similarity suggestions are explainable with clear attribution breakdown, requiring human confirmation.
5. **Portability & Zero-External-Daemon Readiness:** Native dual-dialect database support (PostgreSQL in production environments, SQLite for rapid local verification and CI test suites).

---

## 2. High-Level Component Architecture

```mermaid
graph TB
    subgraph "Client Layer (Presentation Tier)"
        UI["React 19 SPA (Vite)"]
        CSS["Custom Vanilla Design System"]
        State["Client State & Persona Context"]
        API_Client["Typed API Service Client"]
        UI --> CSS
        UI --> State
        UI --> API_Client
    end

    subgraph "API & Orchestration Tier (FastAPI)"
        GW["FastAPI Core & CORS Router"]
        Auth_MW["JWT & RBAC Middleware"]
        
        subgraph "API Routers"
            R_Auth["/auth"]
            R_Inst["/institutions"]
            R_Comp["/complaints"]
            R_Conf["/conflicts"]
            R_Sim["/similarity"]
            R_Mov["/movements"]
            R_Ana["/analytics"]
            R_Aud["/audit"]
        end
        
        GW --> Auth_MW
        Auth_MW --> R_Auth
        Auth_MW --> R_Inst
        Auth_MW --> R_Comp
        Auth_MW --> R_Conf
        Auth_MW --> R_Sim
        Auth_MW --> R_Mov
        Auth_MW --> R_Ana
        Auth_MW --> R_Aud
    end

    subgraph "Domain Service Layer"
        S_Auth["Authentication & Crypto Service"]
        S_Comp["Complaint Lifecycle & SLA Engine"]
        S_Radar["Cross-Bureau Conflict Radar"]
        S_NLP["Explainable NLP Similarity Engine"]
        S_Move["Inter-Bureau Workflow Engine"]
        S_Audit["Immutable Regulatory Audit Service"]
        S_Seed["Synthetic Data Generator"]
    end

    subgraph "Data & Storage Tier"
        ORM["SQLAlchemy 2.0 ORM"]
        ALEMBIC["Alembic Migrations"]
        DB[("PostgreSQL / SQLite Storage")]
        VAULT["Evidence Document Vault (FS)"]
    end

    API_Client -- "HTTPS / JSON (Bearer JWT)" --> GW

    R_Auth --> S_Auth
    R_Comp --> S_Comp
    R_Conf --> S_Radar
    R_Sim --> S_NLP
    R_Mov --> S_Move
    R_Ana --> S_Comp
    R_Aud --> S_Audit

    S_Comp --> S_Radar
    S_Comp --> S_Audit
    S_Move --> S_Audit
    S_NLP --> S_Audit

    S_Comp --> ORM
    S_Radar --> ORM
    S_NLP --> ORM
    S_Move --> ORM
    S_Audit --> ORM
    S_Auth --> ORM

    ORM --> DB
    ALEMBIC --> DB
    R_Comp --> VAULT
```

---

## 3. Data Flow Architecture

### 3.1 Complaint Registration & Multi-Bureau Collision Detection Flow

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Bureau / Intake Officer
    participant Frontend as SPA Client
    participant API as /complaints API
    participant CompSvc as Complaint Service
    participant Radar as Conflict Radar Service
    participant Audit as Audit Service
    participant DB as Relational Database

    Officer->>Frontend: Fill Grievance Particulars & Institution ID
    Frontend->>API: POST /api/v1/complaints
    API->>CompSvc: create_complaint(data)
    CompSvc->>DB: Begin DB Transaction
    CompSvc->>DB: Insert Complaint (Status: LODGED)
    CompSvc->>Radar: trigger_conflict_notifications(complaint)
    Radar->>DB: Query Active Cases for Institution
    alt 2 or More Bureaus Active Concurrently
        Radar->>DB: Insert Conflict Alert Notification for Involved Bureau Heads
    end
    CompSvc->>Audit: log_audit_event("CASE_LODGED")
    Audit->>DB: Insert Immutable AuditLog
    CompSvc->>DB: Commit DB Transaction
    API-->>Frontend: HTTP 201 Created (with Tracking Number & SLA Deadline)
    Frontend-->>Officer: Display Case Card & Collision Status
```

### 3.2 Inter-Bureau File Transfer & Co-Handling Flow

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Originating Bureau Officer
    actor Receiver as Target Bureau Head
    participant API as Movements API
    participant MoveSvc as Workflow Service
    participant DB as Relational Database

    Sender->>API: POST /api/v1/movements/complaint/{id} (To Bureau, Reason)
    API->>MoveSvc: Request Transfer
    MoveSvc->>DB: Insert CaseMovement (Status: PENDING_APPROVAL)
    MoveSvc->>DB: Insert AuditLog ("TRANSFER_REQUESTED")
    API-->>Sender: Transfer Request Pending

    Receiver->>API: PATCH /api/v1/movements/{id}/decide (ACCEPTED / REJECTED)
    API->>MoveSvc: Decide Transfer
    alt Decision == ACCEPTED
        MoveSvc->>DB: Update CaseMovement Status to ACCEPTED
        MoveSvc->>DB: Update Complaint bureau = TargetBureau, status = TRANSFERRED
        MoveSvc->>DB: Insert AuditLog ("TRANSFER_DECIDED", OldBureau -> NewBureau)
    else Decision == REJECTED
        MoveSvc->>DB: Update CaseMovement Status to REJECTED
        MoveSvc->>DB: Insert AuditLog ("TRANSFER_REJECTED")
    end
    API-->>Receiver: HTTP 200 OK (Updated Movement Record)
```

---

## 4. Database Schema & Entity-Relationship Model

```mermaid
erDiagram
    INSTITUTIONS ||--o{ COMPLAINTS : "has"
    USERS ||--o{ COMPLAINTS : "assigned_to"
    COMPLAINTS ||--o{ CASE_MOVEMENTS : "tracks"
    COMPLAINTS ||--o{ CASE_LINKAGES : "source_of"
    COMPLAINTS ||--o{ CASE_LINKAGES : "target_of"
    COMPLAINTS ||--o{ AUDIT_LOGS : "logs"
    COMPLAINTS ||--o{ NOTIFICATIONS : "triggers"
    USERS ||--o{ CASE_MOVEMENTS : "requested_by"
    USERS ||--o{ CASE_MOVEMENTS : "decided_by"
    USERS ||--o{ AUDIT_LOGS : "acted_by"
    USERS ||--o{ NOTIFICATIONS : "receives"

    INSTITUTIONS {
        int id PK
        string aicte_id UK "Unique AICTE Permanent ID"
        string name "Institution Legal Name"
        string state "State / UT"
        string city "City"
        string region "AICTE Regional Office"
        string institution_type "Govt / Private / Deemed"
        string approval_status "APPROVED / SHOW_CAUSE"
        string address "Physical Address"
        string contact_email
        string contact_phone
        datetime created_at
        datetime updated_at
    }

    USERS {
        int id PK
        string email UK "Official AICTE Email"
        string hashed_password
        string full_name
        string role "SUPER_ADMIN / BUREAU_HEAD / CASE_OFFICER"
        string bureau "REGULATION / PGRC / LEGAL / VIGILANCE"
        string designation
        string phone
        boolean is_active
        datetime created_at
    }

    COMPLAINTS {
        int id PK
        string complaint_no UK "AICTE/{BUREAU}/{YEAR}/{SEQ}"
        int institution_id FK
        string bureau "Handling Bureau"
        string complainant_name
        string complainant_category "STUDENT / FACULTY / CITIZEN"
        string complainant_email
        string complainant_phone
        string subject
        text description
        string category "FEE_EXTORTION / SALARY / etc"
        string status "LODGED / UNDER_INQUIRY / RESOLVED"
        string priority "LOW / MEDIUM / HIGH / CRITICAL"
        int sla_deadline_days "Citizen Charter SLA (30d)"
        int assigned_officer_id FK
        string assigned_officer_name
        text internal_notes
        string evidence_file_name
        text resolution_summary
        datetime created_at
        datetime updated_at
        datetime disposed_at
    }

    CASE_MOVEMENTS {
        int id PK
        int complaint_id FK
        string from_bureau
        string to_bureau
        string movement_type "TRANSFER / CO_HANDLING"
        text reason
        string status "PENDING_APPROVAL / ACCEPTED / REJECTED"
        int requested_by_id FK
        int decided_by_id FK
        text decision_notes
        datetime created_at
        datetime decided_at
    }

    CASE_LINKAGES {
        int id PK
        int source_complaint_id FK
        int target_complaint_id FK
        string link_type "DUPLICATE / RELATED_INQUIRY"
        float similarity_score "0.0 to 1.0"
        text explanation_json "Feature attribution metadata"
        string status "PROPOSED_BY_AI / CONFIRMED / DISMISSED"
        int verified_by_id FK
        text verification_notes
        datetime created_at
        datetime updated_at
    }

    AUDIT_LOGS {
        int id PK
        int complaint_id FK
        int institution_id FK
        int actor_id FK
        string actor_name
        string actor_role
        string actor_bureau
        string action_type "CASE_LODGED / STATUS_UPDATE / etc"
        text description
        text previous_state
        text new_state
        datetime timestamp
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        string target_bureau
        int complaint_id FK
        int institution_id FK
        string alert_type "OVERLAP_ALERT / SLA_BREACH"
        string title
        text message
        boolean is_read
        datetime created_at
    }
```

---

## 5. Explainable AI Similarity & Deduplication Architecture

Under **Rule 14**, machine learning algorithms must operate strictly as explainable assistants under human-in-the-loop oversight.

### 5.1 Multi-Factor Scoring Formula
The composite matching engine combines vector semantic overlap with hard metadata heuristics:

$$\text{Composite Score} = (S_{\text{semantic}} \times 0.55) + (I_{\text{match}} \times 0.30) + (C_{\text{match}} \times 0.15)$$

Where:
* $S_{\text{semantic}} \in [0.0, 1.0]$: Cosine similarity of TF-IDF vectors generated from complaint narrative and subject text.
* $I_{\text{match}} \in \{0.0, 1.0\}$: Binary indicator whether both complaints concern the exact same AICTE Permanent ID.
* $C_{\text{match}} \in \{0.0, 1.0\}$: Binary indicator whether both complaints share the same regulatory grievance category.

### 5.2 Attribution Breakdown Structure
For every evaluated pair, the system generates an immutable explanation object:
```json
{
  "overall_score": 0.865,
  "text_similarity_score": 0.760,
  "category_match": true,
  "institution_match": true,
  "shared_keywords": ["certificates", "caution deposit", "withholding", "marksheet"],
  "rationale": "High match (86.5%): Identical institution (Apex Institute), matching category (FEE_EXTORTION), and 76% semantic overlap highlighting withholding of graduation marksheets until unapproved deposit paid."
}
```

---

## 6. Security, Threat Surface, and Audit Architecture
1. **Append-Only Immutable Audit Log:** Audit log table supports only `INSERT` and `SELECT` via the application layer. No `UPDATE` or `DELETE` methods exist in the service layer.
2. **Encrypted Credentials:** Passwords stored using native salted `bcrypt` hashes.
3. **Stateless JWT Claims:** Tokens contain user ID, expiration, and algorithm signature; permissions are verified dynamically from active DB records on each request.
4. **Document Storage Sandboxing:** Uploaded documents are saved with randomized collision-free hashes and extension validation, outside the web root.
