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

    class Config:
        env_file = ".env"

settings = Settings()
