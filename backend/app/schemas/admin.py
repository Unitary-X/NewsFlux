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

# --- PRICING GRID ---
class PricingGridEntry(BaseModel):
    newspaper_id: UUID
    base_price: float

class PricingGridUpdate(BaseModel):
    prices: List[PricingGridEntry]

# --- WORKERS ---
class WorkerCreate(BaseModel):
    username: str
    password: str

class WorkerResponse(BaseModel):
    id: UUID
    username: str
    model_config = ConfigDict(from_attributes=True)

class WorkerStockEntry(BaseModel):
    worker_id: UUID
    newspaper_id: UUID
    date: date
    taken: int = 0
    returned: int = 0
    amount_given: float = 0.0
