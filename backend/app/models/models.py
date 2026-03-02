from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, DECIMAL, JSON, Date, Computed, Uuid, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base_class import Base

class Agency(Base):
    __tablename__ = "agencies"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active") # active, suspended
    billing_plan_id = Column(Uuid, ForeignKey("billing_plans.id"), nullable=True)
    gdrive_refresh_token = Column(Text, nullable=True)       # Encrypted OAuth refresh token
    gdrive_folder_id = Column(String(255), nullable=True)     # Root backup folder ID in admin's Drive
    gdrive_connected_at = Column(DateTime, nullable=True)     # When Drive was connected

class User(Base):
    __tablename__ = "users"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=True) # Nullable ONLY for Super Admin
    role = Column(String(20), nullable=False) # super_admin, admin, worker
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

class Newspaper(Base):
    __tablename__ = "newspapers"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=False)
    name = Column(String(100), nullable=False)
    base_price = Column(DECIMAL(10, 2), nullable=False)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=False)
    name = Column(String(100), nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String(20), nullable=True)

class CustomerSubscription(Base):
    __tablename__ = "customer_subscriptions"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=False)
    customer_id = Column(Uuid, ForeignKey("customers.id"), nullable=False)
    newspaper_id = Column(Uuid, ForeignKey("newspapers.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(DECIMAL(10, 2), nullable=True) # Overrides base_price if needed
    status = Column(Integer, default=1) # 1 = active, 0 = paused

class DailyStock(Base):
    __tablename__ = "daily_stock"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=False)
    date = Column(Date, nullable=False)
    newspaper_id = Column(Uuid, ForeignKey("newspapers.id"), nullable=False)
    taken = Column(Integer, default=0)
    returned = Column(Integer, default=0)
    sold = Column(Integer, Computed('taken - returned'), nullable=True)

class WorkerAssignment(Base):
    __tablename__ = "worker_assignments"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=False)
    worker_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    customer_id = Column(Uuid, ForeignKey("customers.id"), nullable=False)
    route_order = Column(Integer, default=0)

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=False)
    customer_id = Column(Uuid, ForeignKey("customers.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    delivery_fee = Column(DECIMAL(10, 2), default=0.00)
    status = Column(String(20), default="pending") # pending, paid

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(Uuid, ForeignKey("agencies.id"), nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False) # e.g., "PRICE_UPDATE", "STOCK_EDIT"
    target_table = Column(String(50), nullable=False)
    changes = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class BillingPlan(Base):
    __tablename__ = "billing_plans"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)          # e.g. "Basic", "Pro", "Enterprise"
    max_workers = Column(Integer, default=5)
    max_customers = Column(Integer, default=50)
    price_monthly = Column(DECIMAL(10, 2), default=0.00)
    billing_cycle = Column(String(20), default="monthly") # monthly, yearly
    created_at = Column(DateTime, default=datetime.utcnow)

class AgencyTemplate(Base):
    __tablename__ = "agency_templates"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)          # e.g. "South India Standard"
    region = Column(String(100), nullable=True)
    newspapers = Column(JSON, nullable=False, default=[]) # [{name, base_price}, ...]
    created_at = Column(DateTime, default=datetime.utcnow)

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    target_audience = Column(String(50), default="all")   # all, admins, workers, specific_agency
    target_agency_id = Column(Uuid, ForeignKey("agencies.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

class PlatformSettings(Base):
    __tablename__ = "platform_settings"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    setting_key = Column(String(100), nullable=False, unique=True)  # e.g., "app_name", "smtp_enabled"
    setting_value = Column(Text, nullable=True)  # JSON-serialized value
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
