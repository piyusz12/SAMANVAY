from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.models.case_movement import CaseMovement
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.audit_log import AuditLog
from backend.app.models.notification import Notification
from backend.app.services.auth_service import get_password_hash
from backend.app.services.overlap_service import check_institution_conflict

DEMO_PASSWORD_HASH = get_password_hash("Demo@AICTE2026!")

def seed_database(db: Session):
    """
    Populates database with clearly labelled synthetic AICTE data for demonstration.
    Strictly follows mandatory rule 9: all demonstration entities are explicitly synthetic.
    """
    if db.query(User).count() > 0:
        return  # Database already seeded

    # 1. Seed Users across Bureaus
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
            "role": "BUREAU_HEAD",
            "bureau": "REGULATION_BUREAU",
            "designation": "Advisor & Head, Regulation Bureau",
            "phone": "+91 11 2958 1020"
        },
        {
            "email": "head.pgrc@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Dr. K. V. Raman [SYNTHETIC]",
            "role": "BUREAU_HEAD",
            "bureau": "PGRC",
            "designation": "Director, Public Grievance Redressal Cell",
            "phone": "+91 11 2958 1030"
        },
        {
            "email": "head.legal@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Adv. S. K. Mukherjee [SYNTHETIC]",
            "role": "BUREAU_HEAD",
            "bureau": "LEGAL_CELL",
            "designation": "Legal Advisor & Head, Legal Cell",
            "phone": "+91 11 2958 1040"
        },
        {
            "email": "head.vigilance@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Col. R. S. Rathore (Retd.) [SYNTHETIC]",
            "role": "BUREAU_HEAD",
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
            "email": "officer.pgrc@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Pooja Hegde [SYNTHETIC]",
            "role": "CASE_OFFICER",
            "bureau": "PGRC",
            "designation": "Grievance Redressal Officer",
            "phone": "+91 11 2958 1035"
        }
    ]

    user_map = {}
    for u in users_data:
        user_obj = User(**u)
        db.add(user_obj)
        db.flush()
        user_map[u["bureau"]] = user_obj
        user_map[u["email"]] = user_obj

    # 2. Seed Synthetic Institutions
    institutions_data = [
        {
            "aicte_id": "1-10293847",
            "name": "Apex Institute of Engineering & Technology [SYNTHETIC]",
            "state": "Maharashtra",
            "city": "Pune",
            "region": "Western",
            "institution_type": "Private-Self-Financed",
            "approval_status": "SHOW_CAUSE_NOTICE",
            "address": "Survey 42, Hinjawadi Phase 2, Pune, Maharashtra",
            "contact_email": "registrar@apex-tech-synthetic.edu.in",
            "contact_phone": "+91 20 2293 8470"
        },
        {
            "aicte_id": "1-28491022",
            "name": "National Institute of Science & Technology [SYNTHETIC]",
            "state": "Karnataka",
            "city": "Bengaluru",
            "region": "South-West",
            "institution_type": "Deemed University",
            "approval_status": "UNDER_SCRUTINY",
            "address": "Electronic City Phase 1, Bengaluru, Karnataka",
            "contact_email": "admin@nist-synthetic.edu.in",
            "contact_phone": "+91 80 2849 1022"
        },
        {
            "aicte_id": "1-39485721",
            "name": "Global Institute of Management Studies [SYNTHETIC]",
            "state": "Uttar Pradesh",
            "city": "Noida",
            "region": "Northern",
            "institution_type": "Private-Self-Financed",
            "approval_status": "APPROVED",
            "address": "Knowledge Park III, Greater Noida, UP",
            "contact_email": "director@gims-synthetic.edu.in",
            "contact_phone": "+91 120 3948 5721"
        },
        {
            "aicte_id": "1-58392019",
            "name": "Heritage Polytechnic Institute [SYNTHETIC]",
            "state": "West Bengal",
            "city": "Kolkata",
            "region": "Eastern",
            "institution_type": "Govt-Aided",
            "approval_status": "APPROVED",
            "address": "Sector V, Salt Lake, Kolkata, West Bengal",
            "contact_email": "principal@heritage-poly-synthetic.edu.in",
            "contact_phone": "+91 33 5839 2019"
        },
        {
            "aicte_id": "1-74829103",
            "name": "Central Indian Institute of Technology [SYNTHETIC]",
            "state": "Madhya Pradesh",
            "city": "Bhopal",
            "region": "Central",
            "institution_type": "Govt",
            "approval_status": "APPROVED",
            "address": "Arera Hills, Bhopal, Madhya Pradesh",
            "contact_email": "office@ciit-synthetic.edu.in",
            "contact_phone": "+91 755 7482 9103"
        }
    ]

    inst_map = {}
    for inst in institutions_data:
        inst_obj = Institution(**inst)
        db.add(inst_obj)
        db.flush()
        inst_map[inst["aicte_id"]] = inst_obj

    # 3. Seed Realistic Complaints with Cross-Bureau Conflicts
    now = datetime.utcnow()
    
    complaints_data = [
        # Apex Institute (Multi-bureau Conflict: PGRC + Regulation Bureau + Legal Cell)
        {
            "complaint_no": "AICTE/PGRC/2026/0001",
            "institution_id": inst_map["1-10293847"].id,
            "bureau": "PGRC",
            "complainant_name": "Aarav Sharma [SYNTHETIC]",
            "complainant_category": "STUDENT",
            "complainant_email": "aarav.student@synthetic.in",
            "subject": "Withholding original B.Tech degree certificates until illegal caution deposit is paid",
            "description": "The institution administration is refusing to release final semester marksheets and original passing certificates to 2025 batch graduates unless an unapproved capitation fee and maintenance charge of Rs 45,000 is cleared.",
            "category": "FEE_EXTORTION",
            "status": "UNDER_INQUIRY",
            "priority": "HIGH",
            "sla_deadline_days": 30,
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
            "subject": "Severe deficit in faculty cadre ratio and unapproved commercial subletting of academic campus land",
            "description": "Regulation Bureau surprise physical verification revealed that computer science and mechanical engineering faculties have only 6 regular professors against mandatory requirement of 24. Furthermore, Block B has been rented out commercially without AICTE council permission.",
            "category": "INFRASTRUCTURE_DEFICIT",
            "status": "SHOW_CAUSE_ISSUED",
            "priority": "HIGH",
            "sla_deadline_days": 30,
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
            "subject": "Writ Petition WP(C) 4410/2026 regarding compliance of land conversion regulations",
            "description": "Notice received from High Court of Bombay regarding pending civil challenge to land title conversion on Hinjawadi campus. AICTE impleaded as respondent party.",
            "category": "RECOGNITION_DISPUTE",
            "status": "HEARING_SCHEDULED",
            "priority": "CRITICAL",
            "sla_deadline_days": 30,
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
            "subject": "Arbitrary 6-month delay in disbursement of 7th Pay Commission faculty salaries",
            "description": "Assistant and Associate professors in Electrical Engineering department have not received monthly salaries since October. Management deducting provident fund without crediting to EPFO accounts.",
            "category": "FACULTY_SALARY_WITHHELD",
            "status": "LODGED",
            "priority": "MEDIUM",
            "sla_deadline_days": 30,
            "created_at": now - timedelta(days=35)  # Overdue case (35 days > 30 SLA)
        },
        {
            "complaint_no": "AICTE/VC/2026/0005",
            "institution_id": inst_map["1-28491022"].id,
            "bureau": "VIGILANCE_CELL",
            "complainant_name": "Confidential Whistleblower [SYNTHETIC]",
            "complainant_category": "ANONYMOUS",
            "subject": "Submission of fraudulent ghost faculty records during Extension of Approval scrutiny",
            "description": "The institution submitted fake Aadhaar and experience certificates of 18 non-existent professors to pass the AICTE annual approval portal requirements. Salaries are credited into shell accounts.",
            "category": "FAKE_DEGREES_DOCUMENTS",
            "status": "UNDER_INQUIRY",
            "priority": "CRITICAL",
            "sla_deadline_days": 30,
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
            "subject": "Running unapproved Executive PGDM weekend batch without council sanction",
            "description": "Inspection report indicates unapproved intake of 60 seats in executive management program violating sanctioned intake order.",
            "category": "UNAPPROVED_COURSES",
            "status": "RESOLVED",
            "priority": "HIGH",
            "sla_deadline_days": 30,
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
            "subject": "Unsafe electrical wiring in mechanical workshop and lack of safety goggles",
            "description": "Students forced to operate lathe and welding machines without certified eye protection. Multiple short circuits reported in workshop building.",
            "category": "INFRASTRUCTURE_DEFICIT",
            "status": "SCRUTINY_PENDING",
            "priority": "LOW",
            "sla_deadline_days": 30,
            "created_at": now - timedelta(days=5)
        }
    ]

    complaint_map = {}
    for c_data in complaints_data:
        c_obj = Complaint(**c_data)
        db.add(c_obj)
        db.flush()
        complaint_map[c_data["complaint_no"]] = c_obj

        # Add initial audit log
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

    # 4. Seed an Inter-Bureau Transfer Movement
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

    # 5. Seed Explainable AI Linkage Proposal
    linkage = CaseLinkage(
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
        status="PROPOSED_BY_AI",
        created_at=now - timedelta(days=2)
    )
    db.add(linkage)

    # 6. Seed Notifications
    notif1 = Notification(
        target_bureau="REGULATION_BUREAU",
        institution_id=inst_map["1-10293847"].id,
        complaint_id=complaint_map["AICTE/RB/2026/0002"].id,
        alert_type="OVERLAP_ALERT",
        title="Cross-Bureau Conflict Alert: Apex Institute of Engineering",
        message="3 bureaus (Regulation Bureau, PGRC, Legal Cell) have concurrent active proceedings for Apex Institute. Joint coordination recommended before issuing regulatory closure.",
        is_read=False,
        created_at=now - timedelta(days=1)
    )
    notif2 = Notification(
        target_bureau="VIGILANCE_CELL",
        institution_id=inst_map["1-28491022"].id,
        complaint_id=complaint_map["AICTE/VC/2026/0005"].id,
        alert_type="OVERLAP_ALERT",
        title="Cross-Bureau Overlap: National Institute of Science & Technology",
        message="PGRC and Vigilance Cell both have open cases on faculty salary irregularities and ghost records for this institution.",
        is_read=False,
        created_at=now - timedelta(hours=14)
    )
    db.add(notif1)
    db.add(notif2)

    db.commit()
    print("Database successfully seeded with synthetic AICTE demonstration data.")
