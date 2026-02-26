from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import date

# --- NEWSPAPERS ---
class NewspaperBase(BaseModel):
    name: str
    base_price: float

class NewspaperCreate(NewspaperBase):
    pass

class NewspaperResponse(NewspaperBase):
    id: UUID
    tenant_id: UUID
    model_config = ConfigDict(from_attributes=True)

# --- WORKERS ---
class WorkerCreate(BaseModel):
    username: str
    password: str

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
