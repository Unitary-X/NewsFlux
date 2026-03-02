import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/newsflux")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "9a2b4def7e8f0a214bc9e8ad0f3f21873bcd4e7a8f15b3a4d9e0f6c2e8a10b4f")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

    # Google OAuth for Drive Backup
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/admin/backup/google/callback")
    GDRIVE_ENABLED: bool = os.getenv("GDRIVE_ENABLED", "false").lower() == "true"

    # Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@newsflux.app")
    EMAILS_ENABLED: bool = os.getenv("EMAILS_ENABLED", "false").lower() == "true"

    # Frontend Configuration
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    SUPPORT_EMAIL: str = os.getenv("SUPPORT_EMAIL", "support@newsflux.app")

    class Config:
        env_file = ".env"

settings = Settings()
