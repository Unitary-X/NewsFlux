from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import date

from app.api.dependencies import get_db, require_role
from app.schemas.worker import OfflineSyncBatchRequest
from app.models.models import DailyStock, CustomerSubscription, Newspaper, Customer, DailyDelivery, WorkerAssignment

router = APIRouter()

@router.get("/assignments", dependencies=[Depends(require_role(["worker"]))])
def get_daily_assignments(request: Request, db: Session = Depends(get_db)):
    """
    Fetches the base dataset for the Worker PWA to cache offline:
    All active newspapers and all registered customers for the agency.
    """
    tenant_id = request.state.tenant_id
    
    newspapers = db.query(Newspaper).filter(Newspaper.tenant_id == tenant_id).all()
    customers = db.query(Customer).filter(Customer.tenant_id == tenant_id).all()
    
    return {
        "newspapers": newspapers,
        "customers": customers
    }


@router.post("/offline-sync", dependencies=[Depends(require_role(["worker"]))])
def batch_offline_sync(request: Request, payload: OfflineSyncBatchRequest, db: Session = Depends(get_db)):
    """
    Receives an array of actions queued while the worker was in an offline zone
    and resolves them sequentially.
    """
    tenant_id = request.state.tenant_id
    today = date.today()

    # 1. Resolve Stock Updates
    # Note: For MVP simplicity, we overwrite with the latest timestamp.
    # A true CRDT resolution would involve clock synchronization.
    for stock in payload.stock_updates:
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
    for delivery in payload.delivery_updates:
        sub = db.query(CustomerSubscription).filter(
            CustomerSubscription.tenant_id == tenant_id,
            CustomerSubscription.customer_id == delivery.customer_id
        ).first()
        
        if sub:
            sub.status = delivery.status

        # Also record in daily_deliveries for historical tracking / billing deductions
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
    return {"message": "Offline sync resolved successfully", "processed_stock": len(payload.stock_updates), "processed_deliveries": len(payload.delivery_updates)}


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
