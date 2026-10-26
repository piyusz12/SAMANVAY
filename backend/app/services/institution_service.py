import csv
import io
import json
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.institution import Institution, normalize_name
from backend.app.models.complaint import Complaint
from backend.app.models.user import User
from backend.app.models.audit_log import AuditLog
from backend.app.models.case_linkage import CaseLinkage
from backend.app.schemas.institution import (
    InstitutionCreate,
    InstitutionUpdate,
    InstitutionOut,
    InstitutionDossierOut,
    ConflictAlert,
    CSVImportResponse,
    CSVImportItemResult
)
from backend.app.repositories.institution_repository import InstitutionRepository
from backend.app.services.overlap_service import check_institution_conflict, ACTIVE_STATUSES
from backend.app.services.complaint_service import calculate_sla_details
from backend.app.services.audit_service import log_audit_event
from backend.app.core.datetime_util import utc_now

OPEN_STATUSES = ["LODGED", "UNDER_INQUIRY", "SHOW_CAUSE_NOTICE", "EXPLANATION_CALLED", "ESCALATED"]
TERMINAL_STATUSES = ["RESOLVED", "DISPOSED"]

def create_institution(
    db: Session,
    data: InstitutionCreate,
    current_user: User
) -> Institution:
    """
    Creates and persists a new institution after enforcing normalized anti-duplicate rules.
    Records institutional audit history without logging sensitive credentials.
    """
    repo = InstitutionRepository(db)
    is_dup, matched, strategy, confidence, msg = repo.check_duplicate_or_match(
        aicte_id=data.aicte_id,
        aishe_code=data.aishe_code,
        name=data.name,
        city=data.city,
        state=data.state
    )

    if is_dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Registration rejected due to duplicate institution: {msg}"
        )

    inst_obj = Institution(
        aicte_id=data.aicte_id.strip(),
        aishe_code=data.aishe_code.strip() if data.aishe_code else None,
        name=data.name.strip(),
        normalized_name=normalize_name(data.name),
        state=data.state.strip(),
        city=data.city.strip(),
        pin_code=data.pin_code.strip() if data.pin_code else None,
        region=data.region.strip(),
        institution_type=data.institution_type.strip(),
        approval_status=data.approval_status.strip() if data.approval_status else "APPROVED",
        address=data.address.strip() if data.address else None,
        contact_email=data.contact_email.strip() if data.contact_email else None,
        contact_phone=data.contact_phone.strip() if data.contact_phone else None,
        is_active=True,
        is_deleted=False,
        created_at=utc_now(),
        updated_at=utc_now()
    )
    repo.create(inst_obj)
    db.commit()
    db.refresh(inst_obj)

    log_audit_event(
        db=db,
        action_type="INSTITUTION_CREATED",
        description=f"Institution '{inst_obj.name}' registered with AICTE ID {inst_obj.aicte_id}.",
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        institution_id=inst_obj.id,
        commit=True
    )

    return inst_obj

def update_institution(
    db: Session,
    institution_id: int,
    data: InstitutionUpdate,
    current_user: User
) -> Institution:
    """
    Updates institution record, checks uniqueness constraints for modified identifiers,
    recalculates normalized name if name changed, and writes audit history diff.
    """
    repo = InstitutionRepository(db)
    inst = repo.get_by_id(institution_id)
    if not inst or inst.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution ID {institution_id} not found."
        )

    update_dict = data.model_dump(exclude_unset=True)
    if not update_dict:
        return inst

    # Check duplicates on modified identifiers
    new_aishe = update_dict.get("aishe_code", inst.aishe_code)
    new_name = update_dict.get("name", inst.name)
    new_city = update_dict.get("city", inst.city)
    new_state = update_dict.get("state", inst.state)

    is_dup, matched, strategy, confidence, msg = repo.check_duplicate_for_update(
        exclude_id=inst.id,
        aicte_id=None,  # AICTE Permanent ID is immutable
        aishe_code=new_aishe if "aishe_code" in update_dict else None,
        name=new_name if "name" in update_dict or "city" in update_dict or "state" in update_dict else None,
        city=new_city if "name" in update_dict or "city" in update_dict or "state" in update_dict else None,
        state=new_state if "name" in update_dict or "city" in update_dict or "state" in update_dict else None
    )

    if is_dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Update rejected due to conflict with existing institution: {msg}"
        )

    # Capture previous state for audit trail
    previous_state = {
        "name": inst.name,
        "region": inst.region,
        "state": inst.state,
        "city": inst.city,
        "institution_type": inst.institution_type,
        "approval_status": inst.approval_status,
        "address": inst.address,
        "contact_email": inst.contact_email,
        "contact_phone": inst.contact_phone
    }

    # Apply updates
    for field, val in update_dict.items():
        if hasattr(inst, field) and val is not None:
            setattr(inst, field, val.strip() if isinstance(val, str) else val)

    if "name" in update_dict and update_dict["name"]:
        inst.normalized_name = normalize_name(update_dict["name"])

    inst.updated_at = utc_now()
    db.commit()
    db.refresh(inst)

    new_state = {
        "name": inst.name,
        "region": inst.region,
        "state": inst.state,
        "city": inst.city,
        "institution_type": inst.institution_type,
        "approval_status": inst.approval_status,
        "address": inst.address,
        "contact_email": inst.contact_email,
        "contact_phone": inst.contact_phone
    }

    # Find modified attributes
    changed_fields = [k for k in new_state if previous_state[k] != new_state[k]]
    change_desc = f"Institution '{inst.name}' updated. Modified fields: {', '.join(changed_fields)}."

    log_audit_event(
        db=db,
        action_type="INSTITUTION_UPDATED",
        description=change_desc,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_bureau=current_user.bureau,
        institution_id=inst.id,
        previous_state=json.dumps(previous_state),
        new_state=json.dumps(new_state),
        commit=True
    )

    return inst

def get_institution_dossier(
    db: Session,
    institution_id: int,
    current_user: Optional[User] = None
) -> InstitutionDossierOut:
    """
    Generates 360-degree consolidated institutional dossier:
    Consolidates complaint history, exact counts (total, open, pending, disposed, overdue, overlapping),
    multi-bureau conflict radar alert, and audit history.
    """
    repo = InstitutionRepository(db)
    inst = repo.get_by_id(institution_id)
    if not inst or inst.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution ID {institution_id} not found."
        )

    complaints = db.query(Complaint).filter(
        Complaint.institution_id == institution_id,
        Complaint.is_deleted == False
    ).order_by(Complaint.created_at.desc()).all()

    # Exact breakdown counts
    total_count = len(complaints)
    open_count = sum(1 for c in complaints if c.status in OPEN_STATUSES)
    pending_count = sum(1 for c in complaints if c.status in ACTIVE_STATUSES)
    disposed_count = sum(1 for c in complaints if c.status in TERMINAL_STATUSES)
    
    # Calculate overdue
    overdue_count = 0
    recent_complaints_data = []
    complaint_ids = [c.id for c in complaints]

    # Find cases involved in cross-case linkages
    linked_ids = set()
    if complaint_ids:
        linkages = db.query(CaseLinkage).filter(
            (CaseLinkage.source_complaint_id.in_(complaint_ids)) |
            (CaseLinkage.target_complaint_id.in_(complaint_ids))
        ).all()
        for l in linkages:
            linked_ids.add(l.source_complaint_id)
            linked_ids.add(l.target_complaint_id)

    bureaus_set = set()
    for c in complaints:
        bureaus_set.add(c.bureau)
        days_open, is_overdue, sla_status = calculate_sla_details(c)
        if is_overdue and c.status in ACTIVE_STATUSES:
            overdue_count += 1

        recent_complaints_data.append({
            "id": c.id,
            "complaint_no": c.complaint_no,
            "bureau": c.bureau,
            "subject": c.subject,
            "category": c.category,
            "status": c.status,
            "priority": c.priority,
            "days_open": days_open,
            "is_overdue": is_overdue,
            "sla_status": sla_status,
            "created_at": c.created_at.isoformat(),
            "assigned_officer_name": c.assigned_officer_name,
            "has_linkage": c.id in linked_ids
        })

    # Overlapping complaints count: active complaints involved in conflict or linkages
    conflict_data = check_institution_conflict(db, institution_id)
    overlapping_count = conflict_data["active_cases_count"] if conflict_data["has_conflict"] else len(linked_ids)

    conflict_alert = ConflictAlert(
        has_conflict=conflict_data["has_conflict"],
        bureaus_involved=conflict_data["bureaus_involved"],
        active_cases_count=conflict_data["active_cases_count"],
        message=conflict_data["message"]
    )

    # Fetch audit history for this institution
    audit_logs = db.query(AuditLog).filter(
        AuditLog.institution_id == institution_id
    ).order_by(AuditLog.timestamp.desc()).limit(50).all()

    audit_history_data = [
        {
            "id": log.id,
            "action_type": log.action_type,
            "description": log.description,
            "actor_name": log.actor_name,
            "actor_role": log.actor_role,
            "actor_bureau": log.actor_bureau,
            "timestamp": log.timestamp.isoformat()
        }
        for log in audit_logs
    ]

    return InstitutionDossierOut(
        institution=InstitutionOut.model_validate(inst),
        total_complaints=total_count,
        active_complaints=pending_count,
        open_complaints=open_count,
        pending_complaints=pending_count,
        disposed_complaints=disposed_count,
        overdue_complaints=overdue_count,
        overlapping_complaints=overlapping_count,
        bureaus_involved=list(bureaus_set),
        conflict_alert=conflict_alert,
        recent_complaints=recent_complaints_data,
        audit_history=audit_history_data
    )

def import_institutions_csv(
    db: Session,
    csv_text: str,
    dry_run: bool,
    current_user: User
) -> CSVImportResponse:
    """
    Parses and validates synthetic CSV institution datasets.
    Performs deterministic duplicate detection per row.
    Returns preview report or commits non-duplicate records to PostgreSQL.
    """
    repo = InstitutionRepository(db)
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    
    results: List[CSVImportItemResult] = []
    imported_count = 0
    duplicate_count = 0
    error_count = 0
    now = utc_now()

    required_fields = ["aicte_id", "name", "state", "city", "region", "institution_type"]

    for row_idx, row in enumerate(reader, start=1):
        # Normalize keys (strip whitespace and lower/upper match)
        clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}

        # Check required fields
        missing = [f for f in required_fields if not clean_row.get(f)]
        if missing:
            error_count += 1
            results.append(CSVImportItemResult(
                row_number=row_idx,
                aicte_id=clean_row.get("aicte_id", "N/A"),
                name=clean_row.get("name", "N/A"),
                status="VALIDATION_ERROR",
                reason=f"Missing required columns: {', '.join(missing)}"
            ))
            continue

        aicte_id = clean_row["aicte_id"]
        name = clean_row["name"]
        aishe_code = clean_row.get("aishe_code")
        city = clean_row["city"]
        state = clean_row["state"]
        region = clean_row["region"]
        inst_type = clean_row["institution_type"]
        approval = clean_row.get("approval_status", "APPROVED")
        pin = clean_row.get("pin_code")
        addr = clean_row.get("address")
        email = clean_row.get("contact_email")
        phone = clean_row.get("contact_phone")

        # Anti-duplicate check
        is_dup, matched, strategy, confidence, msg = repo.check_duplicate_or_match(
            aicte_id=aicte_id,
            aishe_code=aishe_code,
            name=name,
            city=city,
            state=state
        )

        if is_dup:
            duplicate_count += 1
            results.append(CSVImportItemResult(
                row_number=row_idx,
                aicte_id=aicte_id,
                name=name,
                status="DUPLICATE_SKIPPED",
                reason=msg,
                matched_institution_id=matched.id if matched else None
            ))
            continue

        # If not dry run, persist
        if not dry_run:
            new_inst = Institution(
                aicte_id=aicte_id,
                aishe_code=aishe_code if aishe_code else None,
                name=name,
                normalized_name=normalize_name(name),
                state=state,
                city=city,
                pin_code=pin,
                region=region,
                institution_type=inst_type,
                approval_status=approval,
                address=addr,
                contact_email=email,
                contact_phone=phone,
                is_active=True,
                is_deleted=False,
                created_at=now,
                updated_at=now
            )
            db.add(new_inst)

        imported_count += 1
        results.append(CSVImportItemResult(
            row_number=row_idx,
            aicte_id=aicte_id,
            name=name,
            status="IMPORTED" if not dry_run else "VALID_PREVIEW",
            reason="Validation passed, ready for ingestion." if dry_run else "Successfully registered in registry."
        ))

    if not dry_run and imported_count > 0:
        db.commit()
        log_audit_event(
            db=db,
            action_type="DATASET_IMPORTED",
            description=f"Batch imported {imported_count} institutions from CSV dataset. {duplicate_count} skipped as duplicates.",
            actor_id=current_user.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_bureau=current_user.bureau,
            commit=True
        )

    mode_label = "Dry-run validation" if dry_run else "Dataset import"
    summary_msg = f"{mode_label} complete: {imported_count} valid, {duplicate_count} duplicates flagged, {error_count} format errors."

    return CSVImportResponse(
        dry_run=dry_run,
        total_rows=len(results),
        imported_count=imported_count,
        skipped_duplicates_count=duplicate_count,
        error_count=error_count,
        results=results,
        message=summary_msg
    )
