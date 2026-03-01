from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date, text
from typing import List
from datetime import date, datetime, timedelta
from calendar import monthrange
import uuid as uuid_mod

from app.api.dependencies import get_db, require_role
from app.models.models import (
    Newspaper, User, Customer, DailyStock, 
    CustomerSubscription, WorkerAssignment, Invoice
)
from app.schemas.admin import (
    NewspaperCreate, NewspaperUpdate, NewspaperResponse,
    WorkerCreate, WorkerUpdate, WorkerResponse,
    DailyStockEntry, CustomerCreate, CustomerUpdate, CustomerResponse,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    AssignmentCreate, AssignmentResponse,
    InvoiceResponse, GenerateBillsRequest,
)
from app.core.security import get_password_hash

router = APIRouter()


def _parse_uuid(value):
    if isinstance(value, uuid_mod.UUID):
        return value
    return uuid_mod.UUID(str(value))


# ──────────────────────────────────────────────
# DASHBOARD / ANALYTICS
# ──────────────────────────────────────────────

@router.get("/dashboard/stats", dependencies=[Depends(require_role(["admin"]))])
def dashboard_stats(request: Request, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    today = date.today()

    total_newspapers = db.query(func.count(Newspaper.id)).filter(Newspaper.tenant_id == tid).scalar() or 0
    total_workers = db.query(func.count(User.id)).filter(User.tenant_id == tid, User.role == "worker").scalar() or 0
    total_customers = db.query(func.count(Customer.id)).filter(Customer.tenant_id == tid).scalar() or 0
    active_subscriptions = db.query(func.count(CustomerSubscription.id)).filter(
        CustomerSubscription.tenant_id == tid, CustomerSubscription.status == 1
    ).scalar() or 0

    # Today's stock summary
    today_stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == tid, DailyStock.date == today
    ).all()
    today_taken = sum(s.taken or 0 for s in today_stocks)
    today_returned = sum(s.returned or 0 for s in today_stocks)
    today_sold = today_taken - today_returned

    # Today's revenue = sum(sold * base_price) for each newspaper
    today_revenue = 0.0
    for s in today_stocks:
        paper = db.query(Newspaper).filter(Newspaper.id == s.newspaper_id).first()
        if paper:
            sold = (s.taken or 0) - (s.returned or 0)
            today_revenue += sold * float(paper.base_price)

    # Monthly revenue (current month)
    first_of_month = today.replace(day=1)
    month_stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == tid,
        DailyStock.date >= first_of_month,
        DailyStock.date <= today
    ).all()
    monthly_revenue = 0.0
    for s in month_stocks:
        paper = db.query(Newspaper).filter(Newspaper.id == s.newspaper_id).first()
        if paper:
            sold = (s.taken or 0) - (s.returned or 0)
            monthly_revenue += sold * float(paper.base_price)

    # Pending invoices
    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.tenant_id == tid, Invoice.status == "pending"
    ).scalar() or 0

    return {
        "total_newspapers": total_newspapers,
        "total_workers": total_workers,
        "total_customers": total_customers,
        "active_subscriptions": active_subscriptions,
        "today_taken": today_taken,
        "today_returned": today_returned,
        "today_sold": today_sold,
        "today_revenue": round(today_revenue, 2),
        "monthly_revenue": round(monthly_revenue, 2),
        "pending_invoices": pending_invoices,
    }


@router.get("/dashboard/revenue-chart", dependencies=[Depends(require_role(["admin"]))])
def revenue_chart(request: Request, days: int = 30, db: Session = Depends(get_db)):
    """Daily revenue for the last N days."""
    tid = request.state.tenant_id
    today = date.today()
    start = today - timedelta(days=days - 1)

    # Get all stocks in range
    stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == tid,
        DailyStock.date >= start,
        DailyStock.date <= today
    ).all()

    # Build newspaper price cache
    papers = db.query(Newspaper).filter(Newspaper.tenant_id == tid).all()
    price_map = {str(p.id): float(p.base_price) for p in papers}

    # Group by date
    daily = {}
    for s in stocks:
        d = str(s.date)
        sold = (s.taken or 0) - (s.returned or 0)
        rev = sold * price_map.get(str(s.newspaper_id), 0)
        daily[d] = daily.get(d, 0) + rev

    # Fill in all days
    result = []
    for i in range(days):
        d = start + timedelta(days=i)
        ds = str(d)
        result.append({"date": ds, "revenue": round(daily.get(ds, 0), 2)})

    return result


@router.get("/dashboard/stock-summary", dependencies=[Depends(require_role(["admin"]))])
def stock_summary(request: Request, target_date: str = None, db: Session = Depends(get_db)):
    """Stock summary per newspaper for a given date (defaults to today)."""
    tid = request.state.tenant_id
    d = target_date or str(date.today())

    stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == tid, DailyStock.date == d
    ).all()
    papers = {str(p.id): p for p in db.query(Newspaper).filter(Newspaper.tenant_id == tid).all()}

    result = []
    for s in stocks:
        paper = papers.get(str(s.newspaper_id))
        sold = (s.taken or 0) - (s.returned or 0)
        result.append({
            "newspaper_id": str(s.newspaper_id),
            "newspaper_name": paper.name if paper else "Unknown",
            "base_price": float(paper.base_price) if paper else 0,
            "taken": s.taken or 0,
            "returned": s.returned or 0,
            "sold": sold,
            "revenue": round(sold * float(paper.base_price), 2) if paper else 0,
        })
    return result


# ──────────────────────────────────────────────
# NEWSPAPERS CRUD
# ──────────────────────────────────────────────

@router.post("/newspapers", response_model=NewspaperResponse, dependencies=[Depends(require_role(["admin"]))])
def create_newspaper(request: Request, newspaper: NewspaperCreate, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    new_paper = Newspaper(
        name=newspaper.name,
        base_price=newspaper.base_price,
        tenant_id=tenant_id
    )
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)
    return new_paper

@router.get("/newspapers", response_model=List[NewspaperResponse], dependencies=[Depends(require_role(["admin"]))])
def list_newspapers(request: Request, db: Session = Depends(get_db)):
    newspapers = db.query(Newspaper).filter(Newspaper.tenant_id == request.state.tenant_id).all()
    return newspapers

@router.put("/newspapers/{newspaper_id}", response_model=NewspaperResponse, dependencies=[Depends(require_role(["admin"]))])
def update_newspaper(request: Request, newspaper_id: str, data: NewspaperUpdate, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    paper = db.query(Newspaper).filter(
        Newspaper.id == _parse_uuid(newspaper_id), Newspaper.tenant_id == tid
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Newspaper not found")
    if data.name is not None:
        paper.name = data.name
    if data.base_price is not None:
        paper.base_price = data.base_price
    db.commit()
    db.refresh(paper)
    return paper

@router.delete("/newspapers/{newspaper_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_newspaper(request: Request, newspaper_id: str, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    uid = _parse_uuid(newspaper_id)
    paper = db.query(Newspaper).filter(Newspaper.id == uid, Newspaper.tenant_id == tid).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Newspaper not found")
    # Delete related records first
    db.query(CustomerSubscription).filter(CustomerSubscription.newspaper_id == uid, CustomerSubscription.tenant_id == tid).delete()
    db.query(DailyStock).filter(DailyStock.newspaper_id == uid, DailyStock.tenant_id == tid).delete()
    db.delete(paper)
    db.commit()
    return {"status": "deleted"}


# ──────────────────────────────────────────────
# WORKERS CRUD
# ──────────────────────────────────────────────

@router.post("/workers", response_model=WorkerResponse, dependencies=[Depends(require_role(["admin"]))])
def create_worker(request: Request, worker: WorkerCreate, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    existing = db.query(User).filter(User.username == worker.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Worker username already taken")
    new_worker = User(
        username=worker.username,
        password_hash=get_password_hash(worker.password),
        role="worker",
        tenant_id=tenant_id
    )
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)
    return new_worker

@router.get("/workers", response_model=List[WorkerResponse], dependencies=[Depends(require_role(["admin"]))])
def list_workers(request: Request, db: Session = Depends(get_db)):
    workers = db.query(User).filter(User.tenant_id == request.state.tenant_id, User.role == "worker").all()
    return workers

@router.put("/workers/{worker_id}", response_model=WorkerResponse, dependencies=[Depends(require_role(["admin"]))])
def update_worker(request: Request, worker_id: str, data: WorkerUpdate, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    worker = db.query(User).filter(
        User.id == _parse_uuid(worker_id), User.tenant_id == tid, User.role == "worker"
    ).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if data.username is not None:
        existing = db.query(User).filter(User.username == data.username, User.id != worker.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        worker.username = data.username
    if data.password is not None:
        worker.password_hash = get_password_hash(data.password)
    db.commit()
    db.refresh(worker)
    return worker

@router.delete("/workers/{worker_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_worker(request: Request, worker_id: str, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    uid = _parse_uuid(worker_id)
    worker = db.query(User).filter(User.id == uid, User.tenant_id == tid, User.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    db.query(WorkerAssignment).filter(WorkerAssignment.worker_id == uid, WorkerAssignment.tenant_id == tid).delete()
    db.delete(worker)
    db.commit()
    return {"status": "deleted"}


# ──────────────────────────────────────────────
# CUSTOMERS CRUD
# ──────────────────────────────────────────────

@router.post("/customers", response_model=CustomerResponse, dependencies=[Depends(require_role(["admin"]))])
def create_customer(request: Request, customer: CustomerCreate, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    new_customer = Customer(
        name=customer.name,
        address=customer.address,
        phone=customer.phone,
        tenant_id=tenant_id
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.get("/customers", response_model=List[CustomerResponse], dependencies=[Depends(require_role(["admin"]))])
def list_customers(request: Request, db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.tenant_id == request.state.tenant_id).all()
    return customers

@router.put("/customers/{customer_id}", response_model=CustomerResponse, dependencies=[Depends(require_role(["admin"]))])
def update_customer(request: Request, customer_id: str, data: CustomerUpdate, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    cust = db.query(Customer).filter(
        Customer.id == _parse_uuid(customer_id), Customer.tenant_id == tid
    ).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    if data.name is not None:
        cust.name = data.name
    if data.address is not None:
        cust.address = data.address
    if data.phone is not None:
        cust.phone = data.phone
    db.commit()
    db.refresh(cust)
    return cust

@router.delete("/customers/{customer_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_customer(request: Request, customer_id: str, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    uid = _parse_uuid(customer_id)
    cust = db.query(Customer).filter(Customer.id == uid, Customer.tenant_id == tid).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.query(CustomerSubscription).filter(CustomerSubscription.customer_id == uid, CustomerSubscription.tenant_id == tid).delete()
    db.query(WorkerAssignment).filter(WorkerAssignment.customer_id == uid, WorkerAssignment.tenant_id == tid).delete()
    db.query(Invoice).filter(Invoice.customer_id == uid, Invoice.tenant_id == tid).delete()
    db.delete(cust)
    db.commit()
    return {"status": "deleted"}


# ──────────────────────────────────────────────
# DAILY STOCK
# ──────────────────────────────────────────────

@router.post("/stock", dependencies=[Depends(require_role(["admin"]))])
def add_daily_stock(request: Request, entry: DailyStockEntry, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    existing = db.query(DailyStock).filter(
        DailyStock.tenant_id == tenant_id,
        DailyStock.newspaper_id == entry.newspaper_id,
        DailyStock.date == entry.date
    ).first()
    if existing:
        existing.taken = entry.taken
        existing.returned = entry.returned
    else:
        new_stock = DailyStock(
            tenant_id=tenant_id,
            newspaper_id=entry.newspaper_id,
            date=entry.date,
            taken=entry.taken,
            returned=entry.returned
        )
        db.add(new_stock)
    db.commit()
    return {"status": "success"}

@router.get("/stock/{target_date}", dependencies=[Depends(require_role(["admin"]))])
def get_daily_stock(request: Request, target_date: str, db: Session = Depends(get_db)):
    stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == request.state.tenant_id,
        DailyStock.date == target_date
    ).all()
    return stocks


# ──────────────────────────────────────────────
# CUSTOMER SUBSCRIPTIONS
# ──────────────────────────────────────────────

@router.get("/subscriptions", dependencies=[Depends(require_role(["admin"]))])
def list_subscriptions(request: Request, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    subs = db.query(CustomerSubscription).filter(CustomerSubscription.tenant_id == tid).all()
    result = []
    for s in subs:
        cust = db.query(Customer).filter(Customer.id == s.customer_id).first()
        paper = db.query(Newspaper).filter(Newspaper.id == s.newspaper_id).first()
        result.append({
            "id": str(s.id),
            "customer_id": str(s.customer_id),
            "newspaper_id": str(s.newspaper_id),
            "quantity": s.quantity,
            "price": float(s.price) if s.price else None,
            "status": s.status,
            "tenant_id": str(s.tenant_id),
            "customer_name": cust.name if cust else None,
            "newspaper_name": paper.name if paper else None,
        })
    return result

@router.post("/subscriptions", dependencies=[Depends(require_role(["admin"]))])
def create_subscription(request: Request, data: SubscriptionCreate, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    # Verify customer and newspaper belong to tenant
    cust = db.query(Customer).filter(Customer.id == data.customer_id, Customer.tenant_id == tid).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    paper = db.query(Newspaper).filter(Newspaper.id == data.newspaper_id, Newspaper.tenant_id == tid).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Newspaper not found")
    # Check for duplicate
    existing = db.query(CustomerSubscription).filter(
        CustomerSubscription.customer_id == data.customer_id,
        CustomerSubscription.newspaper_id == data.newspaper_id,
        CustomerSubscription.tenant_id == tid
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subscription already exists")
    sub = CustomerSubscription(
        tenant_id=tid,
        customer_id=data.customer_id,
        newspaper_id=data.newspaper_id,
        quantity=data.quantity,
        price=data.price,
        status=1
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {
        "id": str(sub.id),
        "customer_id": str(sub.customer_id),
        "newspaper_id": str(sub.newspaper_id),
        "quantity": sub.quantity,
        "price": float(sub.price) if sub.price else None,
        "status": sub.status,
        "customer_name": cust.name,
        "newspaper_name": paper.name,
    }

@router.put("/subscriptions/{sub_id}", dependencies=[Depends(require_role(["admin"]))])
def update_subscription(request: Request, sub_id: str, data: SubscriptionUpdate, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    sub = db.query(CustomerSubscription).filter(
        CustomerSubscription.id == _parse_uuid(sub_id), CustomerSubscription.tenant_id == tid
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if data.quantity is not None:
        sub.quantity = data.quantity
    if data.price is not None:
        sub.price = data.price
    if data.status is not None:
        sub.status = data.status
    db.commit()
    return {"status": "updated"}

@router.delete("/subscriptions/{sub_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_subscription(request: Request, sub_id: str, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    sub = db.query(CustomerSubscription).filter(
        CustomerSubscription.id == _parse_uuid(sub_id), CustomerSubscription.tenant_id == tid
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    db.delete(sub)
    db.commit()
    return {"status": "deleted"}


# ──────────────────────────────────────────────
# WORKER ASSIGNMENTS
# ──────────────────────────────────────────────

@router.get("/assignments", dependencies=[Depends(require_role(["admin"]))])
def list_assignments(request: Request, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    assigns = db.query(WorkerAssignment).filter(WorkerAssignment.tenant_id == tid).order_by(WorkerAssignment.route_order).all()
    result = []
    for a in assigns:
        worker = db.query(User).filter(User.id == a.worker_id).first()
        cust = db.query(Customer).filter(Customer.id == a.customer_id).first()
        result.append({
            "id": str(a.id),
            "worker_id": str(a.worker_id),
            "customer_id": str(a.customer_id),
            "route_order": a.route_order,
            "tenant_id": str(a.tenant_id),
            "worker_name": worker.username if worker else None,
            "customer_name": cust.name if cust else None,
        })
    return result

@router.post("/assignments", dependencies=[Depends(require_role(["admin"]))])
def create_assignment(request: Request, data: AssignmentCreate, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    worker = db.query(User).filter(User.id == data.worker_id, User.tenant_id == tid, User.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    cust = db.query(Customer).filter(Customer.id == data.customer_id, Customer.tenant_id == tid).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    existing = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == data.worker_id,
        WorkerAssignment.customer_id == data.customer_id,
        WorkerAssignment.tenant_id == tid
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    assign = WorkerAssignment(
        tenant_id=tid,
        worker_id=data.worker_id,
        customer_id=data.customer_id,
        route_order=data.route_order
    )
    db.add(assign)
    db.commit()
    db.refresh(assign)
    return {
        "id": str(assign.id),
        "worker_id": str(assign.worker_id),
        "customer_id": str(assign.customer_id),
        "route_order": assign.route_order,
        "worker_name": worker.username,
        "customer_name": cust.name,
    }

@router.delete("/assignments/{assign_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_assignment(request: Request, assign_id: str, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    assign = db.query(WorkerAssignment).filter(
        WorkerAssignment.id == _parse_uuid(assign_id), WorkerAssignment.tenant_id == tid
    ).first()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assign)
    db.commit()
    return {"status": "deleted"}


# ──────────────────────────────────────────────
# BILLING / INVOICES
# ──────────────────────────────────────────────

@router.post("/billing/generate", dependencies=[Depends(require_role(["admin"]))])
def generate_bills(request: Request, data: GenerateBillsRequest, db: Session = Depends(get_db)):
    """Generate invoices for all customers for a given month/year based on subscriptions and stock data."""
    tid = request.state.tenant_id
    month = data.month
    year = data.year
    delivery_fee = data.delivery_fee

    days_in_month = monthrange(year, month)[1]
    customers = db.query(Customer).filter(Customer.tenant_id == tid).all()
    generated = 0

    for cust in customers:
        # Check if invoice already exists
        existing = db.query(Invoice).filter(
            Invoice.tenant_id == tid,
            Invoice.customer_id == cust.id,
            Invoice.month == month,
            Invoice.year == year
        ).first()
        if existing:
            continue

        # Get active subscriptions
        subs = db.query(CustomerSubscription).filter(
            CustomerSubscription.customer_id == cust.id,
            CustomerSubscription.tenant_id == tid,
            CustomerSubscription.status == 1
        ).all()
        if not subs:
            continue

        total = 0.0
        for sub in subs:
            paper = db.query(Newspaper).filter(Newspaper.id == sub.newspaper_id).first()
            if paper:
                price = float(sub.price) if sub.price else float(paper.base_price)
                total += price * sub.quantity * days_in_month

        total += delivery_fee

        invoice = Invoice(
            tenant_id=tid,
            customer_id=cust.id,
            month=month,
            year=year,
            total_amount=round(total, 2),
            delivery_fee=delivery_fee,
            status="pending"
        )
        db.add(invoice)
        generated += 1

    db.commit()
    return {"status": "success", "generated": generated}

@router.get("/invoices", dependencies=[Depends(require_role(["admin"]))])
def list_invoices(request: Request, month: int = None, year: int = None, status: str = None, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    q = db.query(Invoice).filter(Invoice.tenant_id == tid)
    if month:
        q = q.filter(Invoice.month == month)
    if year:
        q = q.filter(Invoice.year == year)
    if status:
        q = q.filter(Invoice.status == status)
    invoices = q.all()

    result = []
    for inv in invoices:
        cust = db.query(Customer).filter(Customer.id == inv.customer_id).first()
        result.append({
            "id": str(inv.id),
            "customer_id": str(inv.customer_id),
            "month": inv.month,
            "year": inv.year,
            "total_amount": float(inv.total_amount),
            "delivery_fee": float(inv.delivery_fee),
            "status": inv.status,
            "tenant_id": str(inv.tenant_id),
            "customer_name": cust.name if cust else None,
        })
    return result

@router.put("/invoices/{invoice_id}/pay", dependencies=[Depends(require_role(["admin"]))])
def mark_invoice_paid(request: Request, invoice_id: str, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    inv = db.query(Invoice).filter(
        Invoice.id == _parse_uuid(invoice_id), Invoice.tenant_id == tid
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.status = "paid"
    db.commit()
    return {"status": "paid"}
