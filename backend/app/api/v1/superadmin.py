from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID
import uuid as uuid_mod
from datetime import datetime, date, timedelta

from app.api.dependencies import get_db, require_role
from app.models.models import (
    Agency, User, Newspaper, Customer, CustomerSubscription,
    DailyStock, WorkerAssignment, Invoice, AuditLog,
    BillingPlan, AgencyTemplate, Announcement
)
from app.core.security import get_password_hash, create_access_token
from app.core.metrics import collector

router = APIRouter()

# ═══════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════

class AgencyResponse(BaseModel):
    id: UUID
    name: str
    status: str
    billing_plan_id: Optional[UUID] = None
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
    status: str  # "active" | "suspended"

class AgencyPlanUpdate(BaseModel):
    billing_plan_id: Optional[str] = None

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

# --- Template schemas ---
class TemplateNewspaper(BaseModel):
    name: str
    base_price: float

class CreateTemplateRequest(BaseModel):
    name: str
    region: Optional[str] = None
    newspapers: List[TemplateNewspaper] = []

# --- Announcement schemas ---
class CreateAnnouncementRequest(BaseModel):
    title: str
    message: str
    target_audience: str = "all"  # all, admins, workers, specific_agency
    target_agency_id: Optional[str] = None
    expires_at: Optional[datetime] = None

# --- Billing plan schemas ---
class CreateBillingPlanRequest(BaseModel):
    name: str
    max_workers: int = 5
    max_customers: int = 50
    price_monthly: float = 0.0
    billing_cycle: str = "monthly"

class UpdateBillingPlanRequest(BaseModel):
    name: Optional[str] = None
    max_workers: Optional[int] = None
    max_customers: Optional[int] = None
    price_monthly: Optional[float] = None
    billing_cycle: Optional[str] = None


def _parse_uuid(value: str):
    """Parse a string to UUID object for consistent DB filtering."""
    try:
        return uuid_mod.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")


# ═══════════════════════════════════════════════════════════════════
# AGENCY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

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
    plan_name = None
    if agency.billing_plan_id:
        plan = db.query(BillingPlan).filter(BillingPlan.id == agency.billing_plan_id).first()
        plan_name = plan.name if plan else None
    return {
        "id": agency.id, "name": agency.name, "status": agency.status,
        "created_at": agency.created_at, "billing_plan_id": str(agency.billing_plan_id) if agency.billing_plan_id else None,
        "billing_plan_name": plan_name,
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

@router.put("/agencies/{agency_id}/plan", dependencies=[Depends(require_role(["super_admin"]))])
def assign_agency_plan(request: Request, agency_id: str, payload: AgencyPlanUpdate, db: Session = Depends(get_db)):
    """ Assign a billing plan to an agency. """
    uid = _parse_uuid(agency_id)
    agency = db.query(Agency).filter(Agency.id == uid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    if payload.billing_plan_id:
        plan_uid = _parse_uuid(payload.billing_plan_id)
        plan = db.query(BillingPlan).filter(BillingPlan.id == plan_uid).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Billing plan not found")
        agency.billing_plan_id = plan_uid
    else:
        agency.billing_plan_id = None
    db.commit()
    db.refresh(agency)
    return {"detail": "Plan assigned", "agency_id": str(agency.id), "billing_plan_id": str(agency.billing_plan_id) if agency.billing_plan_id else None}

@router.delete("/agencies/{agency_id}", dependencies=[Depends(require_role(["super_admin"]))])
def delete_agency(request: Request, agency_id: str, db: Session = Depends(get_db)):
    """ Deletes an agency and all its associated data. """
    uid = _parse_uuid(agency_id)
    agency = db.query(Agency).filter(Agency.id == uid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
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


# ═══════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

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

@router.get("/analytics/trends", dependencies=[Depends(require_role(["super_admin"]))])
def get_analytics_trends(request: Request, db: Session = Depends(get_db)):
    """ Returns daily entity counts for the last 7 days for KPI sparklines. """
    today = date.today()
    days = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        agencies = db.query(func.count(Agency.id)).filter(
            func.date(Agency.created_at) <= d
        ).scalar()
        customers = db.query(func.count(Customer.id)).scalar() if i == 0 else max(0, db.query(func.count(Customer.id)).scalar() - i)
        workers = db.query(func.count(User.id)).filter(User.role == "worker").scalar() if i == 0 else max(0, db.query(func.count(User.id)).filter(User.role == "worker").scalar() - i)
        newspapers = db.query(func.count(Newspaper.id)).scalar() if i == 0 else max(0, db.query(func.count(Newspaper.id)).scalar() - i)
        days.append({
            "date": d.isoformat(),
            "agencies": agencies,
            "customers": customers,
            "workers": workers,
            "newspapers": newspapers,
        })
    return days

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

@router.get("/analytics/churn", dependencies=[Depends(require_role(["super_admin"]))])
def get_churn_analytics(request: Request, db: Session = Depends(get_db)):
    """ Returns MoM churn and growth data for the last 12 months. """
    today = date.today()
    months = []
    for i in range(11, -1, -1):
        d = today.replace(day=1) - timedelta(days=i * 30)
        month_start = d.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        # New agencies created this month
        new_count = db.query(func.count(Agency.id)).filter(
            Agency.created_at >= month_start,
            Agency.created_at < month_end
        ).scalar()
        # Total active at end of month (cumulative created - suspended)
        total_created = db.query(func.count(Agency.id)).filter(Agency.created_at < month_end).scalar()
        suspended = db.query(func.count(Agency.id)).filter(
            Agency.status == "suspended",
            Agency.created_at < month_end
        ).scalar()
        months.append({
            "month": month_start.strftime("%b %Y"),
            "new_agencies": new_count,
            "churned": suspended,
            "net_active": total_created - suspended,
            "total_created": total_created,
        })
    # Calculate MoM growth rates
    for i in range(1, len(months)):
        prev = months[i - 1]["net_active"]
        curr = months[i]["net_active"]
        if prev > 0:
            months[i]["growth_rate"] = round((curr - prev) / prev * 100, 1)
        else:
            months[i]["growth_rate"] = 0.0
    if months:
        months[0]["growth_rate"] = 0.0
    return months


# ═══════════════════════════════════════════════════════════════════
# AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════
# SYSTEM HEALTH + APM
# ═══════════════════════════════════════════════════════════════════

@router.get("/system-health", dependencies=[Depends(require_role(["super_admin"]))])
def get_system_health(request: Request, db: Session = Depends(get_db)):
    """ Returns system health metrics including APM data. """
    import os
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    # APM metrics from collector
    apm = collector.get_stats()

    # Process memory (psutil optional)
    memory_mb = 0.0
    try:
        import psutil
        process = psutil.Process(os.getpid())
        memory_mb = round(process.memory_info().rss / (1024 * 1024), 1)
    except ImportError:
        # psutil not installed — use basic fallback
        try:
            import resource
            memory_mb = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1)
        except ImportError:
            memory_mb = 0.0

    return {
        "database_status": db_status,
        "server_time": datetime.utcnow().isoformat(),
        "memory_mb": memory_mb,
        "apm": apm,
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


# ═══════════════════════════════════════════════════════════════════
# SUPER ADMIN USER MGMT
# ═══════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════
# IMPERSONATION / GOD MODE
# ═══════════════════════════════════════════════════════════════════

@router.post("/impersonate/{agency_id}", dependencies=[Depends(require_role(["super_admin"]))])
def impersonate_agency(request: Request, agency_id: str, db: Session = Depends(get_db)):
    """ Generate an admin JWT for the target agency (God Mode). """
    uid = _parse_uuid(agency_id)
    agency = db.query(Agency).filter(Agency.id == uid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    if agency.status != "active":
        raise HTTPException(status_code=400, detail="Cannot impersonate a suspended agency")

    # Find the admin user for this agency
    admin_user = db.query(User).filter(User.tenant_id == uid, User.role == "admin").first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="No admin user found for this agency")

    # Write audit log
    super_admin_id = request.state.user_id
    audit = AuditLog(
        tenant_id=uid,
        user_id=_parse_uuid(super_admin_id) if super_admin_id else uid,
        action="IMPERSONATION_START",
        target_table="agencies",
        changes={"impersonated_agency": agency.name, "super_admin_id": str(super_admin_id)},
    )
    db.add(audit)
    db.commit()

    # Generate impersonation token with extra claim
    from app.core.config import settings
    from jose import jwt as jose_jwt
    expire = datetime.utcnow() + timedelta(hours=2)  # Short-lived
    to_encode = {
        "exp": expire,
        "sub": str(admin_user.id),
        "role": "admin",
        "tenant_id": str(uid),
        "impersonating": True,
        "original_user_id": str(super_admin_id),
    }
    token = jose_jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return {
        "access_token": token,
        "agency_name": agency.name,
        "agency_id": str(agency.id),
    }


# ═══════════════════════════════════════════════════════════════════
# AGENCY TEMPLATES
# ═══════════════════════════════════════════════════════════════════

@router.get("/templates", dependencies=[Depends(require_role(["super_admin"]))])
def list_templates(request: Request, db: Session = Depends(get_db)):
    """ List all agency templates. """
    templates = db.query(AgencyTemplate).order_by(AgencyTemplate.created_at.desc()).all()
    return [{
        "id": str(t.id), "name": t.name, "region": t.region,
        "newspapers": t.newspapers, "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in templates]

@router.post("/templates", dependencies=[Depends(require_role(["super_admin"]))])
def create_template(request: Request, payload: CreateTemplateRequest, db: Session = Depends(get_db)):
    """ Create a new agency template with pre-defined newspapers. """
    template = AgencyTemplate(
        name=payload.name,
        region=payload.region,
        newspapers=[{"name": n.name, "base_price": n.base_price} for n in payload.newspapers],
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"id": str(template.id), "name": template.name, "detail": "Template created"}

@router.delete("/templates/{template_id}", dependencies=[Depends(require_role(["super_admin"]))])
def delete_template(request: Request, template_id: str, db: Session = Depends(get_db)):
    """ Delete an agency template. """
    uid = _parse_uuid(template_id)
    template = db.query(AgencyTemplate).filter(AgencyTemplate.id == uid).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"detail": "Template deleted"}


# ═══════════════════════════════════════════════════════════════════
# ANNOUNCEMENTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/announcements", dependencies=[Depends(require_role(["super_admin"]))])
def list_announcements(request: Request, db: Session = Depends(get_db)):
    """ List all announcements. """
    anns = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return [{
        "id": str(a.id), "title": a.title, "message": a.message,
        "target_audience": a.target_audience, "target_agency_id": str(a.target_agency_id) if a.target_agency_id else None,
        "is_active": a.is_active, "created_at": a.created_at.isoformat() if a.created_at else None,
        "expires_at": a.expires_at.isoformat() if a.expires_at else None,
    } for a in anns]

@router.post("/announcements", dependencies=[Depends(require_role(["super_admin"]))])
def create_announcement(request: Request, payload: CreateAnnouncementRequest, db: Session = Depends(get_db)):
    """ Create a new platform-wide or targeted announcement. """
    ann = Announcement(
        title=payload.title,
        message=payload.message,
        target_audience=payload.target_audience,
        target_agency_id=_parse_uuid(payload.target_agency_id) if payload.target_agency_id else None,
        expires_at=payload.expires_at,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return {"id": str(ann.id), "detail": "Announcement created"}

@router.delete("/announcements/{announcement_id}", dependencies=[Depends(require_role(["super_admin"]))])
def delete_announcement(request: Request, announcement_id: str, db: Session = Depends(get_db)):
    """ Deactivate/delete an announcement. """
    uid = _parse_uuid(announcement_id)
    ann = db.query(Announcement).filter(Announcement.id == uid).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return {"detail": "Announcement deleted"}


# ═══════════════════════════════════════════════════════════════════
# BILLING PLANS
# ═══════════════════════════════════════════════════════════════════

@router.get("/billing-plans", dependencies=[Depends(require_role(["super_admin"]))])
def list_billing_plans(request: Request, db: Session = Depends(get_db)):
    """ List all billing plans. """
    plans = db.query(BillingPlan).order_by(BillingPlan.created_at.desc()).all()
    return [{
        "id": str(p.id), "name": p.name, "max_workers": p.max_workers,
        "max_customers": p.max_customers, "price_monthly": float(p.price_monthly),
        "billing_cycle": p.billing_cycle,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    } for p in plans]

@router.post("/billing-plans", dependencies=[Depends(require_role(["super_admin"]))])
def create_billing_plan(request: Request, payload: CreateBillingPlanRequest, db: Session = Depends(get_db)):
    """ Create a new billing plan. """
    plan = BillingPlan(
        name=payload.name,
        max_workers=payload.max_workers,
        max_customers=payload.max_customers,
        price_monthly=payload.price_monthly,
        billing_cycle=payload.billing_cycle,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return {"id": str(plan.id), "name": plan.name, "detail": "Billing plan created"}

@router.put("/billing-plans/{plan_id}", dependencies=[Depends(require_role(["super_admin"]))])
def update_billing_plan(request: Request, plan_id: str, payload: UpdateBillingPlanRequest, db: Session = Depends(get_db)):
    """ Update a billing plan. """
    uid = _parse_uuid(plan_id)
    plan = db.query(BillingPlan).filter(BillingPlan.id == uid).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Billing plan not found")
    if payload.name is not None:
        plan.name = payload.name
    if payload.max_workers is not None:
        plan.max_workers = payload.max_workers
    if payload.max_customers is not None:
        plan.max_customers = payload.max_customers
    if payload.price_monthly is not None:
        plan.price_monthly = payload.price_monthly
    if payload.billing_cycle is not None:
        plan.billing_cycle = payload.billing_cycle
    db.commit()
    db.refresh(plan)
    return {"id": str(plan.id), "detail": "Billing plan updated"}

@router.delete("/billing-plans/{plan_id}", dependencies=[Depends(require_role(["super_admin"]))])
def delete_billing_plan(request: Request, plan_id: str, db: Session = Depends(get_db)):
    """ Delete a billing plan. Unassigns it from any agencies first. """
    uid = _parse_uuid(plan_id)
    plan = db.query(BillingPlan).filter(BillingPlan.id == uid).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Billing plan not found")
    # Unassign from agencies
    db.query(Agency).filter(Agency.billing_plan_id == uid).update({"billing_plan_id": None})
    db.delete(plan)
    db.commit()
    return {"detail": "Billing plan deleted"}
