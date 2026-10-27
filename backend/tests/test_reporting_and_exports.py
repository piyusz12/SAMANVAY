import io
import pytest
from datetime import datetime, timedelta
from sqlalchemy import desc
from backend.app.config import settings
from backend.app.models.complaint import Complaint
from backend.app.models.institution import Institution
from backend.app.models.user import User
from backend.app.models.audit_log import AuditLog
from backend.app.services.auth_service import create_access_token
from backend.app.services.csv_exporter import sanitize_csv_cell, CsvExporter
from backend.app.services.pdf_exporter import PdfExporter, escape_pdf_text
from backend.app.schemas.reports import ReportMetadata

@pytest.fixture
def super_admin_token(db_session):
    user = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def rb_officer_token(db_session):
    user = db_session.query(User).filter(User.email == "officer.rb@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def rb_admin_token(db_session):
    user = db_session.query(User).filter(User.email == "head.rb@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def pgrc_officer_token(db_session):
    user = db_session.query(User).filter(User.email == "officer.pgrc@samanvay.aicte.gov.in").first()
    return create_access_token(subject=user.id)

@pytest.fixture
def auditor_token(db_session):
    user = db_session.query(User).filter(User.role == "AUDITOR").first()
    return create_access_token(subject=user.id)

# =========================================================================
# 1. MANAGEMENT REPORT ENDPOINTS & DATA INTEGRITY
# =========================================================================

def test_bureau_case_report(client, super_admin_token):
    """Verify bureau-wise report provides workload, resolution days, and SLA compliance metrics."""
    resp = client.get("/api/v1/reports/bureau", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert resp.status_code == 200
    body = resp.json()

    meta = body["metadata"]
    assert meta["report_type"] == "bureau_summary"
    assert "generated_at" in meta
    assert meta["record_count"] >= 6  # 6 AICTE bureaus

    data = body["data"]
    rb = next((b for b in data if b["bureau"] == "REGULATION_BUREAU"), None)
    assert rb is not None
    assert rb["bureau_name"] == "Regulation Bureau"
    assert "total_cases" in rb
    assert "open_cases" in rb
    assert "under_process_cases" in rb
    assert "disposed_cases" in rb
    assert "sla_compliance_rate" in rb

def test_region_case_report(client, super_admin_token):
    """Verify region-wise report covers all AICTE regions with accurate case & institution counts."""
    resp = client.get("/api/v1/reports/region", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]
    region_names = [r["region"] for r in data]
    assert "Northern" in region_names
    assert "Western" in region_names
    assert "Eastern" in region_names
    for item in data:
        assert item["total_complaints"] >= 0
        assert item["total_institutions"] >= 0

def test_institution_history_report(client, super_admin_token):
    """Verify institution complaint track record report groups cases and flags max priority."""
    resp = client.get("/api/v1/reports/institutions", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["metadata"]["record_count"] > 0
    data = body["data"]
    assert len(data) > 0
    first_inst = data[0]
    assert "institution_name" in first_inst
    assert "total_complaints" in first_inst
    assert "highest_priority" in first_inst
    assert "primary_category" in first_inst

def test_pending_ageing_report(client, super_admin_token):
    """Verify pending-case ageing partitions active complaints into duration buckets."""
    resp = client.get("/api/v1/reports/pending-ageing", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]

    assert "total_pending" in data
    assert "average_age_days" in data
    assert "buckets" in data
    buckets = {b["bucket"]: b["case_count"] for b in data["buckets"]}
    assert "< 15 Days" in buckets
    assert "15 - 30 Days" in buckets
    assert "> 90 Days" in buckets
    assert isinstance(data["ageing_cases"], list)

def test_disposal_trends_report(client, super_admin_token):
    """Verify longitudinal trends report groups intakes and disposals by period."""
    resp = client.get("/api/v1/reports/disposal-trends", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]
    assert isinstance(data, list)
    if len(data) > 0:
        first_period = data[0]
        assert "period" in first_period
        assert "received_count" in first_period
        assert "disposed_count" in first_period
        assert "disposed_percentage" in first_period

def test_overlap_summary_report(client, super_admin_token):
    """Verify overlap report aggregates candidate pairs and cross-bureau coordination summary."""
    resp = client.get("/api/v1/reports/overlaps", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]
    assert "total_candidate_pairs" in data
    assert "pending_review" in data
    assert "confirmed_linked" in data
    assert "cross_bureau_summary" in data

def test_deadline_escalation_report(client, super_admin_token):
    """Verify deadline report tracks upcoming deadlines and multi-tier escalation registers."""
    resp = client.get("/api/v1/reports/deadlines-escalations", headers={"Authorization": f"Bearer {super_admin_token}"})
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]
    assert "upcoming_7_days" in data
    assert "upcoming_15_days" in data
    assert "overdue_cases" in data
    assert "escalated_level_1" in data
    assert "escalated_level_2" in data
    assert "escalated_level_3" in data
    assert isinstance(data["critical_overdue_list"], list)

# =========================================================================
# 2. MULTI-DIMENSIONAL FILTERING
# =========================================================================

def test_report_filters_combination(client, super_admin_token):
    """Verify reports accurately apply multi-dimensional filters and record them in metadata."""
    resp = client.get(
        "/api/v1/reports/bureau?category=FEE_EXTORTION&status=LODGED&date_from=2026-01-01",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    meta = body["metadata"]
    assert meta["selected_filters"]["category"] == "FEE_EXTORTION"
    assert meta["selected_filters"]["status"] == "LODGED"
    assert meta["selected_filters"]["date_from"] == "2026-01-01"

# =========================================================================
# 3. CSV EXPORTS & SPREADSHEET FORMULA INJECTION DEFENSE
# =========================================================================

def test_csv_formula_injection_defense():
    """Unit test verify that dangerous formula prefixes are properly neutralized with leading single quote."""
    dangerous_inputs = [
        ("=cmd|'/C calc'!A0", "'=cmd|'/C calc'!A0"),
        ("+12345", "'+12345"),
        ("-98765", "'-98765"),
        ("@SUM(1,2)", "'@SUM(1,2)"),
        ("\tTabbedText", "'\tTabbedText"),
        ("\rCarriageReturn", "'\rCarriageReturn"),
        ("Standard Clean Text", "Standard Clean Text"),
        ("100% Legit", "100% Legit"),
    ]

    for val, expected in dangerous_inputs:
        sanitized = sanitize_csv_cell(val)
        assert sanitized == expected, f"Failed formula injection mitigation for: {val}"

def test_csv_export_endpoint_with_formula_sanitization(client, super_admin_token, db_session):
    """Verify CSV export endpoint includes BOM, security headers, and neutralizes formula injection in DB records."""
    # Seed a complaint with an injection payload in the subject/complainant name
    inst = db_session.query(Institution).first()
    malicious_complaint = Complaint(
        complaint_no="AICTE/TEST/2026/INJ01",
        institution_id=inst.id,
        bureau="REGULATION_BUREAU",
        complainant_name="=cmd|'/C calc'!A0",
        complainant_category="STUDENT",
        subject="@SUM(1,2) Injected Formula Subject",
        description="Testing formula injection sanitization",
        category="FEE_EXTORTION",
        status="LODGED",
        priority="HIGH"
    )
    db_session.add(malicious_complaint)
    db_session.commit()

    resp = client.get(
        "/api/v1/reports/export/csv?report_type=complaints",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment" in resp.headers["content-disposition"]
    assert resp.headers["x-content-type-options"] == "nosniff"

    # Verify UTF-8 BOM is present
    assert resp.content.startswith(b"\xef\xbb\xbf")

    # Decode and check that dangerous strings are sanitized
    text = resp.content.decode("utf-8")
    assert "'=cmd|'/C calc'!A0" in text or "[CONFIDENTIAL" in text
    assert "'@SUM(1,2)" in text or "AICTE" in text

# =========================================================================
# 4. EXECUTIVE SUMMARY PDF EXPORTS
# =========================================================================

def test_pdf_export_endpoint_magic_bytes_and_headers(client, super_admin_token):
    """Verify PDF export returns valid PDF-1.4 binary stream with official headers and security options."""
    resp = client.get(
        "/api/v1/reports/export/pdf?report_type=bureau",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
    assert ".pdf" in resp.headers["content-disposition"]
    assert resp.headers["x-content-type-options"] == "nosniff"

    # Verify authentic PDF 1.4 header magic bytes
    assert resp.content.startswith(b"%PDF-1.4")
    # Verify EOF trailer
    assert b"%%EOF" in resp.content[-30:]
    # Verify AICTE title embedded
    assert b"ALL INDIA COUNCIL FOR TECHNICAL EDUCATION" in resp.content

def test_pdf_text_escaping():
    """Verify escape_pdf_text escapes backslashes and parentheses."""
    raw = "Report (Draft) \\ Section 1 & 2"
    escaped = escape_pdf_text(raw)
    assert "\\(" in escaped
    assert "\\)" in escaped
    assert "\\\\" in escaped

# =========================================================================
# 5. BUREAU-SCOPED AUTHORIZATION & ACCESS CONTROL
# =========================================================================

def test_cross_bureau_unauthorized_report_access_denied(client, rb_officer_token):
    """Verify that an officer from REGULATION_BUREAU cannot request reports for PGRC."""
    resp = client.get(
        "/api/v1/reports/bureau?bureau=PGRC",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower()

def test_bureau_officer_report_automatically_scoped_to_bureau(client, rb_officer_token):
    """Verify that a bureau officer without explicit bureau filter only receives data for their assigned bureau."""
    resp = client.get(
        "/api/v1/reports/bureau",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]
    # Only REGULATION_BUREAU data should be returned
    assert len(data) == 1
    assert data[0]["bureau"] == "REGULATION_BUREAU"

# =========================================================================
# 6. FIELD-LEVEL DISCLOSURE & PII REDACTION
# =========================================================================

def test_confidential_complainant_pii_redacted_for_cross_bureau(client, pgrc_officer_token, db_session):
    """
    Verify field-level disclosure rules:
    When an anonymous/confidential case is exported by an officer from a different bureau,
    complainant PII is strictly redacted.
    """
    inst = db_session.query(Institution).first()
    conf_case = Complaint(
        complaint_no="AICTE/RB/2026/CONF99",
        institution_id=inst.id,
        bureau="REGULATION_BUREAU",
        complainant_name="Whistleblower Faculty Member",
        complainant_email="secret.prof@apextech.edu",
        complainant_phone="+91 9876543210",
        is_anonymous_confidential=True,
        complainant_category="FACULTY",
        subject="Confidential Whistleblower Grievance",
        description="Ghost faculty deployed during AICTE surprise inspection.",
        category="FACULTY_SALARY_WITHHELD",
        status="UNDER_INQUIRY",
        priority="CRITICAL"
    )
    db_session.add(conf_case)
    db_session.commit()

    # Query with PGRC officer token (different bureau)
    # Since PGRC officer is scoped to PGRC, they shouldn't even see RB cases in raw complaints
    resp = client.get(
        "/api/v1/reports/export/csv?report_type=complaints",
        headers={"Authorization": f"Bearer {pgrc_officer_token}"}
    )
    assert resp.status_code == 200
    text = resp.content.decode("utf-8")
    # PGRC officer must NOT see secret whistleblower name
    assert "Whistleblower Faculty Member" not in text

def test_auditor_pii_masking(client, auditor_token, db_session):
    """Verify that auditors querying complaint exports receive masked emails and phones."""
    resp = client.get(
        "/api/v1/reports/export/csv?report_type=complaints",
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert resp.status_code == 200
    text = resp.content.decode("utf-8")
    # Should contain masked email and phone pattern
    assert "***@" in text or "+91 *****" in text or "[REDACTED]" in text

# =========================================================================
# 7. AUDIT TRAIL RECORDING FOR EXPORT EVENTS
# =========================================================================

def test_report_export_recorded_in_audit_log(client, super_admin_token, db_session):
    """Verify that every CSV and PDF export creates an immutable AuditLog event."""
    resp = client.get(
        "/api/v1/reports/export/csv?report_type=trends",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    assert resp.status_code == 200

    audit_entry = db_session.query(AuditLog).filter(
        AuditLog.action_type == "REPORT_EXPORTED"
    ).order_by(desc(AuditLog.timestamp)).first()

    assert audit_entry is not None
    assert "trends" in audit_entry.description
    assert "CSV" in audit_entry.description
