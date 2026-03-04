from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import date
import logging

from app.api.dependencies import get_db, require_role
from app.schemas.worker import OfflineSyncBatchRequest
from app.models.models import DailyStock, Newspaper, Customer, DailyDelivery, WorkerAssignment

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/assignments", dependencies=[Depends(require_role(["worker"]))])
def get_daily_assignments(request: Request, db: Session = Depends(get_db)):
    """
    Fetches the base dataset for the Worker PWA to cache offline:
    All active newspapers for the agency, and only customers assigned to this worker.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    
    newspapers = db.query(Newspaper).filter(Newspaper.tenant_id == tenant_id).all()
    
    # Only return customers assigned to this worker via WorkerAssignment
    assigned_customer_ids = []
    if user_id:
        assignments = db.query(WorkerAssignment).filter(
            WorkerAssignment.tenant_id == tenant_id,
            WorkerAssignment.worker_id == user_id
        ).order_by(WorkerAssignment.route_order).all()
        assigned_customer_ids = [a.customer_id for a in assignments]
    
    customers = []
    if assigned_customer_ids:
        customers = db.query(Customer).filter(
            Customer.id.in_(assigned_customer_ids),
            Customer.tenant_id == tenant_id
        ).all()
        # Preserve route order from assignments
        order_map = {cid: i for i, cid in enumerate(assigned_customer_ids)}
        customers = sorted(customers, key=lambda c: order_map.get(c.id, 0))
    
    return {
        "newspapers": newspapers,
        "customers": customers
    }


@router.post("/offline-sync", dependencies=[Depends(require_role(["worker"]))])
def batch_offline_sync(request: Request, payload: OfflineSyncBatchRequest, db: Session = Depends(get_db)):
    """
    Receives an array of actions queued while the worker was in an offline zone
    and resolves them sequentially. Validates that all referenced entities exist.
    """
    tenant_id = request.state.tenant_id
    today = date.today()
    failed_updates = []

    # 1. Resolve Stock Updates
    # Note: For MVP simplicity, we overwrite with the latest timestamp.
    # A true CRDT resolution would involve clock synchronization.
    for stock in payload.stock_updates:
        # Verify newspaper exists and belongs to this tenant
        newspaper = db.query(Newspaper).filter(
            Newspaper.id == stock.newspaper_id,
            Newspaper.tenant_id == tenant_id
        ).first()
        
        if not newspaper:
            logger.warning(f"Offline sync: Newspaper {stock.newspaper_id} not found for tenant {tenant_id}")
            failed_updates.append({"type": "stock", "newspaper_id": str(stock.newspaper_id), "error": "Newspaper not found"})
            continue
        
        record = db.query(DailyStock).filter(
            DailyStock.tenant_id == tenant_id,
            DailyStock.newspaper_id == stock.newspaper_id,
            DailyStock.date == today
        ).first()

        if not record:
             # Create new stock tracking line for the day
             record = DailyStock(
                 tenant_id=tenant_id,
                 newspaper_id=stock.newspaper_id,
                 date=today,
                 taken=stock.taken,
                 returned=stock.returned
             )
             db.add(record)
        else:
             # Update existing based on the worker's latest offline input
             record.taken = stock.taken
             record.returned = stock.returned
             
        # The database (GENERATED ALWAYS AS) will automatically calculate `sold` on commit

    # 2. Resolve Delivery Updates
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    
    # Load this worker's assigned customer IDs for enforcement
    assigned_ids = set()
    if user_id:
        assignments = db.query(WorkerAssignment.customer_id).filter(
            WorkerAssignment.tenant_id == tenant_id,
            WorkerAssignment.worker_id == user_id
        ).all()
        assigned_ids = {a.customer_id for a in assignments}
    
    for delivery in payload.delivery_updates:
        # Verify customer exists and belongs to this tenant
        customer = db.query(Customer).filter(
            Customer.id == delivery.customer_id,
            Customer.tenant_id == tenant_id
        ).first()
        
        if not customer:
            logger.warning(f"Offline sync: Customer {delivery.customer_id} not found for tenant {tenant_id}")
            failed_updates.append({"type": "delivery", "customer_id": str(delivery.customer_id), "error": "Customer not found"})
            continue
        
        # Enforce worker↔customer assignment
        if delivery.customer_id not in assigned_ids:
            logger.warning(f"Offline sync: Worker {user_id} not assigned to customer {delivery.customer_id}")
            failed_updates.append({"type": "delivery", "customer_id": str(delivery.customer_id), "error": "Customer not assigned to this worker"})
            continue

        # Record in daily_deliveries (do NOT modify CustomerSubscription.status)
        existing_dd = db.query(DailyDelivery).filter(
            DailyDelivery.tenant_id == tenant_id,
            DailyDelivery.customer_id == delivery.customer_id,
            DailyDelivery.date == today
        ).first()
        dd_status = "delivered" if delivery.status == 1 else "missed"
        if existing_dd:
            existing_dd.status = dd_status
            existing_dd.worker_id = user_id
        else:
            db.add(DailyDelivery(
                tenant_id=tenant_id, date=today,
                customer_id=delivery.customer_id,
                worker_id=user_id, status=dd_status
            ))

    db.commit()
    
    # Always return success even if some updates failed
    # The frontend can retry failed items
    return {
        "message": "Offline sync processed",
        "processed_stock": len([s for s in payload.stock_updates]),
        "processed_deliveries": len([d for d in payload.delivery_updates]),
        "failed_updates": failed_updates if failed_updates else None
    }


@router.get("/announcements", dependencies=[Depends(require_role(["worker"]))])
def get_announcements(request: Request, db: Session = Depends(get_db)):
    """Returns active announcements relevant to this worker's agency."""
    from app.models.models import Announcement
    from datetime import datetime
    tid = request.state.tenant_id
    now = datetime.utcnow()
    anns = db.query(Announcement).filter(
        Announcement.is_active == True,
        (Announcement.expires_at == None) | (Announcement.expires_at > now),
        (Announcement.target_audience.in_(["all", "workers"])) |
        ((Announcement.target_audience == "specific_agency") & (Announcement.target_agency_id == tid))
    ).order_by(Announcement.created_at.desc()).all()
    return [{
        "id": str(a.id), "title": a.title, "message": a.message,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in anns]


@router.get("/route", dependencies=[Depends(require_role(["worker"]))])
def get_worker_route(request: Request, db: Session = Depends(get_db)):
    """Get worker's assigned customers in route order."""
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    tenant_id = request.state.tenant_id
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    assignments = db.query(WorkerAssignment).filter(
        WorkerAssignment.tenant_id == tenant_id,
        WorkerAssignment.worker_id == user_id
    ).order_by(WorkerAssignment.route_order).all()
    
    route = []
    for assign in assignments:
        customer = db.query(Customer).filter(Customer.id == assign.customer_id).first()
        if customer:
            route.append({
                "id": str(customer.id),
                "name": customer.name,
                "address": customer.address,
                "phone": customer.phone,
                "route_order": assign.route_order
            })
    
    return route


@router.get("/sales", dependencies=[Depends(require_role(["worker"]))])
def get_worker_sales(request: Request, db: Session = Depends(get_db)):
    """Get worker's sales statistics."""
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    tenant_id = request.state.tenant_id
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    # Get deliveries for this worker
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # Daily stats
    daily_deliveries = db.query(func.count(DailyDelivery.id)).filter(
        DailyDelivery.worker_id == user_id,
        DailyDelivery.tenant_id == tenant_id,
        DailyDelivery.date == today,
        DailyDelivery.status == "delivered"
    ).scalar() or 0
    
    daily_missed = db.query(func.count(DailyDelivery.id)).filter(
        DailyDelivery.worker_id == user_id,
        DailyDelivery.tenant_id == tenant_id,
        DailyDelivery.date == today,
        DailyDelivery.status == "missed"
    ).scalar() or 0
    
    # Weekly stats
    weekly_deliveries = db.query(func.count(DailyDelivery.id)).filter(
        DailyDelivery.worker_id == user_id,
        DailyDelivery.tenant_id == tenant_id,
        DailyDelivery.date >= week_ago,
        DailyDelivery.status == "delivered"
    ).scalar() or 0
    
    # Monthly stats
    monthly_deliveries = db.query(func.count(DailyDelivery.id)).filter(
        DailyDelivery.worker_id == user_id,
        DailyDelivery.tenant_id == tenant_id,
        DailyDelivery.date >= month_ago,
        DailyDelivery.status == "delivered"
    ).scalar() or 0
    
    # Assigned customers count
    assigned_customers = db.query(func.count(WorkerAssignment.id)).filter(
        WorkerAssignment.worker_id == user_id,
        WorkerAssignment.tenant_id == tenant_id
    ).scalar() or 0
    
    # Last 7 days breakdown
    daily_breakdown = []
    for i in range(7):
        check_date = today - timedelta(days=i)
        delivered = db.query(func.count(DailyDelivery.id)).filter(
            DailyDelivery.worker_id == user_id,
            DailyDelivery.tenant_id == tenant_id,
            DailyDelivery.date == check_date,
            DailyDelivery.status == "delivered"
        ).scalar() or 0
        daily_breakdown.append({
            "date": check_date.isoformat(),
            "delivered": delivered
        })
    
    return {
        "today": {"delivered": daily_deliveries, "missed": daily_missed},
        "weekly": {"delivered": weekly_deliveries},
        "monthly": {"delivered": monthly_deliveries},
        "assigned_customers": assigned_customers,
        "daily_breakdown": list(reversed(daily_breakdown))
    }


@router.get("/salary", dependencies=[Depends(require_role(["worker"]))])
def get_worker_salary(request: Request, db: Session = Depends(get_db)):
    """Get worker's salary records."""
    from app.models.models import Salary
    
    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    tenant_id = request.state.tenant_id
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    salaries = db.query(Salary).filter(
        Salary.worker_id == user_id,
        Salary.tenant_id == tenant_id
    ).order_by(Salary.year.desc(), Salary.month.desc()).all()
    
    # Calculate totals
    total_earned = sum(s.total_amount for s in salaries if s.status == "paid")
    total_pending = sum(s.total_amount for s in salaries if s.status == "pending")
    
    return {
        "salaries": [{
            "id": str(s.id),
            "month": s.month,
            "year": s.year,
            "base_salary": float(s.base_salary),
            "bonus": float(s.bonus) if s.bonus else 0.0,
            "deductions": float(s.deductions) if s.deductions else 0.0,
            "total_amount": float(s.total_amount),
            "status": s.status,
            "notes": s.notes
        } for s in salaries],
        "total_earned": float(total_earned),
        "total_pending": float(total_pending)
    }
