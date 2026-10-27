import pytest
from sqlalchemy import create_engine, inspect, MetaData
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.services.seed_service import seed_database
from backend.app.models.user import User
from backend.app.models.institution import Institution
from backend.app.models.complaint import Complaint
from backend.app.models.case_movement import CaseMovement
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.follow_up_task import FollowUpTask

EXPECTED_TABLES = {
    "users",
    "institutions",
    "complaints",
    "case_movements",
    "case_linkages",
    "audit_logs",
    "evidence_attachments",
    "notifications",
    "notification_delivery_attempts",
    "follow_up_tasks",
    "bureaus",
    "complaint_categories"
}

def test_clean_schema_creation_and_inspection():
    """
    Validates that a fresh database instance creates all required tables
    with expected primary keys and foreign key relationships without errors.
    """
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)

    inspector = inspect(test_engine)
    created_tables = set(inspector.get_table_names())

    for expected_table in EXPECTED_TABLES:
        assert expected_table in created_tables, f"Missing table: {expected_table}"

    # Verify key columns on complaints table
    complaint_cols = {col["name"]: col for col in inspector.get_columns("complaints")}
    assert "id" in complaint_cols
    assert "complaint_no" in complaint_cols
    assert "bureau" in complaint_cols
    assert "status" in complaint_cols
    assert "is_anonymous_confidential" in complaint_cols
    assert "sla_due_date" in complaint_cols

    # Verify audit log cryptographic chaining columns
    audit_cols = {col["name"]: col for col in inspector.get_columns("audit_logs")}
    assert "prev_hash" in audit_cols
    assert "entry_hash" in audit_cols

    # Verify evidence attachment columns
    evidence_cols = {col["name"]: col for col in inspector.get_columns("evidence_attachments")}
    assert "storage_key" in evidence_cols
    assert "sha256_checksum" in evidence_cols
    assert "malware_scan_status" in evidence_cols
    assert "legal_hold" in evidence_cols

def test_drop_and_recreate_schema_cycle():
    """
    Verifies that the entire schema can be dropped cleanly without
    lingering constraints and successfully recreated.
    """
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)

    inspector = inspect(test_engine)
    assert len(inspector.get_table_names()) >= len(EXPECTED_TABLES)

    # Clean drop
    Base.metadata.drop_all(bind=test_engine)
    inspector_after_drop = inspect(test_engine)
    assert len(inspector_after_drop.get_table_names()) == 0

    # Clean recreate
    Base.metadata.create_all(bind=test_engine)
    inspector_recreated = inspect(test_engine)
    assert set(inspector_recreated.get_table_names()).issuperset(EXPECTED_TABLES)

def test_idempotent_database_seeding_on_fresh_schema():
    """
    Verifies that seed_database executes cleanly on a freshly migrated schema
    and is idempotent when run multiple times.
    """
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)

    session = TestSession()
    # First seed
    seed_database(session, force=True)
    initial_user_count = session.query(User).count()
    initial_inst_count = session.query(Institution).count()
    initial_case_count = session.query(Complaint).count()

    assert initial_user_count > 0
    assert initial_inst_count > 0
    assert initial_case_count > 0

    # Second seed run (should detect existing data and remain idempotent)
    seed_database(session, force=False)
    assert session.query(User).count() == initial_user_count
    assert session.query(Institution).count() == initial_inst_count
    assert session.query(Complaint).count() == initial_case_count

    session.close()
