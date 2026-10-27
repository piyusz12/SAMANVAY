import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.evidence_attachment import (
    EvidenceAttachmentOut,
    EvidenceDeleteRequest,
    EvidenceLegalHoldRequest,
    EvidenceUploadResponse
)
from backend.app.services.evidence_service import EvidenceService
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/evidence", tags=["Evidence & Document Management"])

@router.post("/complaint/{complaint_id}/upload", response_model=EvidenceUploadResponse)
def upload_complaint_evidence(
    complaint_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    is_confidential: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Securely upload supporting evidence for a complaint case.
    Enforces format validation, magic byte checks, malware scanning,
    and opaque storage identifiers outside publicly served directories.
    """
    file_bytes = file.file.read()
    raw_name = file.filename or "evidence_document"

    attachment = EvidenceService.upload_attachment(
        db=db,
        complaint_id=complaint_id,
        user=current_user,
        raw_filename=raw_name,
        file_bytes=file_bytes,
        description=description,
        is_confidential=is_confidential
    )

    return EvidenceUploadResponse(
        attachment_id=attachment.id,
        storage_key=attachment.storage_key,
        filename=attachment.file_name,
        original_filename=attachment.original_file_name,
        sha256=attachment.sha256_checksum,
        size_bytes=attachment.file_size_bytes,
        mime_type=attachment.mime_type,
        malware_scan_status=attachment.malware_scan_status,
        status="Uploaded and verified successfully"
    )

@router.get("/complaint/{complaint_id}", response_model=List[EvidenceAttachmentOut])
def list_complaint_attachments(
    complaint_id: int,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List active evidence attachments for an authorized case.
    """
    return EvidenceService.get_attachments_for_complaint(
        db=db,
        complaint_id=complaint_id,
        user=current_user,
        include_deleted=include_deleted
    )

@router.get("/{attachment_id}", response_model=EvidenceAttachmentOut)
def get_attachment_metadata(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch comprehensive attachment metadata, hash, scan status, and hold state.
    """
    return EvidenceService.get_attachment_by_id(
        db=db,
        attachment_id=attachment_id,
        user=current_user
    )

@router.get("/{attachment_id}/download")
def download_evidence_file(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stream download authenticated evidence files through permission-checked endpoints.
    Enforces no-sniff, no-cache, and attachment content disposition.
    """
    filepath, safe_filename, mime_type = EvidenceService.download_attachment(
        db=db,
        attachment_id=attachment_id,
        user=current_user
    )

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_filename}"',
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0"
    }

    return FileResponse(
        path=filepath,
        media_type=mime_type or "application/octet-stream",
        filename=safe_filename,
        headers=headers
    )

@router.delete("/{attachment_id}")
def delete_evidence_file(
    attachment_id: int,
    payload: EvidenceDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft-delete evidence document with mandatory justification reason.
    Protects evidence from destruction during active cases or when under legal hold.
    """
    attachment = EvidenceService.delete_attachment(
        db=db,
        attachment_id=attachment_id,
        user=current_user,
        reason=payload.reason
    )

    return {
        "message": f"Evidence document '{attachment.file_name}' soft-deleted under regulatory retention policy.",
        "attachment_id": attachment.id,
        "retention_status": attachment.retention_status
    }

@router.post("/{attachment_id}/legal-hold", response_model=EvidenceAttachmentOut)
def set_evidence_legal_hold(
    attachment_id: int,
    payload: EvidenceLegalHoldRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Apply or release legal hold on an evidence attachment.
    Prevents deletion while active legal hold is in place.
    """
    return EvidenceService.set_legal_hold(
        db=db,
        attachment_id=attachment_id,
        user=current_user,
        legal_hold=payload.legal_hold,
        reason=payload.reason
    )
