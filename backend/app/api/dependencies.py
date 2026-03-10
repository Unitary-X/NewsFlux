from typing import Generator
from fastapi import Request, HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator:
    """
    Get database session with connection error handling.
    Raises HTTP 503 if database is unavailable.
    """
    db = None
    try:
        db = SessionLocal()
        # Test connection with a simple query
        db.execute(text("SELECT 1"))
        yield db
    except OperationalError as e:
        logger.error(f"Database connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable. Please try again later."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected database error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected database error occurred."
        )
    finally:
        if db:
            db.close()


def test_database_connection() -> bool:
    """
    Test database connectivity without requiring a session dependency.
    Returns True if connection successful, False otherwise.
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database connectivity test failed: {str(e)}")
        return False

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
