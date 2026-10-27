from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_optional_current_user
from backend.app.models.user import User
from backend.app.schemas.analytics import DashboardOverviewOut
from backend.app.services.analytics_service import get_dashboard_overview

router = APIRouter(prefix="/analytics", tags=["Analytics & KPIs"])

@router.get("/overview", response_model=DashboardOverviewOut)
def get_analytics(
    bureau: Optional[str] = Query(None, description="Filter by Bureau (e.g. REGULATION_BUREAU, PGRC)"),
    region: Optional[str] = Query(None, description="Filter by AICTE Region"),
    status: Optional[str] = Query(None, description="Filter by Status"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    assigned_officer_id: Optional[int] = Query(None, description="Filter by Assigned Desk Officer ID"),
    institution_id: Optional[int] = Query(None, description="Filter by Institution ID"),
    date_from: Optional[str] = Query(None, description="Filter by start date (ISO)"),
    date_to: Optional[str] = Query(None, description="Filter by end date (ISO)"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Returns role-aware executive metrics, longitudinal trends, ageing distribution,
    bureau-wise workload, and institution complaint summaries with multi-dimensional filtering.
    """
    return get_dashboard_overview(
        db=db,
        current_user=current_user,
        bureau=bureau,
        region=region,
        status_filter=status,
        category=category,
        assigned_officer_id=assigned_officer_id,
        institution_id=institution_id,
        date_from=date_from,
        date_to=date_to
    )
