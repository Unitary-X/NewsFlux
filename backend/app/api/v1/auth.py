from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Optional
import secrets

from app.api.dependencies import get_db
from app.models.models import User, Agency, Newspaper, AgencyTemplate
from app.schemas.auth import (
    LoginRequest, AgencyRegisterRequest, Token,
    ForgotPasswordRequest, ResetPasswordRequest, ForgotPasswordResponse,
    RefreshTokenRequest
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token
)
from app.core.config import settings
from app.core.celery_app import celery_app
from pydantic import BaseModel

router = APIRouter()

# In-memory password reset token store (username -> (token, expiry))
# TODO: Move to Redis or database table when scaling
password_reset_tokens = {}

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

    # 4. Send welcome email (asynchronously)
    if settings.EMAILS_ENABLED:
        dashboard_url = f"{settings.FRONTEND_URL or 'http://localhost:5173'}/admin/dashboard"
        celery_app.send_task(
            'email.send_agency_created',
            args=[
                request.agency_name,
                request.admin_username,
                settings.SMTP_FROM_EMAIL,  # Using default for now, could be extracted from request
                dashboard_url
            ]
        )
    
    # 5. Log them in automatically with access + refresh tokens
    access_token = create_access_token(
        subject=new_admin.id,
        role=new_admin.role,
        tenant_id=new_admin.tenant_id
    )
    refresh_token = create_refresh_token(
        subject=new_admin.id,
        role=new_admin.role,
        tenant_id=new_admin.tenant_id
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }

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

    # Generate access + refresh tokens
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }


@router.post("/refresh", response_model=Token)
def refresh_access_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token for a new access token (and optionally new refresh token).
    This prevents session timeout by allowing clients to get fresh tokens.
    """
    try:
        payload = decode_token(request.refresh_token)
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        
        user_id = payload.get("sub")
        role = payload.get("role")
        tenant_id = payload.get("tenant_id")
        
        # Verify user still exists and is active
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Verify agency is still active (if applicable)
        if tenant_id:
            agency = db.query(Agency).filter(Agency.id == tenant_id).first()
            if not agency or agency.status != "active":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Agency account is suspended"
                )
        
        # Issue new access token
        new_access_token = create_access_token(
            subject=user_id,
            role=role,
            tenant_id=tenant_id
        )
        
        # Optionally rotate refresh token (more secure)
        new_refresh_token = create_refresh_token(
            subject=user_id,
            role=role,
            tenant_id=tenant_id
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "refresh_token": new_refresh_token
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset. Generates a reset token.
    In production: send token via email. For now: return token in response.
    """
    user = db.query(User).filter(User.username == request.username).first()
    
    # Always return success to prevent username enumeration
    if not user:
        return ForgotPasswordResponse(
            message="If this username exists, a password reset link has been sent."
        )
    
    # Generate secure reset token
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)  # 1-hour expiry
    
    # Store token (username -> (token, expiry))
    password_reset_tokens[user.username] = (reset_token, expiry)
    
    # TODO: When email is implemented, send email with reset link
    # For now, return token in response for development/testing
    return ForgotPasswordResponse(
        message="If this username exists, a password reset link has been sent.",
        reset_token=reset_token  # Remove this in production
    )


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Complete password reset using token + new password.
    """
    # Find username by token
    username = None
    for uname, (token, expiry) in password_reset_tokens.items():
        if token == request.token:
            # Check expiry
            if datetime.utcnow() > expiry:
                break  # Token expired
            username = uname
            break
    
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    user.password_hash = get_password_hash(request.new_password)
    db.commit()
    
    # Invalidate token
    del password_reset_tokens[username]
    
    return {"message": "Password successfully reset. You can now log in with your new password."}
