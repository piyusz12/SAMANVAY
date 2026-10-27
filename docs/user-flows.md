# SAMANVAY (समन्वय) — End-to-End User Flows Document
## Integrated Dashboard for Monitoring and Tracking Institution Complaint Cases

---

## 1. Flow 1: Complaint Registration with Live Duplicate Pre-Check

### Objective
Allow a complainant, student, faculty member, or intake officer to register a complaint while automatically checking for existing identical or overlapping complaints before submission to prevent redundant files.

```mermaid
flowchart TD
    Start([User Opens Lodge Complaint]) --> SelectInst[Select Institution by AICTE Permanent ID]
    SelectInst --> InputText[Enter Grievance Subject & Description]
    InputText --> DebounceCheck{Text Length >= 5 Chars?}
    
    DebounceCheck -- Yes --> RunSim[Async NLP Similarity Pre-Check]
    DebounceCheck -- No --> ContinueInput[Continue Typing]
    
    RunSim --> HasMatch{Composite Score >= 50%?}
    HasMatch -- Yes --> ShowBanner[Display Potential Duplicate Warning Banner with Case IDs]
    HasMatch -- No --> ClearBanner[No Alert Displayed]
    
    ShowBanner --> ReviewExisting[User Reviews Candidate Existing Cases]
    ClearBanner --> FillRemaining[Fill Complainant Category, Priority, Notes]
    ReviewExisting --> FillRemaining
    
    FillRemaining --> ClickSubmit[Click 'Lodge Complaint & Initiate Tracking']
    ClickSubmit --> ValidateReq{All Mandatory Fields Valid?}
    ValidateReq -- No --> ShowErr[Show Validation Error]
    ValidateReq -- Yes --> SaveDB[(Insert Complaint: Status LODGED)]
    
    SaveDB --> GenNo[Generate Unique Number: AICTE/BUREAU/YEAR/SEQ]
    GenNo --> ScanRadar[Trigger Cross-Bureau Conflict Radar]
    ScanRadar --> WriteAudit[(Append Immutable Audit Log: CASE_LODGED)]
    WriteAudit --> Complete([Display Success Tracking Card & SLA Countdown])
```

---

## 2. Flow 2: Bureau Administrator Triage & Desk Officer Assignment

### Objective
Bureau Administrator (Head of Regulation Bureau, Director PGRC, etc.) reviews incoming complaints in their bureau queue and assigns responsibility to a specific Case Officer.

```mermaid
flowchart TD
    Start([Bureau Administrator Logs In]) --> SwitchBureau[Active Bureau Filter Set to Admin's Bureau]
    SwitchBureau --> OpenQueue[View Unassigned Complaints in Bureau Queue]
    OpenQueue --> SelectCase[Select Complaint Case Card]
    SelectCase --> OpenInspector[Open Case Inspector Drawer]
    
    OpenInspector --> CheckConflict{Is Multi-Bureau Conflict Alert Present?}
    CheckConflict -- Yes --> CheckRadar[Review Conflicting Bureaus on Master Radar]
    CheckConflict -- No --> PickOfficer[Select Active Desk Officer from Dropdown]
    CheckRadar --> PickOfficer
    
    PickOfficer --> ClickAssign[Click 'Assign Case Officer']
    ClickAssign --> UpdateDB[(Update assigned_officer_id, Status to UNDER_INQUIRY)]
    UpdateDB --> LogAudit[(Record Audit Log: OFFICER_ASSIGNED)]
    LogAudit --> NotifyOfficer[Send Notification Alert to Assigned Officer]
    NotifyOfficer --> Complete([Case moves to Officer's Active Queue])
```

---

## 3. Flow 3: Case Officer Inquiry, Evidence Upload & Status Transition

### Objective
Case Officer conducts inquiry, requests clarifications from the institution, uploads inspection/verification evidence, and transitions case through official regulatory lifecycle stages.

```mermaid
flowchart TD
    Start([Case Officer Views Assigned Queue]) --> OpenCase[Open Complaint Detail View]
    OpenCase --> CheckSLA[Check SLA Ageing Indicator: Days Open vs 30d Deadline]
    
    CheckSLA --> ActionType{Choose Action}
    
    ActionType -- Upload Verification Docs --> SelectFile[Select File: PDF / DOCX / Image <= 15MB]
    SelectFile --> ValidateExt{Allowed Extension?}
    ValidateExt -- No --> FileErr[Show File Type Error]
    ValidateExt -- Yes --> StoreVault[Save File with Hash in Secure Vault]
    StoreVault --> AuditDoc[(Audit Log: EVIDENCE_UPLOADED)]
    
    ActionType -- Issue Show Cause Notice --> SetShowCause[Select Status: SHOW_CAUSE_ISSUED]
    SetShowCause --> AddNotes[Enter Notice Particulars & Hearing Date]
    AddNotes --> CommitStatus[(Update Status & updated_at)]
    CommitStatus --> AuditStatus[(Audit Log: STATUS_CHANGED)]
    
    ActionType -- Final Disposal Order --> SetDisposed[Select Status: RESOLVED / DISPOSED]
    SetDisposed --> EnterSummary[Enter Mandatory Official Disposal Summary]
    EnterSummary --> CommitClosure[(Set Status, disposed_at = UTC NOW)]
    CommitClosure --> AuditClosure[(Audit Log: CASE_DISPOSED)]
    
    AuditDoc --> Complete([Dashboard Refreshes Real-Time])
    AuditStatus --> Complete
    AuditClosure --> Complete
```

---

## 4. Flow 4: Cross-Bureau Overlap Detection & Joint Resolution Conference

### Objective
Identify concurrent actions by multiple bureaus (e.g. PGRC and Regulation Bureau) on the same institution, alerting bureau heads to synchronize and avoid contradictory regulatory orders.

```mermaid
sequenceDiagram
    autonumber
    participant PGRC as PGRC (Public Grievance Cell)
    participant RB as Regulation Bureau
    participant Radar as Conflict Radar Engine
    participant System as SAMANVAY Core
    participant Leadership as Council Leadership / Bureau Heads

    PGRC->>System: Case 1 Lodged: Apex Institute (Fee Extortion)
    System->>Radar: Evaluate Institution ID (1-10293847)
    Note over Radar: Single Bureau Active -> Normal Status

    RB->>System: Case 2 Lodged: Apex Institute (Infrastructure Deficit)
    System->>Radar: Evaluate Institution ID (1-10293847)
    Radar->>Radar: Detect Active Cases in 2 Distinct Bureaus
    Radar->>System: Trigger Multi-Bureau Collision State

    System->>PGRC: Dispatch In-App Alert (Conflict with RB)
    System->>RB: Dispatch In-App Alert (Conflict with PGRC)
    System->>Leadership: Highlight Institution on Master Conflict Radar

    Leadership->>System: Open Institution 360° Comprehensive Dossier
    Note over Leadership: Review Concurrent Proceedings Side-by-Side
    Leadership->>System: Designate Lead Bureau (RB) & Schedule Joint Hearing
    System->>System: Append Coordination Directive to Audit Ledger
```

---

## 5. Flow 5: Inter-Bureau File Transfer & Co-Handling Workflow

### Objective
Transfer an institution's case file from one bureau to another (e.g. from PGRC to Vigilance Cell upon discovering forged documentation) with formal administrative authorization.

```mermaid
flowchart TD
    Start([Originating Officer opens Case]) --> ClickTransfer[Click 'Request Inter-Bureau Transfer']
    ClickTransfer --> SelectTarget[Select Target Bureau & Justification]
    SelectTarget --> SubmitReq[Submit Transfer Request]
    
    SubmitReq --> DB_Req[(Save CaseMovement: PENDING_APPROVAL)]
    DB_Req --> AuditReq[(Audit Log: TRANSFER_REQUESTED)]
    AuditReq --> AlertTarget[Alert Target Bureau Head]
    
    AlertTarget --> HeadReview([Target Bureau Head Reviews Transfer Queue])
    HeadReview --> Decision{Accept Transfer?}
    
    Decision -- Reject --> EnterRejReason[Enter Rejection Reason]
    EnterRejReason --> DB_Rej[(Set Movement Status: REJECTED)]
    DB_Rej --> AuditRej[(Audit Log: TRANSFER_REJECTED)]
    AuditRej --> OriginNotify[Originating Bureau Retains Custody]
    
    Decision -- Accept --> EnterAccNotes[Enter Acceptance Remarks]
    EnterAccNotes --> DB_Acc[(Atomic Transaction: Movement ACCEPTED, Complaint bureau updated)]
    DB_Acc --> AuditAcc[(Audit Log: TRANSFER_ACCEPTED with Bureau State Diff)]
    AuditAcc --> TargetAssign[Case Appears in Target Bureau Intake Queue]
    
    OriginNotify --> End([Process Completed])
    TargetAssign --> End
```

---

## 6. Flow 6: Explainable AI Similarity Matching & Human-in-the-Loop Review

### Objective
Ensure machine-learning similarity suggestions are transparent, explainable, and subject to formal human officer verification under Rule 14.

```mermaid
flowchart TD
    Start([Officer Selects Subject Complaint]) --> TriggerMatch[Run Explainable Similarity Matcher]
    TriggerMatch --> ExtractVec[Extract Text Tokens & Calculate TF-IDF Cosine Score]
    ExtractVec --> EvalMeta[Evaluate Institution Match + Category Match]
    EvalMeta --> CalcComp[Compute Weighted Composite Match Score]
    
    CalcComp --> GenExplanation[Generate Attribution Breakdown & Shared Keywords]
    GenExplanation --> DisplayCard[Display Match Cards with Confidence Gauges & Rationale]
    
    DisplayCard --> OfficerReview{Desk Officer Human Decision}
    
    OfficerReview -- Verified Duplicate --> ClickDupe[Click 'Confirm as Duplicate Case']
    ClickDupe --> EnterDupeNotes[Enter Regulatory Linkage Notes]
    EnterDupeNotes --> SaveDupeLink[(Save CaseLinkage: CONFIRMED_BY_OFFICER, Link: DUPLICATE)]
    SaveDupeLink --> AuditDupe[(Audit Log: LINK_CONFIRMED)]
    
    OfficerReview -- Related Inquiry --> ClickRel[Click 'Link as Related Inquiry']
    ClickRel --> EnterRelNotes[Enter Cross-Inquiry Joint Review Notes]
    EnterRelNotes --> SaveRelLink[(Save CaseLinkage: CONFIRMED_BY_OFFICER, Link: RELATED)]
    SaveRelLink --> AuditRel[(Audit Log: LINK_CONFIRMED)]
    
    OfficerReview -- False Positive --> ClickDismiss[Click 'Dismiss AI Proposal']
    ClickDismiss --> SaveDismiss[(Save CaseLinkage: DISMISSED)]
    SaveDismiss --> AuditDismiss[(Audit Log: LINK_DISMISSED)]
    
    AuditDupe --> Finish([Linkage Visible in 360° Institutional Dossier])
    AuditRel --> Finish
    AuditDismiss --> Finish
```

---

## 7. Flow 7: Read-Only Auditor Forensic Inspection & Regulatory Reporting

### Objective
Allow internal auditors, compliance inspectors, and council leadership to examine the complete immutable timeline and export reports without risk of mutating regulatory data.

```mermaid
flowchart TD
    Start([Auditor Logs in with Read-Only Role]) --> ViewKPI[Inspect Global KPI Overview & Disposal Velocity]
    ViewKPI --> FilterRep[Apply Filters: Regional Office, Overdue SLA, Bureau]
    FilterRep --> OpenAudit[Access Immutable Audit Trail Log]
    OpenAudit --> InspectDiff[Examine State Diffs, User Identity, and Timestamps]
    InspectDiff --> VerifyIntegrity[Validate Non-Repudiation Audit Hashes]
    VerifyIntegrity --> ExportReport[Trigger Management Export CSV / PDF Dossier]
    ExportReport --> Finish([Report Generated for AICTE Executive Committee])
```
