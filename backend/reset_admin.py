import sys
import os

# Add the current directory to sys.path to allow imports from 'app'
sys.path.append(os.getcwd())

from app.api.dependencies import SessionLocal
from app.models.models import User
from app.core.security import get_password_hash

def reset_admin():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "superadmin").first()
        if user:
            user.password_hash = get_password_hash("admin123")
            db.commit()
            print("Successfully reset 'superadmin' password to 'admin123'.")
        else:
            print("Superadmin user not found in database.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()
