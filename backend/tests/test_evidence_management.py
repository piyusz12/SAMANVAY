import io
import zipfile
import pytest
from backend.app.config import settings
from backend.app.models.complaint import Complaint
from backend.app.models.user import User
from backend.app.models.evidence_attachment import EvidenceAttachment
from backend.app.models.audit_log import AuditLog
from backend.app.services.auth_service import create_access_token

def make_valid_docx() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        zf.writestr("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>')
    return buf.getvalue()

def make_valid_xlsx() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        zf.writestr("xl/workbook.xml", '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>')
    return buf.getvalue()

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

@pytest.fixture
def target_complaint(db_session):
    # AICTE/RB/2026/0002 belongs to REGULATION_BUREAU
    return db_session.query(Complaint).filter(Complaint.complaint_no == "AICTE/RB/2026/0002").first()

# =========================================================================
# 1. PERMITTED FORMATS & MAGIC BYTE VALIDATION
# =========================================================================

def test_permitted_formats_upload_success(client, rb_officer_token, target_complaint):
    """Verify that all permitted document formats with authentic magic bytes are accepted."""
    formats = [
        ("genuine_report.pdf", b"%PDF-1.4\nGenuine PDF document body", "application/pdf"),
        ("photo_evidence.png", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", "image/png"),
        ("site_visit.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF", "image/jpeg"),
        ("affidavit.docx", make_valid_docx(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("metrics.xlsx", make_valid_xlsx(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("data_export.csv", b"id,name,role\n1,Alpha,Dean\n2,Beta,HOD", "text/csv"),
        ("notes.txt", b"Official inspection field notes in standard UTF-8 text.", "text/plain"),
    ]

    for filename, content, expected_mime in formats:
        file_obj = io.BytesIO(content)
        resp = client.post(
            f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
            files={"file": (filename, file_obj, "application/octet-stream")},
            data={"description": f"Test upload for {filename}"},
            headers={"Authorization": f"Bearer {rb_officer_token}"}
        )
        assert resp.status_code == 200, f"Failed for format {filename}: {resp.text}"
        data = resp.json()
        assert data["mime_type"] == expected_mime
        assert data["size_bytes"] == len(content)
        assert len(data["storage_key"]) == 32  # UUID4 hex length
        assert data["malware_scan_status"] == "CLEAN"

# =========================================================================
# 2. CONTENT SIGNATURE VALIDATION (ANTI-MASQUERADING)
# =========================================================================

def test_executable_masquerading_as_pdf_rejected(client, rb_officer_token, target_complaint):
    """Verify that a Windows PE binary (.exe) renamed to .pdf is detected via magic bytes and rejected."""
    # PE Header: starts with 'MZ'
    pe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This program cannot be run in DOS mode."
    resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("malicious_payload.pdf", io.BytesIO(pe_bytes), "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 400
    assert "Executable" in resp.json()["detail"] or "DOS" in resp.json()["detail"]

def test_linux_elf_masquerading_as_png_rejected(client, rb_officer_token, target_complaint):
    """Verify that an ELF binary masquerading as .png is rejected."""
    elf_bytes = b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 20
    resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("exploit.png", io.BytesIO(elf_bytes), "image/png")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 400
    assert "ELF" in resp.json()["detail"]

def test_php_script_masquerading_as_pdf_rejected(client, rb_officer_token, target_complaint):
    """Verify that PHP script masquerading as .pdf is rejected."""
    php_bytes = b"<?php system($_GET['cmd']); ?>"
    resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("webshell.pdf", io.BytesIO(php_bytes), "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 400
    assert "PHP" in resp.json()["detail"]

def test_corrupted_or_fake_docx_rejected(client, rb_officer_token, target_complaint):
    """Verify that arbitrary text with .docx extension is rejected because it is not a valid zip archive."""
    fake_docx = b"Just plain text masquerading as word document"
    resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("fake.docx", io.BytesIO(fake_docx), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 400
    assert "Invalid DOCX signature" in resp.json()["detail"]

def test_csv_with_null_bytes_rejected(client, rb_officer_token, target_complaint):
    """Verify that binary injection in CSV files is rejected."""
    null_csv = b"col1,col2\nval1,\x00binary_inject"
    resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("polluted.csv", io.BytesIO(null_csv), "text/csv")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 400
    assert "null bytes" in resp.json()["detail"].lower()

# =========================================================================
# 3. MALWARE SCANNING & EICAR DETECTION
# =========================================================================

def test_eicar_test_virus_detection_and_blocking(client, rb_officer_token, target_complaint, db_session):
    """Verify that files containing standard EICAR test virus strings are blocked and audited."""
    eicar_content = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("eicar_test.txt", io.BytesIO(eicar_content), "text/plain")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert resp.status_code == 400
    assert "Security scan rejected file" in resp.json()["detail"]
    assert "EICAR" in resp.json()["detail"]

    # Verify audit event recorded
    audit = db_session.query(AuditLog).filter(
        AuditLog.action_type == "EVIDENCE_MALWARE_BLOCKED",
        AuditLog.complaint_id == target_complaint.id
    ).first()
    assert audit is not None
    assert "EICAR" in audit.description

# =========================================================================
# 4. OPAQUE STORAGE & METADATA STORAGE
# =========================================================================

def test_opaque_storage_identifiers_and_metadata_retrieval(client, rb_officer_token, target_complaint):
    """Verify opaque UUID storage key generation and metadata query endpoint."""
    pdf_content = b"%PDF-1.4\nAuthentic AICTE investigation annexure."
    upload_resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("annexure_A.pdf", io.BytesIO(pdf_content), "application/pdf")},
        data={"description": "Annexure A - Faculty Registers", "is_confidential": True},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert upload_resp.status_code == 200
    att_id = upload_resp.json()["attachment_id"]
    storage_key = upload_resp.json()["storage_key"]

    # Fetch metadata
    meta_resp = client.get(
        f"/api/v1/evidence/{att_id}",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert meta_resp.status_code == 200
    meta = meta_resp.json()
    assert meta["id"] == att_id
    assert meta["storage_key"] == storage_key
    assert meta["original_file_name"] == "annexure_A.pdf"
    assert meta["file_size_bytes"] == len(pdf_content)
    assert meta["legal_hold"] is False
    assert meta["download_count"] == 0
    assert meta["retention_status"] == "ACTIVE"

# =========================================================================
# 5. AUTHENTICATED DOWNLOAD STREAM & SECURITY HEADERS
# =========================================================================

def test_authenticated_download_stream_security_headers(client, rb_officer_token, target_complaint):
    """Verify download endpoint streams genuine bytes with strict security headers (no-sniff, attachment)."""
    content = b"%PDF-1.4\nConfidential Inquiry Hearing Notice"
    up_resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("hearing_notice.pdf", io.BytesIO(content), "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    att_id = up_resp.json()["attachment_id"]

    # Download file
    dl_resp = client.get(
        f"/api/v1/evidence/{att_id}/download",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert dl_resp.status_code == 200
    assert dl_resp.content == content
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert "attachment" in dl_resp.headers["content-disposition"]
    assert "hearing_notice.pdf" in dl_resp.headers["content-disposition"]
    assert dl_resp.headers["x-content-type-options"] == "nosniff"
    assert "no-cache" in dl_resp.headers["cache-control"]

    # Verify download count incremented
    meta_resp = client.get(
        f"/api/v1/evidence/{att_id}",
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert meta_resp.json()["download_count"] == 1
    assert meta_resp.json()["last_accessed_at"] is not None

# =========================================================================
# 6. BUREAU-SCOPED PERMISSIONS & IDOR PROTECTION
# =========================================================================

def test_cross_bureau_unauthorized_download_denied(client, rb_officer_token, pgrc_officer_token, target_complaint):
    """Verify that an officer from PGRC cannot view or download an attachment belonging to REGULATION_BUREAU."""
    content = b"%PDF-1.4\nBureau-restricted evidence document"
    up_resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("restricted.pdf", io.BytesIO(content), "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    att_id = up_resp.json()["attachment_id"]

    # Attempt cross-bureau view metadata
    view_resp = client.get(
        f"/api/v1/evidence/{att_id}",
        headers={"Authorization": f"Bearer {pgrc_officer_token}"}
    )
    assert view_resp.status_code == 403
    assert "outside your assigned bureau" in view_resp.json()["detail"]

    # Attempt cross-bureau download
    dl_resp = client.get(
        f"/api/v1/evidence/{att_id}/download",
        headers={"Authorization": f"Bearer {pgrc_officer_token}"}
    )
    assert dl_resp.status_code == 403
    assert "outside your assigned bureau" in dl_resp.json()["detail"]

def test_auditor_cannot_mutate_evidence(client, auditor_token, target_complaint):
    """Verify that auditors have read-only permissions and cannot upload or delete attachments."""
    content = b"%PDF-1.4\nAuditor probe"
    up_resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("auditor_test.pdf", io.BytesIO(content), "application/pdf")},
        headers={"Authorization": f"Bearer {auditor_token}"}
    )
    assert up_resp.status_code == 403
    assert "read-only" in up_resp.json()["detail"].lower()

# =========================================================================
# 7. RETENTION, DELETION POLICIES & LEGAL HOLD
# =========================================================================

def test_active_case_evidence_retention_and_legal_hold(
    client, rb_officer_token, rb_admin_token, target_complaint
):
    """
    Verify retention policies on active complaints:
    1. Regular officers cannot delete evidence from active cases.
    2. Missing or short justification reasons (< 10 chars) are rejected.
    3. Active Legal Hold prevents any deletion.
    4. Once hold is lifted, Bureau Admin can soft-delete with valid reason.
    5. Soft-deleted documents return 410 Gone on download attempts.
    """
    content = b"%PDF-1.4\nCrucial Evidence Material"
    up_resp = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("crucial_exhibit.pdf", io.BytesIO(content), "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    att_id = up_resp.json()["attachment_id"]

    # 1. Regular officer attempts deletion -> 403 Forbidden
    del_resp = client.request(
        "DELETE",
        f"/api/v1/evidence/{att_id}",
        json={"reason": "Officer wants to delete this document"},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert del_resp.status_code == 403
    assert "Bureau Administrators" in del_resp.json()["detail"]

    # 2. Bureau Admin attempts deletion with short reason (< 10 chars) -> 400 Bad Request
    short_reason_resp = client.request(
        "DELETE",
        f"/api/v1/evidence/{att_id}",
        json={"reason": "Mistake"},
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert short_reason_resp.status_code == 422 or short_reason_resp.status_code == 400

    # 3. Apply Legal Hold
    hold_resp = client.post(
        f"/api/v1/evidence/{att_id}/legal-hold",
        json={"legal_hold": True, "reason": "High Court Order Ref HC-2026-1049 injunction"},
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert hold_resp.status_code == 200
    assert hold_resp.json()["legal_hold"] is True

    # 4. Bureau Admin attempts deletion while under Legal Hold -> 400 Bad Request
    blocked_del = client.request(
        "DELETE",
        f"/api/v1/evidence/{att_id}",
        json={"reason": "Superceded by revised report received yesterday"},
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert blocked_del.status_code == 400
    assert "Legal Hold" in blocked_del.json()["detail"]

    # 5. Lift Legal Hold
    unhold_resp = client.post(
        f"/api/v1/evidence/{att_id}/legal-hold",
        json={"legal_hold": False, "reason": "Legal hold lifted following tribunal clearance"},
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert unhold_resp.status_code == 200
    assert unhold_resp.json()["legal_hold"] is False

    # 6. Now Bureau Admin soft-deletes with valid justification
    valid_del = client.request(
        "DELETE",
        f"/api/v1/evidence/{att_id}",
        json={"reason": "Superceded by official signed affidavit dated 2026-10-25"},
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert valid_del.status_code == 200
    assert valid_del.json()["retention_status"] == "DELETED"

    # 7. Download attempt on soft-deleted document returns 410 Gone
    gone_dl = client.get(
        f"/api/v1/evidence/{att_id}/download",
        headers={"Authorization": f"Bearer {rb_admin_token}"}
    )
    assert gone_dl.status_code == 410
    assert "soft-deleted" in gone_dl.json()["detail"]

# =========================================================================
# 8. CASE ATTACHMENT COUNT LIMIT ENFORCEMENT
# =========================================================================

def test_case_attachment_count_limit(client, rb_officer_token, target_complaint, db_session, monkeypatch):
    """Verify that uploading beyond MAX_ATTACHMENTS_PER_CASE is rejected."""
    # Count existing active attachments on this complaint
    existing = db_session.query(EvidenceAttachment).filter(
        EvidenceAttachment.complaint_id == target_complaint.id,
        EvidenceAttachment.retention_status != "DELETED"
    ).count()

    # Allow exactly 1 more attachment
    monkeypatch.setattr(settings, "MAX_ATTACHMENTS_PER_CASE", existing + 1)

    # First upload succeeds
    r1 = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("allowed_doc.pdf", io.BytesIO(b"%PDF-1.4 file 1"), "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert r1.status_code == 200

    # Second upload exceeds limit and is rejected
    r2 = client.post(
        f"/api/v1/evidence/complaint/{target_complaint.id}/upload",
        files={"file": ("excess_doc.pdf", io.BytesIO(b"%PDF-1.4 file 2"), "application/pdf")},
        headers={"Authorization": f"Bearer {rb_officer_token}"}
    )
    assert r2.status_code == 400
    assert "attachment limit reached" in r2.json()["detail"].lower()
