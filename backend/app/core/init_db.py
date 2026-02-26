import logging
from app.db.database import SessionLocal
from app.models.models import User
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

def init_db() -> None:
    db = SessionLocal()
    try:
        # Check if the global super administrator exists
        user = db.query(User).filter(User.username == "superadmin").first()
        if not user:
            logger.info("Initializing baseline Super Admin account...")
            super_user = User(
                username="superadmin",
                password_hash=get_password_hash("admin123"), # Default bootstrap credentials
                role="super_admin",
                tenant_id=None
            )
            db.add(super_user)
            db.commit()
            logger.info("Baseline Super Admin created securely.")
    except Exception as e:
        logger.error(f"Error during baseline seed: {e}")
        db.rollback()
    finally:
        db.close()
