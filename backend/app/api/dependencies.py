from typing import Generator
from fastapi import Request, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def require_role(allowed_roles: list[str]):
    def role_checker(request: Request):
        user_role = getattr(request.state, 'role', None)
        if not user_role or user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required permissions.",
            )
        return user_role
    return role_checker
