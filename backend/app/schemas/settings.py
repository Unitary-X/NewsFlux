from pydantic import BaseModel, Field
from typing import Optional, Any
from uuid import UUID
from datetime import datetime

class PlatformSettingCreate(BaseModel):
    setting_key: str = Field(..., description="Unique setting key")
    setting_value: Optional[str] = Field(None, description="JSON-serialized setting value")

class PlatformSettingUpdate(BaseModel):
    setting_value: Optional[str] = Field(None, description="JSON-serialized setting value")

class PlatformSettingResponse(BaseModel):
    id: UUID
    setting_key: str
    setting_value: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PlatformSettingsBatch(BaseModel):
    """Represents platform-wide settings"""
    app_name: Optional[str] = "NewsFlux"
    app_logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    support_email: Optional[str] = None
    
    # SMTP Settings
    smtp_enabled: bool = False
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_from_email: Optional[str] = None
    
    # Billing Settings
    currency: Optional[str] = "USD"
    default_delivery_fee: Optional[float] = None
    
    # Google Drive Settings
    gdrive_enabled: bool = False
    
    # Announcement Settings
    announcement_enabled: bool = True
    announcement_text: Optional[str] = None

class EmailTemplateSettings(BaseModel):
    """Email template customization"""
    agency_created_enabled: bool = True
    agency_created_subject: str = "Welcome to NewsFlux"
    
    agency_suspended_enabled: bool = True
    agency_suspended_subject: str = "Agency Suspension Notice"
    
    billing_reminder_enabled: bool = True
    billing_reminder_subject: str = "Billing Reminder"
    billing_reminder_days_before: int = 3
    
    announcement_enabled: bool = True
    announcement_subject: str = "NewsFlux Announcement"
