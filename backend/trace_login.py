from app.db.database import SessionLocal
from app.models.models import User
from app.core.security import verify_password, create_access_token

def test():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "superadmin").first()
        if not user:
            print("User not found!")
            return
        
        print(f"User found: {user.username}")
        print(f"Hash: {user.password_hash}")
        
        is_valid = verify_password("admin123", user.password_hash)
        print(f"Password Valid: {is_valid}")
        
        token = create_access_token(
            subject=user.id,
            role=user.role,
            tenant_id=user.tenant_id
        )
        print("Token generated successfully.")
    except Exception as e:
        import traceback
        traceback.print_exc()

test()
