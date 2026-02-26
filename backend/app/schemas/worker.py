from pydantic import BaseModel
from typing import List
from uuid import UUID

class StockUpdatePayload(BaseModel):
    newspaper_id: UUID
    taken: int
    returned: int
    timestamp: str # Sent from client when offline action happened

class DeliveryUpdatePayload(BaseModel):
    customer_id: UUID
    status: int # 1 = Delivered, 0 = Paused
    timestamp: str

class OfflineSyncBatchRequest(BaseModel):
    stock_updates: List[StockUpdatePayload] = []
    delivery_updates: List[DeliveryUpdatePayload] = []
