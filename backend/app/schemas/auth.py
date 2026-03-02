from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class AgencyRegisterRequest(BaseModel):
    agency_name: str
    admin_username: str
    admin_password: str

class ForgotPasswordRequest(BaseModel):
    username: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None  # Only for dev/testing; remove when email is implemented

class RefreshTokenRequest(BaseModel):
    refresh_token: str
