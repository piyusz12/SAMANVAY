from datetime import timedelta
from sqlalchemy.orm import Session
from backend.app.models.bureau import Bureau
from backend.app.models.bureau_membership import BureauMembership
from backend.app.models.complaint_category import ComplaintCategory
from backend.app.models.institution import Institution, normalize_name
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.models.case_assignment_history import CaseAssignmentHistory
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.case_movement import CaseMovement
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.evidence_attachment import EvidenceAttachment
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.audit_log import AuditLog
from backend.app.models.system_config import SystemConfig
from backend.app.services.auth_service import get_password_hash
from backend.app.core.datetime_util import utc_now
from backend.app.core.colleges_seed import NATIONAL_COLLEGES_SEED
from backend.app.config import settings

DEMO_PASSWORD_HASH = get_password_hash("Demo@AICTE2026!")

def seed_database(db: Session, force: bool = False):
    """
    Populates database with clearly labelled synthetic AICTE demonstration data.
    Strictly follows mandatory rule 9: all demonstration entities are explicitly synthetic.
    Only runs in development environment or when explicitly forced.
    """
    if settings.APP_ENV != "development" and not force:
        return

    if db.query(User).count() > 0:
        return  # Database already seeded

    now = utc_now()

    # 1. Seed AICTE Bureaus & Cells
    bureaus_data = [
        {"code": "CENTRAL_ADMIN", "name": "Central Administration & AICTE HQ", "description": "AICTE HQ Apex administrative council and monitoring cell", "default_sla_days": 15},
        {"code": "REGULATION_BUREAU", "name": "Regulation Bureau", "description": "Norms, standards, faculty cadres, and land/infrastructure compliance", "default_sla_days": 30},
        {"code": "PGRC", "name": "Public Grievance Redressal Cell", "description": "Citizen, student, faculty, and parent grievance resolution", "default_sla_days": 30},
        {"code": "APPROVAL_BUREAU", "name": "Approval Bureau", "description": "Extension of Approval (EoA), intake sanctions, unapproved courses", "default_sla_days": 30},
        {"code": "LEGAL_CELL", "name": "Legal Cell", "description": "Court notices, writ petitions, litigation defense, and legal opinions", "default_sla_days": 21},
        {"code": "VIGILANCE_CELL", "name": "Vigilance Cell", "description": "Anti-corruption, forensic audits, ghost faculty investigations", "default_sla_days": 45},
        {"code": "POLICY_BUREAU", "name": "Policy & Academic Bureau", "description": "Academic curricula, national education policy, curriculum standards", "default_sla_days": 30},
    ]

    bureau_map = {}
    for b in bureaus_data:
        b_obj = Bureau(**b, created_at=now, updated_at=now)
        db.add(b_obj)
        db.flush()
        bureau_map[b["code"]] = b_obj

    # 2. Seed Complaint Categories
    categories_data = [
        {"code": "FEE_EXTORTION", "name": "Fee Extortion & Caution Money Withholding", "default_bureau": "PGRC", "default_priority": "HIGH", "default_sla_days": 30},
        {"code": "FACULTY_SALARY_WITHHELD", "name": "Faculty Salary Non-Payment / Delayed Disbursement", "default_bureau": "PGRC", "default_priority": "HIGH", "default_sla_days": 30},
        {"code": "INFRASTRUCTURE_DEFICIT", "name": "Infrastructure Deficit & Safety Hazards", "default_bureau": "REGULATION_BUREAU", "default_priority": "MEDIUM", "default_sla_days": 30},
        {"code": "RECOGNITION_DISPUTE", "name": "Recognition & Court Litigation Disputes", "default_bureau": "LEGAL_CELL", "default_priority": "CRITICAL", "default_sla_days": 21},
        {"code": "FAKE_DEGREES_DOCUMENTS", "name": "Fraudulent Ghost Faculty & Fake Documents", "default_bureau": "VIGILANCE_CELL", "default_priority": "CRITICAL", "default_sla_days": 45},
        {"code": "UNAPPROVED_COURSES", "name": "Unapproved Programs / Excess Intake", "default_bureau": "APPROVAL_BUREAU", "default_priority": "HIGH", "default_sla_days": 30},
        {"code": "RAGGING_HARASSMENT", "name": "Ragging & Student Harassment", "default_bureau": "PGRC", "default_priority": "CRITICAL", "default_sla_days": 7},
        {"code": "ADMISSION_FRAUD", "name": "Admission Fraud / Capitation Fees", "default_bureau": "APPROVAL_BUREAU", "default_priority": "HIGH", "default_sla_days": 30},
    ]

    for cat in categories_data:
        cat_obj = ComplaintCategory(**cat, created_at=now)
        db.add(cat_obj)
    db.flush()

    # 3. Seed Users across Bureaus
    users_data = [
        {
            "email": "admin@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Dr. Rajeshwar Sharma [SYNTHETIC]",
            "role": "SUPER_ADMIN",
            "bureau": "CENTRAL_ADMIN",
            "designation": "Central System Administrator / AICTE HQ",
            "phone": "+91 11 2958 1000"
        },
        {
            "email": "head.rb@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Prof. Anita Desai [SYNTHETIC]",
            "role": "BUREAU_ADMIN",
            "bureau": "REGULATION_BUREAU",
            "designation": "Advisor & Head, Regulation Bureau",
            "phone": "+91 11 2958 1020"
        },
        {
            "email": "head.pgrc@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Dr. K. V. Raman [SYNTHETIC]",
            "role": "BUREAU_ADMIN",
            "bureau": "PGRC",
            "designation": "Director, Public Grievance Redressal Cell",
            "phone": "+91 11 2958 1030"
        },
        {
            "email": "head.legal@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Adv. S. K. Mukherjee [SYNTHETIC]",
            "role": "BUREAU_ADMIN",
            "bureau": "LEGAL_CELL",
            "designation": "Legal Advisor & Head, Legal Cell",
            "phone": "+91 11 2958 1040"
        },
        {
            "email": "head.vigilance@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Col. R. S. Rathore (Retd.) [SYNTHETIC]",
            "role": "BUREAU_ADMIN",
            "bureau": "VIGILANCE_CELL",
            "designation": "Chief Vigilance Officer",
            "phone": "+91 11 2958 1050"
        },
        {
            "email": "officer.rb@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Sunil Verma [SYNTHETIC]",
            "role": "CASE_OFFICER",
            "bureau": "REGULATION_BUREAU",
            "designation": "Assistant Director / Scrutiny Officer",
            "phone": "+91 11 2958 1025"
        },
        {
            "email": "bureau.officer.rb@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Meera Swaminathan [SYNTHETIC]",
            "role": "BUREAU_OFFICER",
            "bureau": "REGULATION_BUREAU",
            "designation": "Section Officer / Reviewer",
            "phone": "+91 11 2958 1026"
        },
        {
            "email": "officer.pgrc@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Pooja Hegde [SYNTHETIC]",
            "role": "CASE_OFFICER",
            "bureau": "PGRC",
            "designation": "Grievance Redressal Officer",
            "phone": "+91 11 2958 1035"
        },
        {
            "email": "auditor@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Sh. N. K. Sinha [SYNTHETIC]",
            "role": "AUDITOR",
            "bureau": "CENTRAL_ADMIN",
            "designation": "Read-Only Compliance & Performance Auditor",
            "phone": "+91 11 2958 1099"
        }
    ]

    user_map = {}
    for u in users_data:
        user_obj = User(**u, created_at=now, updated_at=now)
        db.add(user_obj)
        db.flush()
        user_map[u["bureau"]] = user_obj
        user_map[u["email"]] = user_obj

        # Create Bureau Membership
        bureau_target = bureau_map.get(u["bureau"])
        if bureau_target:
            membership = BureauMembership(
                user_id=user_obj.id,
                bureau_id=bureau_target.id,
                role_in_bureau="HEAD" if "head" in u["email"] or u["role"] == "BUREAU_ADMIN" else "OFFICER",
                is_primary=True,
                created_at=now
            )
            db.add(membership)
    db.flush()

    # 4. Seed Recognized Technical Institutions across India
    institutions_data = NATIONAL_COLLEGES_SEED

    inst_map = {}
    for inst in institutions_data:
        inst_data = dict(inst)
        if "normalized_name" not in inst_data:
            inst_data["normalized_name"] = normalize_name(inst_data["name"])
        inst_obj = Institution(**inst_data, created_at=now, updated_at=now)
        db.add(inst_obj)
        db.flush()
        inst_map[inst["aicte_id"]] = inst_obj

    # 5. Seed Realistic Complaints with Cross-Bureau Conflicts
    complaints_data = [
        # Apex Institute (Multi-bureau Conflict: PGRC + Regulation Bureau + Legal Cell)
        {
            "complaint_no": "AICTE/PGRC/2026/0001",
            "institution_id": inst_map["1-10293847"].id,
            "bureau": "PGRC",
            "complainant_name": "Aarav Sharma [SYNTHETIC]",
            "complainant_category": "STUDENT",
            "complainant_email": "aarav.student@synthetic.in",
            "is_anonymous_confidential": False,
            "subject": "Withholding original B.Tech degree certificates until illegal caution deposit is paid",
            "description": "The institution administration is refusing to release final semester marksheets and original passing certificates to 2025 batch graduates unless an unapproved capitation fee and maintenance charge of Rs 45,000 is cleared.",
            "category": "FEE_EXTORTION",
            "status": "UNDER_INQUIRY",
            "priority": "HIGH",
            "sla_deadline_days": 30,
            "sla_due_date": now + timedelta(days=18),
            "assigned_officer_id": user_map["officer.pgrc@samanvay.aicte.gov.in"].id,
            "assigned_officer_name": user_map["officer.pgrc@samanvay.aicte.gov.in"].full_name,
            "created_at": now - timedelta(days=12),
            "internal_notes": "Notice issued to Registrar seeking explanation within 7 days."
        },
        {
            "complaint_no": "AICTE/RB/2026/0002",
            "institution_id": inst_map["1-10293847"].id,
            "bureau": "REGULATION_BUREAU",
            "complainant_name": "Faculty Welfare Association [SYNTHETIC]",
            "complainant_category": "FACULTY",
            "complainant_email": "faculty.assoc@synthetic.in",
            "is_anonymous_confidential": False,
            "subject": "Severe deficit in faculty cadre ratio and unapproved commercial subletting of academic campus land",
            "description": "Regulation Bureau surprise physical verification revealed that computer science and mechanical engineering faculties have only 6 regular professors against mandatory requirement of 24. Furthermore, Block B has been rented out commercially without AICTE council permission.",
            "category": "INFRASTRUCTURE_DEFICIT",
            "status": "SHOW_CAUSE_ISSUED",
            "priority": "HIGH",
            "sla_deadline_days": 30,
            "sla_due_date": now + timedelta(days=8),
            "assigned_officer_id": user_map["officer.rb@samanvay.aicte.gov.in"].id,
            "assigned_officer_name": user_map["officer.rb@samanvay.aicte.gov.in"].full_name,
            "created_at": now - timedelta(days=22),
            "internal_notes": "Show cause notice served under AICTE Approval Process Handbook (APH) 2026-27."
        },
        {
            "complaint_no": "AICTE/LC/2026/0003",
            "institution_id": inst_map["1-10293847"].id,
            "bureau": "LEGAL_CELL",
            "complainant_name": "High Court Notice WP(C) 4410/2026 [SYNTHETIC]",
            "complainant_category": "CITIZEN",
            "complainant_email": "registrar.hc@synthetic.gov.in",
            "is_anonymous_confidential": False,
            "subject": "Writ Petition WP(C) 4410/2026 regarding compliance of land conversion regulations",
            "description": "Notice received from High Court of Bombay regarding pending civil challenge to land title conversion on Hinjawadi campus. AICTE impleaded as respondent party.",
            "category": "RECOGNITION_DISPUTE",
            "status": "HEARING_SCHEDULED",
            "priority": "CRITICAL",
            "sla_deadline_days": 30,
            "sla_due_date": now + timedelta(days=22),
            "assigned_officer_id": user_map["head.legal@samanvay.aicte.gov.in"].id,
            "assigned_officer_name": user_map["head.legal@samanvay.aicte.gov.in"].full_name,
            "created_at": now - timedelta(days=8),
            "internal_notes": "Senior Standing Counsel briefed. Hearing scheduled for next month."
        },

        # National Institute of Science & Technology (Multi-bureau Conflict: PGRC + Vigilance)
        {
            "complaint_no": "AICTE/PGRC/2026/0004",
            "institution_id": inst_map["1-28491022"].id,
            "bureau": "PGRC",
            "complainant_name": "Dr. Ramesh Pillai [SYNTHETIC]",
            "complainant_category": "FACULTY",
            "complainant_email": "r.pillai@synthetic.in",
            "is_anonymous_confidential": False,
            "subject": "Arbitrary 6-month delay in disbursement of 7th Pay Commission faculty salaries",
            "description": "Assistant and Associate professors in Electrical Engineering department have not received monthly salaries since October. Management deducting provident fund without crediting to EPFO accounts.",
            "category": "FACULTY_SALARY_WITHHELD",
            "status": "LODGED",
            "priority": "MEDIUM",
            "sla_deadline_days": 30,
            "sla_due_date": now - timedelta(days=5),  # Overdue case
            "created_at": now - timedelta(days=35)
        },
        {
            "complaint_no": "AICTE/VC/2026/0005",
            "institution_id": inst_map["1-28491022"].id,
            "bureau": "VIGILANCE_CELL",
            "complainant_name": "Confidential Whistleblower [SYNTHETIC]",
            "complainant_category": "ANONYMOUS",
            "is_anonymous_confidential": True,
            "subject": "Submission of fraudulent ghost faculty records during Extension of Approval scrutiny",
            "description": "The institution submitted fake Aadhaar and experience certificates of 18 non-existent professors to pass the AICTE annual approval portal requirements. Salaries are credited into shell accounts.",
            "category": "FAKE_DEGREES_DOCUMENTS",
            "status": "UNDER_INQUIRY",
            "priority": "CRITICAL",
            "sla_deadline_days": 30,
            "sla_due_date": now + timedelta(days=15),
            "assigned_officer_id": user_map["head.vigilance@samanvay.aicte.gov.in"].id,
            "assigned_officer_name": user_map["head.vigilance@samanvay.aicte.gov.in"].full_name,
            "created_at": now - timedelta(days=15),
            "internal_notes": "Forensic audit initiated for payroll and biometric records."
        },

        # Global Institute of Management Studies
        {
            "complaint_no": "AICTE/AB/2026/0006",
            "institution_id": inst_map["1-39485721"].id,
            "bureau": "APPROVAL_BUREAU",
            "complainant_name": "Regional Inspection Committee [SYNTHETIC]",
            "complainant_category": "CITIZEN",
            "is_anonymous_confidential": False,
            "subject": "Running unapproved Executive PGDM weekend batch without council sanction",
            "description": "Inspection report indicates unapproved intake of 60 seats in executive management program violating sanctioned intake order.",
            "category": "UNAPPROVED_COURSES",
            "status": "RESOLVED",
            "priority": "HIGH",
            "sla_deadline_days": 30,
            "sla_due_date": now - timedelta(days=30),
            "created_at": now - timedelta(days=60),
            "disposed_at": now - timedelta(days=10),
            "resolution_summary": "Institution admitted procedural lapse, deposited penalty of Rs 10 Lakhs, and cancelled unapproved weekend cohort."
        },

        # Heritage Polytechnic Institute
        {
            "complaint_no": "AICTE/PGRC/2026/0007",
            "institution_id": inst_map["1-58392019"].id,
            "bureau": "PGRC",
            "complainant_name": "Priya Sen [SYNTHETIC]",
            "complainant_category": "STUDENT",
            "complainant_email": "priya.student@synthetic.in",
            "is_anonymous_confidential": False,
            "subject": "Unsafe electrical wiring in mechanical workshop and lack of safety goggles",
            "description": "Students forced to operate lathe and welding machines without certified eye protection. Multiple short circuits reported in workshop building.",
            "category": "INFRASTRUCTURE_DEFICIT",
            "status": "SCRUTINY_PENDING",
            "priority": "LOW",
            "sla_deadline_days": 30,
            "sla_due_date": now + timedelta(days=25),
            "created_at": now - timedelta(days=5)
        }
    ]

    complaint_map = {}
    for c_data in complaints_data:
        c_obj = Complaint(**c_data, updated_at=now)
        db.add(c_obj)
        db.flush()
        complaint_map[c_data["complaint_no"]] = c_obj

        # 6. Immutable initial status history
        status_hist = CaseStatusHistory(
            complaint_id=c_obj.id,
            from_status=None,
            to_status=c_obj.status,
            action_taken="LODGED",
            remarks=f"Initial registration in {c_obj.bureau}.",
            created_at=c_obj.created_at
        )
        db.add(status_hist)

        # 7. Assignment history if officer assigned
        if c_obj.assigned_officer_id:
            assign_hist = CaseAssignmentHistory(
                complaint_id=c_obj.id,
                assigned_officer_id=c_obj.assigned_officer_id,
                bureau=c_obj.bureau,
                assignment_notes=f"Assigned to {c_obj.assigned_officer_name}",
                is_current=True,
                created_at=c_obj.created_at
            )
            db.add(assign_hist)

        # 8. Add initial audit log
        audit = AuditLog(
            complaint_id=c_obj.id,
            institution_id=c_obj.institution_id,
            actor_name="Intake Portal / Scrutiny Desk",
            actor_role="OFFICER",
            actor_bureau=c_obj.bureau,
            action_type="CASE_LODGED",
            description=f"Synthetic demonstration complaint lodged under {c_obj.bureau.replace('_', ' ')}.",
            new_state=c_obj.status,
            timestamp=c_obj.created_at
        )
        db.add(audit)

    # 9. Seed Inter-Bureau Transfer Movement
    movement = CaseMovement(
        complaint_id=complaint_map["AICTE/PGRC/2026/0004"].id,
        from_bureau="PGRC",
        to_bureau="VIGILANCE_CELL",
        movement_type="TRANSFER_REQUEST",
        reason="Complainant provided supporting affidavit indicating systemic financial fraud involving ghost accounts. Vigilance investigation requested.",
        status="PENDING_APPROVAL",
        requested_by_id=user_map["officer.pgrc@samanvay.aicte.gov.in"].id,
        created_at=now - timedelta(days=3)
    )
    db.add(movement)

    # 10. Seed Related-Case Linkages (maintains independent histories)
    linkage1 = CaseLinkage(
        source_complaint_id=complaint_map["AICTE/RB/2026/0002"].id,
        target_complaint_id=complaint_map["AICTE/LC/2026/0003"].id,
        link_type="CROSS_BUREAU_OVERLAP",
        similarity_score=0.92,
        explanation_json=(
            '{"overall_score": 0.92, "text_similarity_score": 0.85, '
            '"category_match": true, "institution_match": true, '
            '"shared_keywords": ["infrastructure", "laboratories", "inspection", "safety"], '
            '"rationale": "High match (92.0%): Identical institution identifier AICTE ID 1-10293847 (Apex Institute of Engineering & Technology). Concurrent active complaints across Regulation Bureau and Legal Cell."}'
        ),
        status="CONFIRMED_RELATED",
        confidence_tier="HIGH",
        reasons_json='["Identical institution identifier (AICTE ID 1-10293847)", "Concurrent active complaints across Regulation Bureau and Legal Cell", "Infrastructure deficiency and pending High Court litigation"]',
        rationale="Cross-bureau overlap confirmed by Central Admin. Coordinated joint action required.",
        coordination_decision="JOINT_INSPECTION",
        coordination_notes="Standing Coordination Committee resolved to dispatch joint team (Regulation Bureau + Legal Cell) to verify compliance before court affidavit submission.",
        lead_bureau="REGULATION_BUREAU",
        lead_officer_id=user_map["head.rb@samanvay.aicte.gov.in"].id,
        coordination_deadline=now + timedelta(days=14),
        is_active=True,
        version=1,
        created_at=now - timedelta(days=5),
        updated_at=now - timedelta(days=1)
    )
    db.add(linkage1)
    db.flush()

    linkage2 = CaseLinkage(
        source_complaint_id=complaint_map["AICTE/PGRC/2026/0004"].id,
        target_complaint_id=complaint_map["AICTE/VC/2026/0005"].id,
        link_type="CROSS_BUREAU_OVERLAP",
        similarity_score=0.865,
        explanation_json=(
            '{"overall_score": 0.865, "text_similarity_score": 0.76, '
            '"category_match": false, "institution_match": true, '
            '"shared_keywords": ["faculty", "salaries", "inspection", "accounts"], '
            '"rationale": "High match (86.5%): Identical institution (National Institute of Science & Technology), '
            'shared keywords relating to faculty payroll/records, and concurrent active inquiry across PGRC and Vigilance Cell."}'
        ),
        status="PENDING_REVIEW",
        confidence_tier="HIGH",
        reasons_json='["Identical institution identifier (AICTE ID 1-94857201)", "Shared keywords relating to faculty payroll/records", "Concurrent active inquiry across PGRC and Vigilance Cell"]',
        rationale="AI Candidate Overlap flagged for review by PGRC and Vigilance Cell.",
        is_active=True,
        version=1,
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2)
    )
    db.add(linkage2)
    db.flush()

    # 11. Seed Follow-up Tasks with Configurable Deadlines & Coordination Linkage
    task1 = FollowUpTask(
        complaint_id=complaint_map["AICTE/VC/2026/0005"].id,
        linkage_id=linkage2.id,
        target_bureau="VIGILANCE_CELL",
        title="Conduct Biometric & EPFO Cross-Verification Inspection [SYNTHETIC]",
        description="Vigilance team surprise physical audit to cross-verify biometric punch logs against bank statements.",
        assigned_to_id=user_map["head.vigilance@samanvay.aicte.gov.in"].id,
        deadline=now + timedelta(days=5),
        status="IN_PROGRESS",
        priority="HIGH",
        reminder_frequency_days=3,
        escalation_level=1,
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=1)
    )
    task2 = FollowUpTask(
        complaint_id=complaint_map["AICTE/LC/2026/0003"].id,
        target_bureau="LEGAL_CELL",
        title="Draft Reply Affidavit for High Court Bombay Notice [SYNTHETIC]",
        description="Coordinate with Regulation Bureau to obtain land survey records for drafting reply in WP(C) 4410/2026.",
        assigned_to_id=user_map["head.legal@samanvay.aicte.gov.in"].id,
        deadline=now + timedelta(days=7),
        status="PENDING",
        priority="CRITICAL",
        reminder_frequency_days=2,
        escalation_level=0,
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2)
    )
    task3 = FollowUpTask(
        complaint_id=complaint_map["AICTE/RB/2026/0002"].id,
        linkage_id=linkage1.id,
        target_bureau="REGULATION_BUREAU",
        title="Form Joint Inspection Panel with PGRC Officers [SYNTHETIC]",
        description="Issue formal nomination memo for 2 experts to join PGRC grievance scrutiny committee at Apex campus.",
        assigned_to_id=user_map["head.rb@samanvay.aicte.gov.in"].id,
        deadline=now + timedelta(days=4),
        status="PENDING",
        priority="HIGH",
        reminder_frequency_days=2,
        escalation_level=0,
        created_at=now - timedelta(days=1),
        updated_at=now - timedelta(days=1)
    )
    db.add(task1)
    db.add(task2)
    db.add(task3)

    # 12. Seed Evidence Attachments with Metadata and SHA-256 Checksums
    attachment1 = EvidenceAttachment(
        complaint_id=complaint_map["AICTE/RB/2026/0002"].id,
        storage_key="seed_apex_inspection_report_2026_key",
        file_name="apex_surprise_inspection_report_2026.pdf",
        original_file_name="Apex_Tech_Surprise_Inspection_Signed.pdf",
        file_path="/uploads/evidence/apex_surprise_inspection_report_2026.pdf",
        file_size_bytes=2480192,
        mime_type="application/pdf",
        sha256_checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        uploaded_by_id=user_map["officer.rb@samanvay.aicte.gov.in"].id,
        retention_status="ACTIVE",
        is_confidential=False,
        malware_scan_status="CLEAN",
        legal_hold=False,
        download_count=1,
        description="Physical verification survey notes regarding computer science faculty shortfall.",
        created_at=now - timedelta(days=21)
    )
    db.add(attachment1)

    # 13. Seed Notifications & Delivery Attempts
    notif1 = Notification(
        target_bureau="REGULATION_BUREAU",
        institution_id=inst_map["1-10293847"].id,
        complaint_id=complaint_map["AICTE/RB/2026/0002"].id,
        alert_type="OVERLAP_ALERT",
        title="Cross-Bureau Conflict Alert: Apex Institute of Engineering",
        message="3 bureaus (Regulation Bureau, PGRC, Legal Cell) have concurrent active proceedings for Apex Institute. Joint coordination recommended before issuing regulatory closure.",
        delivery_channel="IN_APP",
        delivery_status="DELIVERED",
        is_read=False,
        created_at=now - timedelta(days=1)
    )
    db.add(notif1)
    db.flush()

    attempt1 = NotificationDeliveryAttempt(
        notification_id=notif1.id,
        channel="IN_APP",
        attempt_number=1,
        status="SUCCESS",
        attempted_at=now - timedelta(days=1)
    )
    db.add(attempt1)

    # 14. Seed System Configurations
    configs_data = [
        {"config_key": "SLA_DEFAULT_DAYS", "config_value": "30", "value_type": "INTEGER", "category": "SLA", "description": "Default statutory SLA duration in calendar days for complaint resolution"},
        {"config_key": "SIMILARITY_THRESHOLD_PERCENT", "config_value": "75", "value_type": "INTEGER", "category": "SIMILARITY", "description": "Minimum similarity score percentage required to trigger automated overlap alerts"},
        {"config_key": "AUTO_ESCALATION_OVERDUE_DAYS", "config_value": "7", "value_type": "INTEGER", "category": "ESCALATION", "description": "Grace period in days before overdue complaints trigger Level-1 escalation alerts"},
        {"config_key": "MAX_ATTACHMENT_SIZE_MB", "config_value": "25", "value_type": "INTEGER", "category": "SECURITY", "description": "Maximum permissible evidence file upload size in megabytes"},
    ]

    for cfg in configs_data:
        cfg_obj = SystemConfig(**cfg, updated_at=now)
        db.add(cfg_obj)

    db.commit()
    print("Database successfully seeded with synthetic AICTE demonstration data.")
