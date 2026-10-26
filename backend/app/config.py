import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SAMANVAY - AICTE Integrated Complaint Dashboard"
    PROJECT_SUBTITLE: str = "Cross-Bureau Monitoring & Tracking System (SIH PS 26264)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment mode: development | test | production
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "samanvay-aicte-secure-token-key-26264-production-grade")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database: Supports PostgreSQL or local SQLite fallback
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./samanvay.db")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]
    
    # Upload directory
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    
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

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
settings.validate_configuration()
