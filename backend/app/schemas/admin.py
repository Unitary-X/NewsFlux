from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

# --- NEWSPAPERS ---
class NewspaperBase(BaseModel):
    name: str
    base_price: float

class NewspaperCreate(NewspaperBase):
    pass

class NewspaperUpdate(BaseModel):
    name: Optional[str] = None
    base_price: Optional[float] = None

class NewspaperResponse(NewspaperBase):
    id: UUID
    tenant_id: UUID
    model_config = ConfigDict(from_attributes=True)

# --- WORKERS ---
class WorkerCreate(BaseModel):
    username: str
    password: str

class WorkerUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

class WorkerResponse(BaseModel):
    id: UUID
    username: str
    role: str
    tenant_id: UUID
    model_config = ConfigDict(from_attributes=True)

# --- CUSTOMERS ---
class CustomerBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: UUID
    tenant_id: UUID
    model_config = ConfigDict(from_attributes=True)

# --- STOCK ENTRY ---
class DailyStockEntry(BaseModel):
    date: date
    newspaper_id: UUID
    taken: int
    returned: int = 0

# --- SUBSCRIPTIONS ---
class SubscriptionCreate(BaseModel):
    customer_id: UUID
    newspaper_id: UUID
    quantity: int = 1
    price: Optional[float] = None
    subscription_type: str = "daily"

class SubscriptionUpdate(BaseModel):
    quantity: Optional[int] = None
    price: Optional[float] = None
    status: Optional[int] = None
    subscription_type: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: UUID
    customer_id: UUID
    newspaper_id: UUID
    quantity: int
    price: Optional[float]
    status: int
    subscription_type: Optional[str] = "daily"
    tenant_id: UUID
    customer_name: Optional[str] = None
    newspaper_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- WORKER ASSIGNMENTS ---
class AssignmentCreate(BaseModel):
    worker_id: UUID
    customer_id: UUID
    route_order: int = 0

class AssignmentResponse(BaseModel):
    id: UUID
    worker_id: UUID
    customer_id: UUID
    route_order: int
    tenant_id: UUID
    worker_name: Optional[str] = None
    customer_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- INVOICES ---
class InvoiceResponse(BaseModel):
    id: UUID
    customer_id: UUID
    month: int
    year: int
    total_amount: float
    delivery_fee: float
    status: str
    tenant_id: UUID
    customer_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class GenerateBillsRequest(BaseModel):
    month: int
    year: int
    delivery_fee: float = 0.0

# --- SALARIES ---
class SalaryCreate(BaseModel):
    worker_id: UUID
    month: int
    year: int
    base_salary: float = 0.0
    bonus: float = 0.0
    deductions: float = 0.0
    notes: Optional[str] = None

class SalaryUpdate(BaseModel):
    base_salary: Optional[float] = None
    bonus: Optional[float] = None
    deductions: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class SalaryResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    worker_id: UUID
    month: int
    year: int
    base_salary: float
    bonus: float
    deductions: float
    total_amount: float
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    worker_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# --- PRICING GRID ---
class PricingGridEntry(BaseModel):
    newspaper_id: UUID
    base_price: float

class PricingGridUpdate(BaseModel):
    prices: List[PricingGridEntry]
