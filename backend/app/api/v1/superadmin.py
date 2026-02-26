from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, ConfigDict
from uuid import UUID

from app.api.dependencies import get_db, require_role
from app.models.models import Agency

router = APIRouter()

# --- SCHEMAS ---
class AgencyResponse(BaseModel):
    id: UUID
    name: str
    status: str
    model_config = ConfigDict(from_attributes=True)

class AgencyStatusUpdate(BaseModel):
    status: str # "active" | "suspended"

# --- ENDPOINTS ---
@router.get("/agencies", response_model=List[AgencyResponse], dependencies=[Depends(require_role(["super_admin"]))])
def list_all_agencies(request: Request, db: Session = Depends(get_db)):
    """ Returns a global array of all registered SaaS tenants. """
    return db.query(Agency).all()

@router.put("/agencies/{agency_id}/status", response_model=AgencyResponse, dependencies=[Depends(require_role(["super_admin"]))])
def update_agency_status(request: Request, agency_id: str, payload: AgencyStatusUpdate, db: Session = Depends(get_db)):
    """ Toggles the active/suspended bounds of a given agency. """
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
        
    agency.status = payload.status
    db.commit()
    db.refresh(agency)
    return agency
