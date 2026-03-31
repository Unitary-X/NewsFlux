from app.api.dependencies import SessionLocal
from app.models.models import User, Agency

db = SessionLocal()
users = db.query(User).all()
print("Users in database:")
for u in users:
    print(f"ID: {u.id}, Username: {u.username}, Role: {u.role}, Tenant ID: {u.tenant_id}")

agencies = db.query(Agency).all()
print("\nAgencies in database:")
for a in agencies:
    print(f"ID: {a.id}, Name: {a.name}, Tenant ID: {a.tenant_id}")

db.close()
