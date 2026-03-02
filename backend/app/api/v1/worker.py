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
