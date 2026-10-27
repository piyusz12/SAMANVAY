import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SAMANVAY - AICTE Integrated Complaint Dashboard"
    PROJECT_SUBTITLE: str = "Cross-Bureau Monitoring & Tracking System (SIH PS 26264)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment mode: development | test | production
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
    SEED_SYNTHETIC_DATA: bool = os.getenv("SEED_SYNTHETIC_DATA", "True").lower() in ("true", "1")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "samanvay-aicte-secure-token-key-26264-production-grade")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database: Supports PostgreSQL or local SQLite fallback
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./samanvay.db")
    
    # CORS: Explicit authorized origins (prevent wildcard with credentials)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Upload & Evidence storage directories (outside publicly served roots)
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    EVIDENCE_STORAGE_DIR: str = os.getenv(
        "EVIDENCE_STORAGE_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "evidence")
    )
    EVIDENCE_QUARANTINE_DIR: str = os.getenv(
        "EVIDENCE_QUARANTINE_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "quarantine")
    )
    BACKUP_STORAGE_DIR: str = os.getenv(
        "BACKUP_STORAGE_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "backups")
    )

    # Document & attachment policies
    MAX_ATTACHMENT_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    MAX_ATTACHMENTS_PER_CASE: int = 10
    ALLOWED_DOCUMENT_EXTENSIONS: List[str] = [
        ".pdf", ".docx", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".txt"
    ]
    MALWARE_SCAN_ENABLED: bool = True
    CLAMAV_HOST: str = os.getenv("CLAMAV_HOST", "")
    CLAMAV_PORT: int = int(os.getenv("CLAMAV_PORT", "3310"))

    # Reporting & Export limits
    MAX_EXPORT_ROWS: int = 5000
    
    def validate_configuration(self):
        """Validates critical settings and emits actionable startup diagnostics."""
        if self.APP_ENV == "production":
            if "insecure" in self.SECRET_KEY or "production-grade" in self.SECRET_KEY:
                raise ValueError(
                    "[CONFIGURATION ERROR] Insecure default SECRET_KEY detected in production environment! "
                    "Generate a cryptographically secure random string (e.g. openssl rand -hex 32) "
                    "and set SECRET_KEY in your .env or environment variables."
                )
            if self.DATABASE_URL.startswith("sqlite"):
                import warnings
                warnings.warn(
                    "[CONFIGURATION WARNING] SQLite database specified in production environment! "
                    "Please configure a production PostgreSQL instance via DATABASE_URL.",
                    UserWarning
                )

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
settings.validate_configuration()
