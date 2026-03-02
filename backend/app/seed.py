import sys
import os

# Explicitly add the backend folder to PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.api.dependencies import SessionLocal
from app.models.models import User, Agency
from app.core.security import get_password_hash
import uuid

def seed_database():
    db = SessionLocal()
    try:
        # Check if SuperAdmin exists
        super_exists = db.query(User).filter(User.username == "superadmin").first()
        if not super_exists:
            super_admin = User(
                username="superadmin",
                password_hash=get_password_hash("super123"),
                role="super_admin",
                tenant_id=None
            )
            db.add(super_admin)
            print("Created Super Admin (superadmin / super123)")

        # Create a Dummy Agency
        agency_id = str(uuid.uuid4())
        agency_exists = db.query(Agency).first()
        if not agency_exists:
            test_agency = Agency(
                id=agency_id,
                name="Test Distributors Inc",
                status="active"
            )
            db.add(test_agency)
            print(f"Created Test Agency (ID: {agency_id})")

            # Create an Agency Admin
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="admin",
                tenant_id=agency_id
            )
            db.add(admin_user)
            print("Created Agency Admin (admin / admin123)")

            # Create an Agency Worker
            worker_user = User(
                username="worker",
                password_hash=get_password_hash("worker123"),
                role="worker",
                tenant_id=agency_id
            )
            db.add(worker_user)
            print("Created Worker Node (worker / worker123)")

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"Database seed failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Running initial platform seeder...")
    seed_database()
