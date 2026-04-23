import os
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="production", description="Application environment: development, staging, or production")
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5433/newsflux",
        description="PostgreSQL connection string (use env var in production)"
    )
    SECRET_KEY: str = Field(..., description="JWT secret key for token signing - MUST be 32+ characters")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google OAuth for Drive Backup
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # Agency-admin OAuth callback (registered in Google Cloud Console)
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/backup/google/callback"
    # Super-admin OAuth callback (must also be registered in Google Cloud Console)
    GOOGLE_SA_REDIRECT_URI: str = "http://localhost:8000/api/v1/superadmin/backup/gdrive/callback"
    GDRIVE_ENABLED: bool = False

    # Email Configuration
    SMTP_SERVER: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@newsflux.app"
    EMAILS_ENABLED: bool = False

    # Frontend Configuration
    FRONTEND_URL: str = "http://localhost:5173"
    SUPPORT_EMAIL: str = "support@newsflux.app"

    # Request Timeout Configuration (in seconds)
    # These apply to external API calls (Google Drive, SMTP, etc.)
    REQUEST_TIMEOUT_SHORT: int = Field(default=5, description="Timeout for quick health checks (seconds)")
    REQUEST_TIMEOUT_MEDIUM: int = Field(default=15, description="Timeout for standard API calls (seconds)")
    REQUEST_TIMEOUT_LONG: int = Field(default=30, description="Timeout for long operations like uploads (seconds)")

    class Config:
        env_file = ".env"

settings = Settings()


def validate_configuration() -> None:
    """
    Validate critical configuration at startup
    Raises ValueError if required settings are missing or invalid
    """
    errors = []
    
    # Validate required settings
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        errors.append("SECRET_KEY must be set and at least 32 characters long")
    
    # Validate database URL
    if not settings.DATABASE_URL:
        errors.append("DATABASE_URL must be set")
    elif not (settings.DATABASE_URL.startswith("postgresql://") or 
              settings.DATABASE_URL.startswith("sqlite:///")):
        errors.append("DATABASE_URL must be PostgreSQL or SQLite")
    
    # Validate frontend URL format
    if not settings.FRONTEND_URL.startswith(("http://", "https://")):
        errors.append("FRONTEND_URL must start with http:// or https://")
    
    # Warn if email is enabled but not configured
    if settings.EMAILS_ENABLED:
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            errors.append("SMTP_USER and SMTP_PASSWORD must be set when EMAILS_ENABLED=true")
        if not settings.SMTP_SERVER:
            errors.append("SMTP_SERVER must be set when EMAILS_ENABLED=true")
    
    # Warn if Google Drive is enabled but not configured
    if settings.GDRIVE_ENABLED:
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            errors.append("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set when GDRIVE_ENABLED=true")
    
    if errors:
        error_message = "Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
        raise ValueError(error_message)

