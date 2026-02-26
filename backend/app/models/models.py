from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, DECIMAL, JSON, Date, Computed
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base_class import Base

class Agency(Base):
    __tablename__ = "agencies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="active") # active, suspended

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=True) # Nullable ONLY for Super Admin
    role = Column(String(20), nullable=False) # super_admin, admin, worker
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

class Newspaper(Base):
    __tablename__ = "newspapers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    name = Column(String(100), nullable=False)
    base_price = Column(DECIMAL(10, 2), nullable=False)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    name = Column(String(100), nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String(20), nullable=True)

class CustomerSubscription(Base):
    __tablename__ = "customer_subscriptions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    newspaper_id = Column(UUID(as_uuid=True), ForeignKey("newspapers.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(DECIMAL(10, 2), nullable=True) # Overrides base_price if needed
    status = Column(Integer, default=1) # 1 = active, 0 = paused

class DailyStock(Base):
    __tablename__ = "daily_stock"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    date = Column(Date, nullable=False)
    newspaper_id = Column(UUID(as_uuid=True), ForeignKey("newspapers.id"), nullable=False)
    taken = Column(Integer, default=0)
    returned = Column(Integer, default=0)
    sold = Column(Integer, Computed('taken - returned', persisted=True))

class WorkerAssignment(Base):
    __tablename__ = "worker_assignments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    worker_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    route_order = Column(Integer, default=0)

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    delivery_fee = Column(DECIMAL(10, 2), default=0.00)
    status = Column(String(20), default="pending") # pending, paid

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False) # e.g., "PRICE_UPDATE", "STOCK_EDIT"
    target_table = Column(String(50), nullable=False)
    changes = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
