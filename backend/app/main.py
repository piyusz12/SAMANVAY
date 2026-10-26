from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.services.seed_service import seed_database
from backend.app.core.logging import logger
from backend.app.core.middleware import RequestContextMiddleware
from backend.app.core.db_check import validate_database_connection
from backend.app.core.errors import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    global_unhandled_exception_handler
)

# Import routers
from backend.app.api.health import router as health_router
from backend.app.api.auth import router as auth_router
from backend.app.api.institutions import router as institutions_router
from backend.app.api.complaints import router as complaints_router
from backend.app.api.conflicts import router as conflicts_router
from backend.app.api.similarity import router as similarity_router
from backend.app.api.movements import router as movements_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.audit import router as audit_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: validates DB connection and seeds initial demo data."""
    logger.info(f"Starting {settings.PROJECT_NAME} in '{settings.APP_ENV}' mode...")

    # Validate database connection
    is_ok, diag = validate_database_connection()
    if is_ok:
        logger.info(f"Database connection VERIFIED: {diag['dialect']} ({diag['latency_ms']}ms)")
        # Ensure schema tables exist
        Base.metadata.create_all(bind=engine)
        
        # Seed synthetic demonstration data
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    else:
        logger.critical(
            f"Database connection FAILED: {diag['error']}\n"
            f"ACTIONABLE SUGGESTION: {diag['actionable_suggestion']}"
        )

    yield

    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells (SIH PS 26264)",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Register Middlewares
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Centralized Error Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_unhandled_exception_handler)

# Include API Routers
app.include_router(health_router, prefix="", tags=["Health"])
app.include_router(health_router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(institutions_router, prefix=settings.API_V1_STR)
app.include_router(complaints_router, prefix=settings.API_V1_STR)
app.include_router(conflicts_router, prefix=settings.API_V1_STR)
app.include_router(similarity_router, prefix=settings.API_V1_STR)
app.include_router(movements_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
