import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5433/newsflux"
    SECRET_KEY: str = "9a2b4def7e8f0a214bc9e8ad0f3f21873bcd4e7a8f15b3a4d9e0f6c2e8a10b4f"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google OAuth for Drive Backup
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/backup/google/callback"
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

    class Config:
        env_file = ".env"

settings = Settings()
