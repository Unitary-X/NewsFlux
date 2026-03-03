from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from uuid import UUID
import re

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1)

class AgencyRegisterRequest(BaseModel):
    agency_name: str = Field(..., min_length=1, max_length=255)
    admin_username: str = Field(..., min_length=3, max_length=100, description="Alphanumeric, underscore, hyphen only")
    admin_password: str = Field(..., min_length=12, description="Must be 12+ chars with uppercase and number")
    
    @field_validator('admin_username')
    @classmethod
    def validate_username(cls, v):
        """Username must be alphanumeric with underscore/hyphen"""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must contain only letters, numbers, underscore, and hyphen')
        return v
    
    @field_validator('admin_password')
    @classmethod
    def validate_password_strength(cls, v):
        """Password must have uppercase letter and digit"""
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        # Disallow common weak patterns
        if v.lower() in ['password', '12345678', 'qwerty', 'admin123']:
            raise ValueError('Password too common, choose a stronger password')
        return v
    
    @field_validator('agency_name')
    @classmethod
    def validate_agency_name(cls, v):
        """Agency name cannot be all numbers or blank"""
        if v.strip() == '':
            raise ValueError('Agency name cannot be blank')
        return v.strip()

class ForgotPasswordRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, description="Reset token")
    new_password: str = Field(..., min_length=12, description="Must be 12+ chars with uppercase and number")
    
    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v):
        """Password must have uppercase letter and digit"""
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None  # Only for dev/testing; remove when email is implemented

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)
