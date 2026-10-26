from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.services.seed_service import seed_database

# Import routers
from backend.app.api.auth import router as auth_router
from backend.app.api.institutions import router as institutions_router
from backend.app.api.complaints import router as complaints_router
from backend.app.api.conflicts import router as conflicts_router
from backend.app.api.similarity import router as similarity_router
from backend.app.api.movements import router as movements_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.audit import router as audit_router

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells (SIH PS 26264)",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(institutions_router, prefix=settings.API_V1_STR)
app.include_router(complaints_router, prefix=settings.API_V1_STR)
app.include_router(conflicts_router, prefix=settings.API_V1_STR)
app.include_router(similarity_router, prefix=settings.API_V1_STR)
app.include_router(movements_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    """Seed synthetic demonstration data on initial launch."""
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
