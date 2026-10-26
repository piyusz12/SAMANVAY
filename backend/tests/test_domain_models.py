import pytest
from datetime import timedelta
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.app.models.bureau import Bureau
from backend.app.models.bureau_membership import BureauMembership
from backend.app.models.complaint_category import ComplaintCategory
from backend.app.models.institution import Institution, normalize_name
from backend.app.models.user import User
from backend.app.models.complaint import Complaint
from backend.app.models.case_assignment_history import CaseAssignmentHistory
from backend.app.models.case_status_history import CaseStatusHistory
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.evidence_attachment import EvidenceAttachment
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.audit_log import AuditLog
from backend.app.models.system_config import SystemConfig
from backend.app.repositories.institution_repository import InstitutionRepository
from backend.app.repositories.complaint_repository import ComplaintRepository
from backend.app.repositories.case_linkage_repository import CaseLinkageRepository
from backend.app.repositories.follow_up_task_repository import FollowUpTaskRepository
from backend.app.repositories.evidence_repository import EvidenceRepository
from backend.app.core.datetime_util import utc_now

def test_bureau_and_membership_creation(db_session: Session):
    """Verifies normalized Bureau and BureauMembership entities and constraints."""
    bureau = Bureau(
        code="TEST_BUREAU_1",
        name="Test Evaluation Bureau",
        description="Testing bureau",
        default_sla_days=25
    )
    db_session.add(bureau)
    db_session.commit()
    assert bureau.id is not None
    assert bureau.is_active is True

    # Duplicate code should violate uniqueness
    dup_bureau = Bureau(code="TEST_BUREAU_1", name="Duplicate Bureau")
    db_session.add(dup_bureau)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # User Bureau Membership
    user = db_session.query(User).first()
    assert user is not None
    membership = BureauMembership(
        user_id=user.id,
        bureau_id=bureau.id,
        role_in_bureau="HEAD",
        is_primary=True
    )
    db_session.add(membership)
    db_session.commit()
    assert membership.id is not None

    # Duplicate membership for same user and bureau must fail
    dup_membership = BureauMembership(
        user_id=user.id,
        bureau_id=bureau.id,
        role_in_bureau="OFFICER"
    )
    db_session.add(dup_membership)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_institution_deduplication_matching_rules(db_session: Session):
    """
    Tests normalized institution anti-duplicate matching rules:
    1. Exact AICTE ID match
    2. Exact AISHE Code match
    3. Normalized Name + City + State match
    """
    repo = InstitutionRepository(db_session)

    inst1 = Institution(
        aicte_id="1-9990001",
        aishe_code="C-88801",
        name="St. Xavier's Institute of Engineering & Technology",
        state="Maharashtra",
        city="Mumbai",
        region="Western",
        institution_type="Private"
    )
    repo.create(inst1)
    db_session.commit()

    # Test Rule 1: Exact AICTE ID match
    is_dup, matched, strategy, conf, _ = repo.check_duplicate_or_match(aicte_id="1-9990001")
    assert is_dup is True
    assert strategy == "AICTE_ID_EXACT"
    assert conf == 1.0
    assert matched.id == inst1.id

    # Test Rule 2: Exact AISHE Code match
    is_dup, matched, strategy, conf, _ = repo.check_duplicate_or_match(
        aicte_id="1-DIFFERENT",
        aishe_code="C-88801"
    )
    assert is_dup is True
    assert strategy == "AISHE_CODE_EXACT"
    assert conf == 0.98

    # Test Rule 3: Normalized name + city + state match (varied casing/punctuation)
    is_dup, matched, strategy, conf, _ = repo.check_duplicate_or_match(
        name="st. xavier's institute of engineering and technology",
        city="Mumbai",
        state="Maharashtra"
    )
    # Different wording ("and" vs "&"), but stripped check:
    is_dup2, matched2, strategy2, conf2, _ = repo.check_duplicate_or_match(
        name="St. Xaviers Institute of Engineering & Technology",
        city="Mumbai",
        state="Maharashtra"
    )
    assert is_dup2 is True
    assert strategy2 == "NORMALIZED_NAME_CITY_STATE"
    assert conf2 == 0.90

    # Non-duplicate: Same name but different city/state
    is_dup_diff, _, _, _, _ = repo.check_duplicate_or_match(
        aicte_id="1-NEW-INST",
        name="St. Xaviers Institute of Engineering & Technology",
        city="Kolkata",
        state="West Bengal"
    )
    assert is_dup_diff is False

def test_separate_institution_and_complaint_identity(db_session: Session):
    """
    Validates that institution identity is separate from complaint identity.
    Multiple independent complaints may reference the same institution without being duplicates.
    """
    institution = db_session.query(Institution).first()
    assert institution is not None

    complaint1 = Complaint(
        complaint_no="AICTE/TEST/2026/9001",
        institution_id=institution.id,
        bureau="PGRC",
        complainant_name="Student Complainant A",
        complainant_category="STUDENT",
        subject="Issue with scholarship disbursal",
        description="Scholarship grant received from central ministry withheld by institution accounts.",
        category="FEE_EXTORTION",
        status="LODGED",
        sla_deadline_days=30
    )
    complaint2 = Complaint(
        complaint_no="AICTE/TEST/2026/9002",
        institution_id=institution.id,
        bureau="REGULATION_BUREAU",
        complainant_name="Faculty Complainant B",
        complainant_category="FACULTY",
        subject="Deficit in library volume ratios",
        description="Mandatory NBA accreditation library journal ratio not fulfilled.",
        category="INFRASTRUCTURE_DEFICIT",
        status="LODGED",
        sla_deadline_days=30
    )
    db_session.add(complaint1)
    db_session.add(complaint2)
    db_session.commit()

    # Verify both complaints exist independently and point to the same institution
    complaints_for_inst = db_session.query(Complaint).filter(Complaint.institution_id == institution.id).all()
    assert len(complaints_for_inst) >= 2
    assert complaint1.id != complaint2.id
    assert complaint1.institution_id == complaint2.institution_id

def test_complaint_repository_immutable_status_and_assignment_histories(db_session: Session):
    """Verifies that ComplaintRepository records immutable status and assignment history."""
    repo = ComplaintRepository(db_session)
    inst = db_session.query(Institution).first()
    user1 = db_session.query(User).filter(User.role == "CASE_OFFICER").first()
    user2 = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()

    complaint = Complaint(
        complaint_no="AICTE/HIST/2026/001",
        institution_id=inst.id,
        bureau="REGULATION_BUREAU",
        complainant_name="Whistleblower Test",
        complainant_category="ANONYMOUS",
        is_anonymous_confidential=True,
        subject="Infrastructure Safety Test",
        description="Testing audit logs and histories.",
        category="INFRASTRUCTURE_DEFICIT",
        status="LODGED",
        sla_deadline_days=30
    )

    created = repo.create_with_history(complaint, created_by_id=user2.id)
    assert created.id is not None
    assert created.sla_due_date is not None
    assert len(created.status_history) == 1
    assert created.status_history[0].to_status == "LODGED"

    # Status update adds another history entry
    repo.update_status_with_history(
        complaint=created,
        new_status="UNDER_INQUIRY",
        action_taken="INQUIRY_OPENED",
        changed_by_id=user1.id,
        remarks="Field inspector appointed."
    )
    db_session.commit()
    db_session.refresh(created)

    assert created.status == "UNDER_INQUIRY"
    assert len(created.status_history) == 2
    assert created.status_history[1].action_taken == "INQUIRY_OPENED"

    # Assign officer rotates assignment history
    repo.assign_officer_with_history(
        complaint=created,
        officer_id=user1.id,
        officer_name=user1.full_name,
        assigned_by_id=user2.id,
        notes="Official assignment."
    )
    db_session.commit()
    db_session.refresh(created)

    assert created.assigned_officer_id == user1.id
    assert len(created.assignment_history) == 1
    assert created.assignment_history[0].is_current is True

def test_related_cases_represented_as_links_without_merging(db_session: Session):
    """
    Verifies related cases are represented as explicit links rather than merged records.
    Unique constraint on (source, target, link_type) prevents duplicate links.
    """
    repo = CaseLinkageRepository(db_session)
    c1, c2 = db_session.query(Complaint).limit(2).all()

    link = repo.link_cases(
        source_id=c1.id,
        target_id=c2.id,
        link_type="CROSS_BUREAU_OVERLAP",
        similarity_score=0.88,
        explanation_json='{"reason": "shared_keywords"}'
    )
    db_session.commit()
    assert link.id is not None
    assert link.status == "PROPOSED_BY_AI"

    # Verify independent complaint records are preserved (not merged or deleted)
    assert db_session.query(Complaint).filter(Complaint.id == c1.id).count() == 1
    assert db_session.query(Complaint).filter(Complaint.id == c2.id).count() == 1

    # Verify duplicate linkage query returns existing linkage rather than duplicate row
    link2 = repo.link_cases(
        source_id=c1.id,
        target_id=c2.id,
        link_type="CROSS_BUREAU_OVERLAP",
        similarity_score=0.90,
        explanation_json='{"reason": "updated"}'
    )
    assert link2.id == link.id

    # Review linkage by officer
    user = db_session.query(User).first()
    reviewed = repo.review_linkage(
        linkage_id=link.id,
        status="CONFIRMED_BY_OFFICER",
        reviewer_id=user.id,
        notes="Verified overlap across bureaus."
    )
    db_session.commit()
    assert reviewed.status == "CONFIRMED_BY_OFFICER"
    assert reviewed.reviewed_at is not None

def test_follow_up_tasks_and_configurable_deadlines(db_session: Session):
    """Verifies follow-up tasks and configurable deadline tracking."""
    repo = FollowUpTaskRepository(db_session)
    complaint = db_session.query(Complaint).first()
    user = db_session.query(User).first()

    now = utc_now()
    task = FollowUpTask(
        complaint_id=complaint.id,
        title="Physical Campus Verification",
        description="Verify laboratory space specifications.",
        assigned_to_id=user.id,
        deadline=now + timedelta(days=5),
        status="PENDING",
        priority="HIGH",
        reminder_frequency_days=2
    )
    repo.create(task)
    db_session.commit()
    assert task.id is not None
    assert task.status == "PENDING"

    # Complete task
    completed = repo.complete_task(task.id, completion_notes="Inspection successfully conducted.")
    db_session.commit()
    assert completed.status == "COMPLETED"
    assert completed.completed_at is not None

def test_evidence_attachments_and_checksum(db_session: Session):
    """Verifies evidence attachment metadata, SHA-256 checksums, and retention policy."""
    repo = EvidenceRepository(db_session)
    complaint = db_session.query(Complaint).first()
    user = db_session.query(User).first()

    checksum = "a" * 64
    attachment = EvidenceAttachment(
        complaint_id=complaint.id,
        file_name="affidavit_doc_2026.pdf",
        original_file_name="Original_Affidavit.pdf",
        file_path="/uploads/evidence/affidavit_doc_2026.pdf",
        file_size_bytes=1024000,
        mime_type="application/pdf",
        sha256_checksum=checksum,
        uploaded_by_id=user.id,
        retention_status="ACTIVE",
        is_confidential=True
    )
    repo.create(attachment)
    db_session.commit()
    assert attachment.id is not None

    found = repo.find_by_checksum(checksum)
    assert found is not None
    assert found.file_name == "affidavit_doc_2026.pdf"

    # Update retention status to ARCHIVED
    archived = repo.update_retention_status(attachment.id, "ARCHIVED")
    db_session.commit()
    assert archived.retention_status == "ARCHIVED"

def test_notifications_and_delivery_attempts(db_session: Session):
    """Verifies notifications and delivery attempt auditing."""
    user = db_session.query(User).first()
    notif = Notification(
        user_id=user.id,
        alert_type="HIGH_PRIORITY",
        title="Urgent Inquiry Scheduled",
        message="Notice of preliminary hearing issued.",
        delivery_channel="IN_APP",
        delivery_status="PENDING"
    )
    db_session.add(notif)
    db_session.commit()
    assert notif.id is not None

    attempt = NotificationDeliveryAttempt(
        notification_id=notif.id,
        channel="IN_APP",
        attempt_number=1,
        status="SUCCESS"
    )
    db_session.add(attempt)
    notif.delivery_status = "DELIVERED"
    db_session.commit()
    assert attempt.id is not None
    assert len(notif.delivery_attempts) == 1

def test_system_config_entity(db_session: Session):
    """Verifies SystemConfig entity and uniqueness."""
    config = SystemConfig(
        config_key="CUSTOM_SLA_DAYS",
        config_value="45",
        value_type="INTEGER",
        category="SLA",
        description="Custom SLA limit"
    )
    db_session.add(config)
    db_session.commit()
    assert config.id is not None

    # Uniqueness constraint on config_key
    dup_config = SystemConfig(
        config_key="CUSTOM_SLA_DAYS",
        config_value="60"
    )
    db_session.add(dup_config)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_soft_delete_retention_policy(db_session: Session):
    """Verifies that soft-deleted complaints are preserved in DB but excluded from active queries."""
    repo = ComplaintRepository(db_session)
    inst = db_session.query(Institution).first()

    complaint = Complaint(
        complaint_no="AICTE/RETENTION/2026/001",
        institution_id=inst.id,
        bureau="PGRC",
        complainant_name="Retention Complainant",
        complainant_category="STUDENT",
        subject="Temporary grievance",
        description="To be archived.",
        category="GENERAL_MALADMINISTRATION",
        status="LODGED"
    )
    repo.create(complaint)
    db_session.commit()
    c_id = complaint.id

    # Active lookup
    active = repo.get_active_by_id(c_id)
    assert active is not None

    # Soft delete
    repo.soft_delete(complaint)
    db_session.commit()

    # Excluded from active lookups
    assert repo.get_active_by_id(c_id) is None
    # Still exists in raw database table for retention audit compliance
    raw_query = db_session.query(Complaint).filter(Complaint.id == c_id).first()
    assert raw_query is not None
    assert raw_query.is_deleted is True
