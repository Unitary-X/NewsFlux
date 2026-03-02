import logging
from app.api.dependencies import SessionLocal
from app.models.models import User, PlatformSettings
from app.core.security import get_password_hash
import json

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
        
        # Initialize default platform settings
        default_settings = {
            "app_name": "NewsFlux",
            "app_logo_url": "",
            "contact_email": "contact@newsflux.app",
            "support_email": "support@newsflux.app",
            "smtp_enabled": "false",
            "smtp_server": "",
            "smtp_port": "587",
            "smtp_from_email": "noreply@newsflux.app",
            "currency": "USD",
            "default_delivery_fee": "0.00",
            "gdrive_enabled": "false",
            "announcement_enabled": "true",
            "announcement_text": "Welcome to NewsFlux - Your newspaper distribution platform",
        }
        
        for setting_key, setting_value in default_settings.items():
            existing = db.query(PlatformSettings).filter(
                PlatformSettings.setting_key == setting_key
            ).first()
            if not existing:
                new_setting = PlatformSettings(
                    setting_key=setting_key,
                    setting_value=setting_value
                )
                db.add(new_setting)
                logger.info(f"Initialized setting: {setting_key}")
        
        db.commit()
        logger.info("Platform settings initialized.")
        
    except Exception as e:
        logger.error(f"Error during baseline seed: {e}")
        db.rollback()
    finally:
        db.close()
