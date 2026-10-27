import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SAMANVAY - AICTE Integrated Complaint Dashboard"
    PROJECT_SUBTITLE: str = "Cross-Bureau Monitoring & Tracking System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment mode: development | test | production
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
    SEED_SYNTHETIC_DATA: bool = os.getenv("SEED_SYNTHETIC_DATA", "True").lower() in ("true", "1")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "samanvay-aicte-secure-token-key-production-grade")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database: Supports PostgreSQL or local SQLite fallback
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./samanvay.db")
    
    # Logging & Observability
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "standard")  # standard | json
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    BACKGROUND_WORKER_HEARTBEAT_PATH: str = os.getenv(
        "BACKGROUND_WORKER_HEARTBEAT_PATH",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "worker_heartbeat.json")
    )

    # CORS: Explicit authorized origins (prevent wildcard with credentials)
    @property
    def cors_origins(self) -> List[str]:
        env_origins = os.getenv("CORS_ORIGINS")
        if env_origins:
            return [o.strip() for o in env_origins.split(",") if o.strip()]
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]

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
            if self.DEBUG:
                raise ValueError(
                    "[CONFIGURATION ERROR] DEBUG mode must be False in production! Set DEBUG=False."
                )
            if self.SEED_SYNTHETIC_DATA:
                raise ValueError(
                    "[CONFIGURATION ERROR] SEED_SYNTHETIC_DATA must be False in production! Set SEED_SYNTHETIC_DATA=False."
                )
            sec_lower = self.SECRET_KEY.lower()
            if len(self.SECRET_KEY) < 32 or any(w in sec_lower for w in ("insecure", "production-grade", "change-in-production", "secret")):
                raise ValueError(
                    "[CONFIGURATION ERROR] Insecure or short SECRET_KEY detected in production environment! "
                    "Generate a cryptographically secure random string of at least 32 characters (e.g. openssl rand -hex 32) "
                    "and set SECRET_KEY in your production environment variables."
                )
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError(
                    "[CONFIGURATION ERROR] SQLite database specified in production environment! "
                    "Production deployment requires a robust, managed PostgreSQL instance (e.g. postgresql://user:pass@host:5432/db). "
                    "Configure DATABASE_URL accordingly."
                )

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
settings.validate_configuration()
