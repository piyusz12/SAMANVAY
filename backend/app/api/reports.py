from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.api.auth import get_current_user
from backend.app.schemas.reports import GenericReportResponse
from backend.app.services.reporting_service import ReportingService

router = APIRouter(prefix="/reports", tags=["Reporting & Controlled Exports"])

def extract_filter_params(
    bureau: Optional[str] = Query(None, description="Filter by AICTE Bureau"),
    region: Optional[str] = Query(None, description="Filter by AICTE Region"),
    category: Optional[str] = Query(None, description="Filter by Complaint Category"),
    status: Optional[str] = Query(None, description="Filter by Case Status"),
    priority: Optional[str] = Query(None, description="Filter by Priority"),
    institution_id: Optional[int] = Query(None, description="Filter by Institution ID"),
    date_from: Optional[str] = Query(None, description="Filter by start date (ISO string YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter by end date (ISO string YYYY-MM-DD)")
) -> dict:
    return {
        "bureau": bureau,
        "region": region,
        "category": category,
        "status": status,
        "priority": priority,
        "institution_id": institution_id,
        "date_from": date_from,
        "date_to": date_to
    }

@router.get("/bureau", response_model=GenericReportResponse)
def get_bureau_report(
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bureau-wise case reports with open, under process, disposed, transferred,
    overdue metrics, average resolution duration, and SLA compliance rates.
    """
    return ReportingService.get_bureau_report(db, current_user, filters)

@router.get("/region", response_model=GenericReportResponse)
def get_region_report(
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Region-wise reports across all 7 AICTE regions with active, resolved,
    overdue case counts and unique institution coverage.
    """
    return ReportingService.get_region_report(db, current_user, filters)

@router.get("/institutions", response_model=GenericReportResponse)
@router.get("/institution", response_model=GenericReportResponse)
def get_institution_history_report(
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Institution-wise complaint histories showing grievance volumes,
    active vs resolved ratio, maximum severity priority, and top category.
    """
    return ReportingService.get_institution_history_report(db, current_user, filters)

@router.get("/pending-ageing", response_model=GenericReportResponse)
@router.get("/ageing", response_model=GenericReportResponse)
def get_pending_ageing_report(
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Pending-case ageing distribution partitioned into <15d, 15-30d,
    31-60d, 61-90d, and >90d buckets with individual case listings.
    """
    return ReportingService.get_pending_ageing_report(db, current_user, filters)

@router.get("/disposal-trends", response_model=GenericReportResponse)
@router.get("/trends", response_model=GenericReportResponse)
def get_disposal_trends_report(
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Longitudinal disposal and resolution trend reports with monthly
    breakdown, intake vs disposal counts, and average resolution days.
    """
    return ReportingService.get_disposal_trends_report(db, current_user, filters)

@router.get("/overlaps", response_model=GenericReportResponse)
def get_overlap_report(
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Potential and confirmed cross-bureau overlap reports, candidate pairs
    awaiting coordination review, and inter-bureau linkage summary.
    """
    return ReportingService.get_overlap_report(db, current_user, filters)

@router.get("/deadlines-escalations", response_model=GenericReportResponse)
@router.get("/deadlines", response_model=GenericReportResponse)
def get_deadlines_escalations_report(
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Regulatory deadline alerts, upcoming SLA warnings (7 & 15 days),
    overdue case registers, and multi-tier escalation breakdown.
    """
    return ReportingService.get_deadline_escalation_report(db, current_user, filters)

@router.get("/export/csv")
def export_report_csv(
    report_type: str = Query("complaints", description="Type of report: bureau, region, institution, ageing, trends, overlaps, deadlines, complaints"),
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Controlled server-generated CSV export with spreadsheet formula injection
    mitigation (prepends ' to dangerous characters), UTF-8 BOM, field-level PII
    redaction, bounded limits, and immutable audit logging.
    """
    csv_bytes, filename = ReportingService.export_report_csv(
        db=db,
        user=current_user,
        report_type=report_type,
        filters=filters
    )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }

    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers=headers
    )

@router.get("/export/pdf")
def export_report_pdf(
    report_type: str = Query("complaints", description="Type of report: bureau, region, institution, ageing, trends, overlaps, deadlines, complaints"),
    filters: dict = Depends(extract_filter_params),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executive summary PDF export with official AICTE header, metadata block,
    safe text escaping, table layouts, page numbering, and audit trail record.
    """
    pdf_bytes, filename = ReportingService.export_report_pdf(
        db=db,
        user=current_user,
        report_type=report_type,
        filters=filters
    )

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    }

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers
    )
