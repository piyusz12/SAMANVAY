"""
SAMANVAY (SIH PS 26264) — SIH Demonstration Synthetic Dataset Generator

Creates an explicitly synthetic, deterministic, and rich dataset tailored for the
SIH 2026 live evaluation panel.

Covers all required demonstration conditions:
1. Multiple institutions across multiple bureaus.
2. Concurrent complaints about the same institution across different bureaus.
3. Exact institution-identifier matches (AICTE Permanent ID & AISHE code).
4. Similar complaint descriptions with different wording.
5. Completely unrelated complaints that must NOT be linked.
6. Diverse case lifecycles: LODGED, UNDER_INQUIRY, SHOW_CAUSE_ISSUED, HEARING_SCHEDULED, RESOLVED/DISPOSED, and OVERDUE.
7. Unassigned cases and outstanding cross-bureau coordination tasks.
8. Role-based access accounts: Super Admin, Bureau Admin, Case Officer, Bureau Viewer, Auditor.
"""

import os
import sys
import argparse
from datetime import datetime, timedelta, timezone

# Ensure project root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
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
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now
from backend.app.core.logging import logger

DEMO_PASSWORD_HASH = get_password_hash("Demo@AICTE2026!")


def reset_database(db: Session):
    """Safely clears all transactional and reference tables."""
    logger.warning("[Seed] Resetting database tables for a clean demonstration environment...")
    
    # Reverse foreign key deletion order
    tables = [
        NotificationDeliveryAttempt,
        Notification,
        AuditLog,
        EvidenceAttachment,
        FollowUpTask,
        CaseLinkage,
        CaseMovement,
        CaseAssignmentHistory,
        CaseStatusHistory,
        Complaint,
        Institution,
        BureauMembership,
        User,
        ComplaintCategory,
        Bureau,
        SystemConfig
    ]
    for table in tables:
        db.query(table).delete()
    db.commit()
    logger.info("[Seed] All tables cleared successfully.")


def seed_demo_dataset(db: Session, reset: bool = False):
    """Populates the complete SIH demonstration dataset."""
    if reset:
        reset_database(db)
    elif db.query(User).count() > 0:
        logger.info("[Seed] Database already contains records. Use --reset to rebuild from scratch.")
        return

    now = utc_now()
    logger.info(f"[Seed] Generating SIH demonstration dataset at timestamp: {now.isoformat()}...")

    # =========================================================================
    # 1. AICTE Bureaus & Cells
    # =========================================================================
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

    # =========================================================================
    # 2. Complaint Categories
    # =========================================================================
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

    # =========================================================================
    # 3. Demonstration Users Across Multiple Roles & Bureaus
    # =========================================================================
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
            "email": "officer.rb@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Sunil Verma [SYNTHETIC]",
            "role": "CASE_OFFICER",
            "bureau": "REGULATION_BUREAU",
            "designation": "Assistant Director / Scrutiny Officer",
            "phone": "+91 11 2958 1025"
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
            "email": "officer.pgrc@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Pooja Hegde [SYNTHETIC]",
            "role": "CASE_OFFICER",
            "bureau": "PGRC",
            "designation": "Grievance Redressal Officer",
            "phone": "+91 11 2958 1035"
        },
        {
            "email": "head.approval@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Dr. Rameshwar Nath [SYNTHETIC]",
            "role": "BUREAU_ADMIN",
            "bureau": "APPROVAL_BUREAU",
            "designation": "Advisor & Head, Approval Bureau",
            "phone": "+91 11 2958 1060"
        },
        {
            "email": "officer.approval@samanvay.aicte.gov.in",
            "hashed_password": DEMO_PASSWORD_HASH,
            "full_name": "Vikas Malhotra [SYNTHETIC]",
            "role": "CASE_OFFICER",
            "bureau": "APPROVAL_BUREAU",
            "designation": "Regional Scrutiny Officer",
            "phone": "+91 11 2958 1065"
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
        user_map[u["email"]] = user_obj

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

    # =========================================================================
    # 4. Institutions with Verified AICTE & AISHE Identifiers
    # =========================================================================
    institutions_data = [
        {
            "aicte_id": "1-10293847",
            "aishe_code": "C-44120",
            "name": "Apex Institute of Engineering & Technology [SYNTHETIC]",
            "state": "Maharashtra",
            "city": "Pune",
            "pin_code": "411057",
            "region": "Western",
            "institution_type": "Private-Self-Financed",
            "approval_status": "SHOW_CAUSE_NOTICE",
            "address": "Survey 42, Hinjawadi Phase 2, Pune, Maharashtra",
            "contact_email": "registrar@apex-tech-synthetic.edu.in",
            "contact_phone": "+91 20 2293 8470"
        },
        {
            "aicte_id": "1-28491022",
            "aishe_code": "C-51908",
            "name": "National Institute of Science & Technology [SYNTHETIC]",
            "state": "Karnataka",
            "city": "Bengaluru",
            "pin_code": "560100",
            "region": "South-West",
            "institution_type": "Deemed University",
            "approval_status": "UNDER_SCRUTINY",
            "address": "Electronic City Phase 1, Bengaluru, Karnataka",
            "contact_email": "admin@nist-synthetic.edu.in",
            "contact_phone": "+91 80 2849 1022"
        },
        {
            "aicte_id": "1-99887766",
            "aishe_code": "C-18451",
            "name": "Delhi Institute of Technology & Management [SYNTHETIC]",
            "state": "Delhi",
            "city": "New Delhi",
            "pin_code": "110025",
            "region": "Northern",
            "institution_type": "Private-Self-Financed",
            "approval_status": "UNDER_SCRUTINY",
            "address": "Plot 14, Okhla Industrial Area Phase III, New Delhi",
            "contact_email": "director@ditm-delhi-synthetic.edu.in",
            "contact_phone": "+91 11 4188 7766"
        },
        {
            "aicte_id": "1-39485721",
            "aishe_code": "C-39102",
            "name": "Global Institute of Management Studies [SYNTHETIC]",
            "state": "Uttar Pradesh",
            "city": "Noida",
            "pin_code": "201310",
            "region": "Northern",
            "institution_type": "Private-Self-Financed",
            "approval_status": "APPROVED",
            "address": "Knowledge Park III, Greater Noida, UP",
            "contact_email": "director@gims-synthetic.edu.in",
            "contact_phone": "+91 120 3948 5721"
        },
        {
            "aicte_id": "1-58392019",
            "aishe_code": "C-22910",
            "name": "Heritage Polytechnic Institute [SYNTHETIC]",
            "state": "West Bengal",
            "city": "Kolkata",
            "pin_code": "700091",
            "region": "Eastern",
            "institution_type": "Govt-Aided",
            "approval_status": "APPROVED",
            "address": "Sector V, Salt Lake, Kolkata, West Bengal",
            "contact_email": "principal@heritage-poly-synthetic.edu.in",
            "contact_phone": "+91 33 5839 2019"
        },
        {
            "aicte_id": "1-74829103",
            "aishe_code": "C-61099",
            "name": "Central Indian Institute of Technology [SYNTHETIC]",
            "state": "Madhya Pradesh",
            "city": "Bhopal",
            "pin_code": "462011",
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
        inst_data = dict(inst)
        inst_data["normalized_name"] = normalize_name(inst_data["name"])
        inst_obj = Institution(**inst_data, created_at=now, updated_at=now)
        db.add(inst_obj)
        db.flush()
        inst_map[inst["aicte_id"]] = inst_obj

    # =========================================================================
    # 5. Realistic Complaints Demonstrating Cross-Bureau Conflicts
    # =========================================================================
    complaints_data = [
        # 1. Apex Institute - PGRC (Fee extortion)
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
        # 2. Apex Institute - Regulation Bureau (Faculty deficit & land subletting)
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
        # 3. Apex Institute - Legal Cell (High Court Writ Petition)
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
        # 4. NIST Bengaluru - PGRC (OVERDUE case: Faculty salary withheld)
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
            "sla_due_date": now - timedelta(days=5),  # 5 days overdue
            "created_at": now - timedelta(days=35)
        },
        # 5. NIST Bengaluru - Vigilance Cell (Ghost faculty records)
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
        # 6. Global Institute - Approval Bureau (DISPOSED / RESOLVED case)
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
        # 7. Heritage Polytechnic - PGRC (Pending scrutiny)
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
        },
        # 8. Delhi Institute - Approval Bureau (Unapproved intake)
        {
            "complaint_no": "AICTE/AB/2026/0008",
            "institution_id": inst_map["1-99887766"].id,
            "bureau": "APPROVAL_BUREAU",
            "complainant_name": "State Directorate of Technical Education [SYNTHETIC]",
            "complainant_category": "CITIZEN",
            "is_anonymous_confidential": False,
            "subject": "Unapproved 60-seat Computer Science expansion without AICTE intake sanction",
            "description": "Delhi Institute of Technology & Management admitted 180 students in B.Tech CSE against the sanctioned quota of 120 seats for academic year 2026-27.",
            "category": "UNAPPROVED_COURSES",
            "status": "LODGED",
            "priority": "HIGH",
            "sla_deadline_days": 30,
            "sla_due_date": now + timedelta(days=28),
            "created_at": now - timedelta(days=2),
            "assigned_officer_id": user_map["officer.approval@samanvay.aicte.gov.in"].id,
            "assigned_officer_name": user_map["officer.approval@samanvay.aicte.gov.in"].full_name,
        },
        # 9. Delhi Institute - PGRC (Capitation fee & donation for unapproved CSE seat)
        {
            "complaint_no": "AICTE/PGRC/2026/0009",
            "institution_id": inst_map["1-99887766"].id,
            "bureau": "PGRC",
            "complainant_name": "Harish Chandra [SYNTHETIC]",
            "complainant_category": "PARENT",
            "complainant_email": "harish.parent@synthetic.in",
            "is_anonymous_confidential": False,
            "subject": "Illegal capitation fee and cash donation demanded for Computer Science admission",
            "description": "Management of Delhi Institute demanded cash donation of Rs 2.5 Lakhs over sanctioned tuition fees for admitting ward into unapproved CSE section.",
            "category": "FEE_EXTORTION",
            "status": "LODGED",
            "priority": "HIGH",
            "sla_deadline_days": 30,
            "sla_due_date": now + timedelta(days=29),
            "created_at": now - timedelta(days=1),
            "assigned_officer_id": user_map["officer.pgrc@samanvay.aicte.gov.in"].id,
            "assigned_officer_name": user_map["officer.pgrc@samanvay.aicte.gov.in"].full_name,
        },
        # 10. CIIT Bhopal - Regulation Bureau (Completely unrelated complaint — must NOT link)
        {
            "complaint_no": "AICTE/RB/2026/0010",
            "institution_id": inst_map["1-74829103"].id,
            "bureau": "REGULATION_BUREAU",
            "complainant_name": "Hostel Residents Committee [SYNTHETIC]",
            "complainant_category": "STUDENT",
            "is_anonymous_confidential": False,
            "subject": "Hygiene standards and drinking water filter maintenance in Central Hostel Mess",
            "description": "Drinking water cooler filters have not been serviced for 6 months. Canteen vendor lacks FSSAI certificate display.",
            "category": "INFRASTRUCTURE_DEFICIT",
            "status": "DISPOSED",
            "priority": "LOW",
            "sla_deadline_days": 30,
            "sla_due_date": now - timedelta(days=40),
            "created_at": now - timedelta(days=50),
            "disposed_at": now - timedelta(days=35),
            "resolution_summary": "RO Bhopal inspected mess, water filters replaced, FSSAI compliance certified."
        }
    ]

    complaint_map = {}
    for c_data in complaints_data:
        c_obj = Complaint(**c_data, updated_at=now)
        db.add(c_obj)
        db.flush()
        complaint_map[c_data["complaint_no"]] = c_obj

        # Status History
        status_hist = CaseStatusHistory(
            complaint_id=c_obj.id,
            from_status=None,
            to_status=c_obj.status,
            action_taken="LODGED",
            remarks=f"Initial registration in {c_obj.bureau}.",
            created_at=c_obj.created_at
        )
        db.add(status_hist)

        # Assignment History
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

        # Initial Audit Trail Log
        audit = AuditLog(
            complaint_id=c_obj.id,
            institution_id=c_obj.institution_id,
            actor_name="Intake Scrutiny Desk",
            actor_role="OFFICER",
            actor_bureau=c_obj.bureau,
            action_type="CASE_LODGED",
            description=f"Synthetic complaint {c_obj.complaint_no} registered under {c_obj.bureau}.",
            new_state=c_obj.status,
            timestamp=c_obj.created_at
        )
        db.add(audit)

    # =========================================================================
    # 6. Inter-Bureau Case Transfer Request
    # =========================================================================
    movement = CaseMovement(
        complaint_id=complaint_map["AICTE/PGRC/2026/0004"].id,
        from_bureau="PGRC",
        to_bureau="VIGILANCE_CELL",
        movement_type="TRANSFER_REQUEST",
        reason="Complainant provided affidavit alleging ghost payroll accounts. Multi-crore financial fraud suspected. Vigilance jurisdiction requested.",
        status="PENDING_APPROVAL",
        requested_by_id=user_map["officer.pgrc@samanvay.aicte.gov.in"].id,
        created_at=now - timedelta(days=3)
    )
    db.add(movement)

    # =========================================================================
    # 7. Related Case Linkages (Demonstrating Explainable Overlap)
    # =========================================================================
    # Linkage 1: Apex Institute (Regulation Bureau + Legal Cell) — CONFIRMED_RELATED
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

    # Linkage 2: NIST Bengaluru (PGRC + Vigilance) — PENDING_REVIEW candidate
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
        reasons_json='["Identical institution identifier (AICTE ID 1-28491022)", "Shared keywords relating to faculty payroll/records", "Concurrent active inquiry across PGRC and Vigilance Cell"]',
        rationale="AI Candidate Overlap flagged for review by PGRC and Vigilance Cell.",
        is_active=True,
        version=1,
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2)
    )
    db.add(linkage2)
    db.flush()

    # =========================================================================
    # 8. Follow-up Tasks with Deadlines & Escalation Levels
    # =========================================================================
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
        complaint_id=complaint_map["AICTE/AB/2026/0008"].id,
        target_bureau="APPROVAL_BUREAU",
        title="Issue Extension of Approval Freeze Notice to DITM [SYNTHETIC]",
        description="Notify examination controller regarding unapproved CSE seats and block portal intake expansion.",
        assigned_to_id=None,  # Unassigned task for demo
        deadline=now + timedelta(days=3),
        status="PENDING",
        priority="HIGH",
        reminder_frequency_days=1,
        escalation_level=0,
        created_at=now - timedelta(days=1),
        updated_at=now - timedelta(days=1)
    )
    db.add(task1)
    db.add(task2)
    db.add(task3)

    # =========================================================================
    # 9. Evidence Attachment
    # =========================================================================
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

    # =========================================================================
    # 10. Notifications
    # =========================================================================
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

    # =========================================================================
    # 11. System Configurations
    # =========================================================================
    configs_data = [
        {"config_key": "SLA_DEFAULT_DAYS", "config_value": "30", "value_type": "INTEGER", "category": "SLA", "description": "Default statutory SLA duration in calendar days for complaint resolution"},
        {"config_key": "SIMILARITY_THRESHOLD_PERCENT", "config_value": "75", "value_type": "INTEGER", "category": "SIMILARITY", "description": "Minimum similarity score percentage required to trigger automated overlap alerts"},
        {"config_key": "AUTO_ESCALATION_OVERDUE_DAYS", "config_value": "7", "value_type": "INTEGER", "category": "ESCALATION", "description": "Grace period in days before overdue complaints trigger Level-1 escalation alerts"},
        {"config_key": "MAX_ATTACHMENT_SIZE_MB", "config_value": "15", "value_type": "INTEGER", "category": "SECURITY", "description": "Maximum permissible evidence file upload size in megabytes"},
    ]

    for cfg in configs_data:
        cfg_obj = SystemConfig(**cfg, updated_at=now)
        db.add(cfg_obj)

    db.commit()
    logger.info("[Seed] SIH demonstration dataset successfully seeded!")
    print("\n" + "=" * 70)
    print("  SAMANVAY (SIH PS 26264) — SIH Demonstration Dataset Ready")
    print("=" * 70)
    print(f"  • Institutions Seeded: {len(institutions_data)}")
    print(f"  • Bureaus Seeded:      {len(bureaus_data)}")
    print(f"  • Users Seeded:        {len(users_data)} (All passwords: Demo@AICTE2026!)")
    print(f"  • Complaints Seeded:   {len(complaints_data)}")
    print(f"  • Linkages Seeded:     2 (1 Confirmed Cross-Bureau, 1 Pending Review)")
    print(f"  • Follow-up Tasks:     3 (including unassigned and overdue tasks)")
    print("=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="SAMANVAY SIH Demonstration Dataset Generator")
    parser.add_argument("--reset", action="store_true", help="Reset and clear all tables before seeding")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed_demo_dataset(db, reset=args.reset)
    finally:
        db.close()


if __name__ == "__main__":
    main()
