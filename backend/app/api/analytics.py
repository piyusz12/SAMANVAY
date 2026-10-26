from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db
from backend.app.schemas.analytics import DashboardOverviewOut
from backend.app.services.analytics_service import get_dashboard_overview

router = APIRouter(prefix="/analytics", tags=["Analytics & KPIs"])

@router.get("/overview", response_model=DashboardOverviewOut)
def get_analytics(db: Session = Depends(get_db)):
    """
    Returns executive metrics, bureau performance, regional matrix,
    category distribution and institution hotspot radar.
    """
    return get_dashboard_overview(db)
