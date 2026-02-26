from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

class AgencyRegisterRequest(BaseModel):
    agency_name: str
    admin_username: str
    admin_password: str
