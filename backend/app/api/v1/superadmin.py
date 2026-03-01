from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID
import uuid as uuid_mod
from datetime import datetime, date, timedelta

from app.api.dependencies import get_db, require_role
from app.models.models import Agency, User, Newspaper, Customer, CustomerSubscription, DailyStock, WorkerAssignment, Invoice, AuditLog
from app.core.security import get_password_hash

router = APIRouter()

# --- SCHEMAS ---
class AgencyResponse(BaseModel):
    id: UUID
    name: str
    status: str
    model_config = ConfigDict(from_attributes=True)

class AgencyDetailResponse(BaseModel):
    id: UUID
    name: str
    status: str
    created_at: Optional[datetime] = None
    worker_count: int = 0
    customer_count: int = 0
    newspaper_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class AgencyStatusUpdate(BaseModel):
    status: str # "active" | "suspended"

class PlatformAnalytics(BaseModel):
    total_agencies: int
    active_agencies: int
    suspended_agencies: int
    total_workers: int
    total_customers: int
    total_newspapers: int
    total_invoices: int
    pending_invoices: int
    paid_invoices: int

class AgencyGrowthPoint(BaseModel):
    month: str
    count: int

class TopAgency(BaseModel):
    id: UUID
    name: str
    customer_count: int
    worker_count: int
    newspaper_count: int

class AuditLogResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    action: str
    target_table: str
    changes: Optional[dict] = None
    timestamp: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class SettingsUpdate(BaseModel):
    default_delivery_fee: Optional[float] = None
    billing_day: Optional[int] = None

class CreateSuperAdminRequest(BaseModel):
    username: str
    password: str

def _parse_uuid(value: str):
    """Parse a string to UUID object for consistent DB filtering."""
    try:
        return uuid_mod.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

# --- ENDPOINTS ---
@router.get("/agencies", response_model=List[AgencyResponse], dependencies=[Depends(require_role(["super_admin"]))])
def list_all_agencies(request: Request, db: Session = Depends(get_db)):
    """ Returns a global array of all registered SaaS tenants. """
    return db.query(Agency).all()

@router.get("/agencies/{agency_id}", dependencies=[Depends(require_role(["super_admin"]))])
def get_agency_detail(request: Request, agency_id: str, db: Session = Depends(get_db)):
    """ Returns detailed info for a single agency. """
    uid = _parse_uuid(agency_id)
    agency = db.query(Agency).filter(Agency.id == uid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    worker_count = db.query(func.count(User.id)).filter(User.tenant_id == uid, User.role == "worker").scalar()
    customer_count = db.query(func.count(Customer.id)).filter(Customer.tenant_id == uid).scalar()
    newspaper_count = db.query(func.count(Newspaper.id)).filter(Newspaper.tenant_id == uid).scalar()
    return {
        "id": agency.id, "name": agency.name, "status": agency.status,
        "created_at": agency.created_at,
        "worker_count": worker_count, "customer_count": customer_count, "newspaper_count": newspaper_count
    }

@router.put("/agencies/{agency_id}/status", response_model=AgencyResponse, dependencies=[Depends(require_role(["super_admin"]))])
def update_agency_status(request: Request, agency_id: str, payload: AgencyStatusUpdate, db: Session = Depends(get_db)):
    """ Toggles the active/suspended bounds of a given agency. """
    uid = _parse_uuid(agency_id)
    agency = db.query(Agency).filter(Agency.id == uid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    agency.status = payload.status
    db.commit()
    db.refresh(agency)
    return agency

@router.get("/analytics", response_model=PlatformAnalytics, dependencies=[Depends(require_role(["super_admin"]))])
def get_platform_analytics(request: Request, db: Session = Depends(get_db)):
    """ Returns high-level platform KPI metrics. """
    total_agencies = db.query(func.count(Agency.id)).scalar()
    active_agencies = db.query(func.count(Agency.id)).filter(Agency.status == "active").scalar()
    suspended_agencies = total_agencies - active_agencies
    total_workers = db.query(func.count(User.id)).filter(User.role == "worker").scalar()
    total_customers = db.query(func.count(Customer.id)).scalar()
    total_newspapers = db.query(func.count(Newspaper.id)).scalar()
    total_invoices = db.query(func.count(Invoice.id)).scalar()
    pending_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == "pending").scalar()
    paid_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == "paid").scalar()
    return PlatformAnalytics(
        total_agencies=total_agencies, active_agencies=active_agencies, suspended_agencies=suspended_agencies,
        total_workers=total_workers, total_customers=total_customers, total_newspapers=total_newspapers,
        total_invoices=total_invoices, pending_invoices=pending_invoices, paid_invoices=paid_invoices
    )

@router.get("/analytics/growth", response_model=List[AgencyGrowthPoint], dependencies=[Depends(require_role(["super_admin"]))])
def get_agency_growth(request: Request, db: Session = Depends(get_db)):
    """ Returns agency creation counts per month for the last 12 months. """
    result = []
    today = date.today()
    for i in range(11, -1, -1):
        d = today.replace(day=1) - timedelta(days=i * 30)
        month_start = d.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        count = db.query(func.count(Agency.id)).filter(
            Agency.created_at >= month_start,
            Agency.created_at < month_end
        ).scalar()
        result.append(AgencyGrowthPoint(month=month_start.strftime("%b %Y"), count=count))
    return result

@router.get("/analytics/top-agencies", response_model=List[TopAgency], dependencies=[Depends(require_role(["super_admin"]))])
def get_top_agencies(request: Request, db: Session = Depends(get_db)):
    """ Returns top agencies ranked by customer count. """
    agencies = db.query(Agency).all()
    ranked = []
    for a in agencies:
        c_count = db.query(func.count(Customer.id)).filter(Customer.tenant_id == a.id).scalar()
        w_count = db.query(func.count(User.id)).filter(User.tenant_id == a.id, User.role == "worker").scalar()
        n_count = db.query(func.count(Newspaper.id)).filter(Newspaper.tenant_id == a.id).scalar()
        ranked.append(TopAgency(id=a.id, name=a.name, customer_count=c_count, worker_count=w_count, newspaper_count=n_count))
    ranked.sort(key=lambda x: x.customer_count, reverse=True)
    return ranked[:10]

@router.get("/audit-logs", dependencies=[Depends(require_role(["super_admin"]))])
def get_audit_logs(request: Request, db: Session = Depends(get_db), limit: int = 100, skip: int = 0, search: str = None):
    """ Returns platform-wide audit logs. """
    query = db.query(AuditLog)
    if search:
        query = query.filter(
            AuditLog.action.ilike(f"%{search}%") |
            AuditLog.target_table.ilike(f"%{search}%")
        )
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    items = []
    for log in logs:
        items.append({
            "id": str(log.id),
            "action": log.action,
            "entity_type": log.target_table,
            "entity_id": None,
            "details": str(log.changes) if log.changes else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "created_at": log.timestamp.isoformat() if log.timestamp else None,
        })
    return {"items": items, "total": total}

@router.get("/system-health", dependencies=[Depends(require_role(["super_admin"]))])
def get_system_health(request: Request, db: Session = Depends(get_db)):
    """ Returns basic system health metrics. """
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    return {
        "database_status": db_status,
        "server_time": datetime.utcnow().isoformat(),
        "counts": {
            "agencies": db.query(func.count(Agency.id)).scalar(),
            "users": db.query(func.count(User.id)).scalar(),
            "newspapers": db.query(func.count(Newspaper.id)).scalar(),
            "customers": db.query(func.count(Customer.id)).scalar(),
            "subscriptions": db.query(func.count(CustomerSubscription.id)).scalar(),
            "daily_stocks": db.query(func.count(DailyStock.id)).scalar(),
            "invoices": db.query(func.count(Invoice.id)).scalar(),
            "audit_logs": db.query(func.count(AuditLog.id)).scalar(),
        },
    }

@router.post("/super-admins", dependencies=[Depends(require_role(["super_admin"]))])
def create_super_admin(request: Request, payload: CreateSuperAdminRequest, db: Session = Depends(get_db)):
    """ Creates a new super admin user. """
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    new_user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role="super_admin",
        tenant_id=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": str(new_user.id), "username": new_user.username, "role": new_user.role}

@router.get("/super-admins", dependencies=[Depends(require_role(["super_admin"]))])
def list_super_admins(request: Request, db: Session = Depends(get_db)):
    """ Lists all super admin users. """
    admins = db.query(User).filter(User.role == "super_admin").all()
    return [{"id": str(a.id), "username": a.username, "role": a.role} for a in admins]

@router.delete("/super-admins/{admin_id}", dependencies=[Depends(require_role(["super_admin"]))])
def delete_super_admin(request: Request, admin_id: str, db: Session = Depends(get_db)):
    """ Deletes a super admin user. Cannot delete the last one. """
    uid = _parse_uuid(admin_id)
    total_super_admins = db.query(func.count(User.id)).filter(User.role == "super_admin").scalar()
    if total_super_admins <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last super admin")
    user = db.query(User).filter(User.id == uid, User.role == "super_admin").first()
    if not user:
        raise HTTPException(status_code=404, detail="Super admin not found")
    db.delete(user)
    db.commit()
    return {"detail": "Super admin deleted"}

@router.delete("/agencies/{agency_id}", dependencies=[Depends(require_role(["super_admin"]))])
def delete_agency(request: Request, agency_id: str, db: Session = Depends(get_db)):
    """ Deletes an agency and all its associated data. """
    uid = _parse_uuid(agency_id)
    agency = db.query(Agency).filter(Agency.id == uid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    # Delete all tenant-scoped data
    db.query(AuditLog).filter(AuditLog.tenant_id == uid).delete()
    db.query(Invoice).filter(Invoice.tenant_id == uid).delete()
    db.query(DailyStock).filter(DailyStock.tenant_id == uid).delete()
    db.query(WorkerAssignment).filter(WorkerAssignment.tenant_id == uid).delete()
    db.query(CustomerSubscription).filter(CustomerSubscription.tenant_id == uid).delete()
    db.query(Customer).filter(Customer.tenant_id == uid).delete()
    db.query(Newspaper).filter(Newspaper.tenant_id == uid).delete()
    db.query(User).filter(User.tenant_id == uid).delete()
    db.delete(agency)
    db.commit()
    return {"detail": "Agency deleted"}
