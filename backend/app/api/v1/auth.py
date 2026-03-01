from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from app.api.dependencies import get_db
from app.models.models import User, Agency, Newspaper, AgencyTemplate
from app.schemas.auth import LoginRequest, AgencyRegisterRequest, Token
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()

class RegisterWithTemplate(BaseModel):
    agency_name: str
    admin_username: str
    admin_password: str
    template_id: Optional[str] = None

@router.post("/register", response_model=Token)
def register_agency(request: RegisterWithTemplate, db: Session = Depends(get_db)):
    # Check if namespace exists
    existing_user = db.query(User).filter(User.username == request.admin_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # 1. Provision the Agency Tenant Profile
    new_agency = Agency(name=request.agency_name)
    db.add(new_agency)
    db.flush() # Commit locally to generate the new agency UUID
    
    # 2. Provision the Admin account specifically tied to the new agency_id
    hashed_password = get_password_hash(request.admin_password)
    new_admin = User(
        username=request.admin_username,
        password_hash=hashed_password,
        role="admin",
        tenant_id=new_agency.id
    )
    db.add(new_admin)

    # 3. If template_id provided, seed newspapers from template
    if request.template_id:
        try:
            import uuid as uuid_mod
            template_uid = uuid_mod.UUID(request.template_id)
            template = db.query(AgencyTemplate).filter(AgencyTemplate.id == template_uid).first()
            if template and template.newspapers:
                for np_data in template.newspapers:
                    newspaper = Newspaper(
                        tenant_id=new_agency.id,
                        name=np_data.get("name", "Unknown"),
                        base_price=np_data.get("base_price", 0.0),
                    )
                    db.add(newspaper)
        except (ValueError, TypeError):
            pass  # Invalid template_id, just skip seeding

    db.commit()

    # 4. Log them in automatically
    access_token = create_access_token(
        subject=new_admin.id,
        role=new_admin.role,
        tenant_id=new_admin.tenant_id
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Verify the host agency is not suspended
    if user.tenant_id:
        agency = db.query(Agency).filter(Agency.id == user.tenant_id).first()
        if not agency or agency.status != "active":
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your agency account is currently suspended. Please contact platform support."
            )

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id
    )
    return {"access_token": access_token, "token_type": "bearer"}
