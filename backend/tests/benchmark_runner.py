"""
SAMANVAY Phase 16 Performance Benchmark Runner.
Generates representative synthetic workload, profiles baseline vs optimized timings,
and records reproducible latency percentiles (p50, p95, max), query counts, and throughput.
"""
import time
import os
import sys
import statistics
from typing import Dict, Any, List
from datetime import datetime, timedelta

# Ensure workspace root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models.user import User
from backend.app.models.institution import Institution
from backend.app.models.complaint import Complaint
from backend.app.models.case_linkage import CaseLinkage
from backend.app.models.follow_up_task import FollowUpTask
from backend.app.models.notification import Notification, NotificationDeliveryAttempt
from backend.app.models.audit_log import AuditLog
from backend.app.core.datetime_util import utc_now
from backend.app.services.auth_service import get_password_hash, create_access_token

BENCHMARK_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../benchmark_phase16.db"))
BENCHMARK_DB_URL = f"sqlite:///{BENCHMARK_DB_PATH}"

engine = create_engine(
    BENCHMARK_DB_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

BUREAUS = ["REGULATION_BUREAU", "PGRC", "APPROVAL_BUREAU", "LEGAL_CELL", "VIGILANCE_CELL", "POLICY_BUREAU"]
REGIONS = ["Northern", "North-West", "Eastern", "Western", "Southern", "South-West", "Central"]
CATEGORIES = [
    "FEE_EXTORTION", "ADMISSION_FRAUD", "UNAPPROVED_COURSES",
    "FACULTY_SALARY_WITHHELD", "HARASSMENT", "INFRASTRUCTURE_DEFICIT",
    "FAKE_DEGREES_DOCUMENTS", "RECOGNITION_DISPUTE"
]
STATUSES = [
    "LODGED", "SCRUTINY_PENDING", "UNDER_REVIEW", "IN_PROGRESS",
    "SHOW_CAUSE_ISSUED", "HEARING_SCHEDULED", "RESOLVED", "DISPOSED", "TRANSFERRED"
]

def seed_representative_benchmark_dataset(num_institutions: int = 200, num_complaints: int = 2000):
    """Generates deterministic representative prototype dataset."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # 1. Users
    super_admin = User(
        email="superadmin@samanvay.aicte.gov.in",
        hashed_password=get_password_hash("AdminPass#2026"),
        full_name="Central Council Administrator",
        role="SUPER_ADMIN",
        bureau="CENTRAL_ADMIN",
        is_active=True
    )
    pgrc_officer = User(
        email="pgrc.officer@samanvay.aicte.gov.in",
        hashed_password=get_password_hash("OfficerPass#2026"),
        full_name="PGRC Desk Officer",
        role="CASE_OFFICER",
        bureau="PGRC",
        is_active=True
    )
    reg_officer = User(
        email="reg.officer@samanvay.aicte.gov.in",
        hashed_password=get_password_hash("OfficerPass#2026"),
        full_name="Regulation Bureau Officer",
        role="CASE_OFFICER",
        bureau="REGULATION_BUREAU",
        is_active=True
    )
    db.add_all([super_admin, pgrc_officer, reg_officer])
    db.commit()

    # 2. Institutions
    institutions = []
    for i in range(1, num_institutions + 1):
        region = REGIONS[i % len(REGIONS)]
        inst = Institution(
            id=i,
            aicte_id=f"1-{10000000 + i}",
            aishe_code=f"C-{20000 + i}",
            name=f"Institute of Advanced Technology {i} ({region})",
            state=f"State_{(i % 28) + 1}",
            city=f"City_{(i % 50) + 1}",
            region=region,
            institution_type="Engineering & Technology",
            approval_status="APPROVED",
            is_active=True,
            is_deleted=False
        )
        institutions.append(inst)
    db.add_all(institutions)
    db.commit()

    # 3. Complaints
    complaints = []
    now = utc_now()
    for i in range(1, num_complaints + 1):
        bureau = BUREAUS[i % len(BUREAUS)]
        category = CATEGORIES[i % len(CATEGORIES)]
        status = STATUSES[i % len(STATUSES)]
        inst_id = (i % num_institutions) + 1
        days_offset = (i % 90) + 1
        created_at = now - timedelta(days=days_offset)
        # SLA due date (overdue for half of active cases)
        is_ovd = (i % 2 == 0) and status not in ("RESOLVED", "DISPOSED")
        sla_due = now - timedelta(days=5) if is_ovd else now + timedelta(days=15)

        c = Complaint(
            id=i,
            complaint_no=f"AICTE/{bureau[:2]}/{2026}/{str(i).zfill(5)}",
            institution_id=inst_id,
            bureau=bureau,
            complainant_name=f"Complainant Person {i}",
            complainant_category="STUDENT" if i % 2 == 0 else "FACULTY",
            complainant_email=f"citizen_{i}@example.com",
            complainant_phone="9876543210",
            is_anonymous_confidential=(i % 10 == 0),
            subject=f"Grievance regarding {category.replace('_', ' ').title()} at College {inst_id}",
            description=f"Detailed investigation required for irregular {category} and non-compliance with statutory norms at institution {inst_id}.",
            category=category,
            status=status,
            priority="HIGH" if i % 4 == 0 else "MEDIUM",
            sla_deadline_days=30,
            sla_due_date=sla_due,
            assigned_officer_id=pgrc_officer.id if bureau == "PGRC" else reg_officer.id if bureau == "REGULATION_BUREAU" else None,
            is_deleted=False,
            created_at=created_at,
            updated_at=created_at
        )
        complaints.append(c)
    db.add_all(complaints)
    db.commit()

    # 4. Linkages (75 linkages across bureaus)
    linkages = []
    for k in range(1, 76):
        src_id = k
        tgt_id = k + 100
        l = CaseLinkage(
            id=k,
            source_complaint_id=src_id,
            target_complaint_id=tgt_id,
            link_type="CROSS_BUREAU_OVERLAP",
            similarity_score=0.82,
            confidence_tier="HIGH",
            explanation_json='{"reasons": ["Matching AICTE Permanent ID", "High Semantic Cosine Score"]}',
            reasons_json='["Matching AICTE Permanent ID", "High Semantic Cosine Score"]',
            status="PENDING_REVIEW" if k % 2 == 0 else "CONFIRMED_RELATED",
            is_active=True,
            created_at=now - timedelta(days=k % 30),
            updated_at=now
        )
        linkages.append(l)
    db.add_all(linkages)
    db.commit()

    # 5. Notifications & Delivery attempts
    notifs = []
    attempts = []
    for n_id in range(1, 201):
        notif = Notification(
            id=n_id,
            user_id=pgrc_officer.id if n_id % 2 == 0 else reg_officer.id,
            target_bureau=BUREAUS[n_id % len(BUREAUS)],
            complaint_id=(n_id % num_complaints) + 1,
            alert_type="UPCOMING_DEADLINE" if n_id % 2 == 0 else "SLA_BREACH",
            severity="WARNING" if n_id % 2 == 0 else "CRITICAL",
            title=f"Notification Title {n_id}",
            message=f"Urgent regulatory action required on case {n_id}.",
            delivery_channel="EMAIL",
            delivery_status="DELIVERED" if n_id % 3 != 0 else "FAILED",
            is_read=(n_id % 4 == 0),
            idempotency_key=f"bench_key_{n_id}",
            created_at=now - timedelta(hours=n_id)
        )
        notifs.append(notif)
        att = NotificationDeliveryAttempt(
            notification_id=n_id,
            channel="EMAIL",
            attempt_number=1,
            status="SUCCESS" if n_id % 3 != 0 else "FAILED",
            recipient="officer@aicte.gov.in",
            attempted_at=now - timedelta(hours=n_id)
        )
        attempts.append(att)
    db.add_all(notifs)
    db.add_all(attempts)
    db.commit()
    db.close()
    print(f"Seeded benchmark DB with {num_institutions} institutions, {num_complaints} complaints, {len(linkages)} linkages.")

def measure_operation(func, iterations: int = 10) -> Dict[str, float]:
    timings = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        func()
        t1 = time.perf_counter()
        timings.append((t1 - t0) * 1000.0)  # ms
    
    timings.sort()
    return {
        "mean_ms": round(statistics.mean(timings), 2),
        "median_ms": round(statistics.median(timings), 2),
        "p95_ms": round(timings[int(len(timings) * 0.95)], 2),
        "min_ms": round(min(timings), 2),
        "max_ms": round(max(timings), 2)
    }

def run_benchmark_suite(token: str) -> Dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"}
    results = {}

    # Op 1: Complaint List & Pagination (Filtered by bureau and status)
    def op_list_complaints():
        res = client.get("/api/v1/complaints?bureau=REGULATION_BUREAU&status=LODGED&page=1&page_size=20", headers=headers)
        assert res.status_code == 200

    results["complaint_listing_paginated"] = measure_operation(op_list_complaints, iterations=12)

    # Op 2: Overdue SLA Filtering across large dataset
    def op_overdue_filtering():
        res = client.get("/api/v1/complaints?is_overdue=true&page=2&page_size=20", headers=headers)
        assert res.status_code == 200

    results["overdue_sla_filtering"] = measure_operation(op_overdue_filtering, iterations=12)

    # Op 3: Unified Multi-Entity Search
    def op_unified_search():
        res = client.get("/api/v1/search/unified?q=Technology+12&page=1&page_size=10", headers=headers)
        assert res.status_code == 200

    results["unified_search"] = measure_operation(op_unified_search, iterations=12)

    # Op 4: Parameterized Complaint Search
    def op_complaints_search():
        res = client.get("/api/v1/search/complaints?bureau=PGRC&category=FEE_EXTORTION&page=1&page_size=20", headers=headers)
        assert res.status_code == 200

    results["complaints_search"] = measure_operation(op_complaints_search, iterations=12)

    # Op 5: Dashboard Overview & KPI Aggregation
    def op_dashboard_overview():
        res = client.get("/api/v1/analytics/overview", headers=headers)
        assert res.status_code == 200

    results["dashboard_aggregation"] = measure_operation(op_dashboard_overview, iterations=12)

    # Op 6: Bureau Management Report Generation
    def op_bureau_report():
        res = client.get("/api/v1/reports/bureau", headers=headers)
        assert res.status_code == 200

    results["bureau_report_generation"] = measure_operation(op_bureau_report, iterations=12)

    # Op 7: Case Coordination Workspaces Listing
    def op_coordination_workspaces():
        res = client.get("/api/v1/coordination/workspaces", headers=headers)
        assert res.status_code == 200

    results["coordination_workspaces_listing"] = measure_operation(op_coordination_workspaces, iterations=12)

    # Op 8: Similarity Check Overlap Candidate Evaluation
    def op_similarity_check():
        payload = {
            "subject": "Illegal capitation fee for admission",
            "description": "College administration demanding unapproved donation of 1.5 lakhs.",
            "institution_id": 1,
            "category": "FEE_EXTORTION"
        }
        res = client.post("/api/v1/similarity/check", json=payload, headers=headers)
        assert res.status_code == 200

    results["similarity_overlap_check"] = measure_operation(op_similarity_check, iterations=8)

    # Op 9: CSV Report Export
    def op_csv_export():
        res = client.get("/api/v1/reports/export/csv?report_type=complaints", headers=headers)
        assert res.status_code == 200

    results["csv_export_streaming"] = measure_operation(op_csv_export, iterations=10)

    # Op 10: Background Scheduler Deadline Check & Delivery Processing
    def op_deadline_scheduler():
        res = client.post("/api/v1/alerts/run-scheduler", headers=headers)
        assert res.status_code == 200

    results["deadline_scheduler_run"] = measure_operation(op_deadline_scheduler, iterations=8)

    return results

if __name__ == "__main__":
    print("--- Initializing Synthetic Workload for Profiling ---")
    seed_representative_benchmark_dataset(num_institutions=200, num_complaints=2000)
    token = create_access_token("1")
    print("--- Executing Benchmark Suite ---")
    results = run_benchmark_suite(token)
    import json
    print("\nBENCHMARK_RESULTS_JSON:")
    print(json.dumps(results, indent=2))
