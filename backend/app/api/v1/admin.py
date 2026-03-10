from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date, text
from typing import List
from datetime import date, datetime, timedelta
from calendar import monthrange
import uuid as uuid_mod
import io

from app.api.dependencies import get_db, require_role
from app.models.models import (
    Newspaper, User, Customer, DailyStock, 
    CustomerSubscription, Invoice, Agency,
    DailyDelivery
)
from app.schemas.admin import (
    NewspaperCreate, NewspaperUpdate, NewspaperResponse,
    DailyStockEntry, CustomerCreate, CustomerUpdate, CustomerResponse,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    InvoiceResponse, GenerateBillsRequest,
    PricingGridUpdate,
)

from app.services.report_generator import (
    profit_loss_pdf, profit_loss_excel,
    stock_recon_pdf, stock_recon_excel,
    summary_pdf, summary_excel,
)
from app.core.audit import log_audit

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
    # Batch load all newspapers to avoid N+1 query
    newspaper_ids = [s.newspaper_id for s in today_stocks]
    newspapers = {p.id: p for p in db.query(Newspaper).filter(Newspaper.id.in_(newspaper_ids)).all()} if newspaper_ids else {}
    for s in today_stocks:
        paper = newspapers.get(s.newspaper_id)
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
    # Batch load all newspapers for monthly calc
    month_newspaper_ids = [s.newspaper_id for s in month_stocks]
    month_newspapers = {p.id: p for p in db.query(Newspaper).filter(Newspaper.id.in_(month_newspaper_ids)).all()} if month_newspaper_ids else {}
    for s in month_stocks:
        paper = month_newspapers.get(s.newspaper_id)
        if paper:
            sold = (s.taken or 0) - (s.returned or 0)
            monthly_revenue += sold * float(paper.base_price)

    # Pending invoices
    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.tenant_id == tid, Invoice.status == "pending"
    ).scalar() or 0

    return {
        "total_newspapers": total_newspapers,
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
    user_id = request.state.user_id
    new_paper = Newspaper(
        name=newspaper.name,
        base_price=newspaper.base_price,
        tenant_id=tenant_id
    )
    db.add(new_paper)
    db.flush()  # Get ID before commit
    log_audit(db, user_id, "CREATE", "newspapers", new_paper.id, 
              {"name": newspaper.name, "base_price": str(newspaper.base_price)}, tenant_id)
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
    user_id = request.state.user_id
    paper = db.query(Newspaper).filter(
        Newspaper.id == _parse_uuid(newspaper_id), Newspaper.tenant_id == tid
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Newspaper not found")
    
    changes = {}
    if data.name is not None:
        changes["name"] = {"old": paper.name, "new": data.name}
        paper.name = data.name
    if data.base_price is not None:
        changes["base_price"] = {"old": str(paper.base_price), "new": str(data.base_price)}
        paper.base_price = data.base_price
    
    log_audit(db, user_id, "UPDATE", "newspapers", paper.id, changes, tid)
    db.commit()
    db.refresh(paper)
    return paper

@router.delete("/newspapers/{newspaper_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_newspaper(request: Request, newspaper_id: str, db: Session = Depends(get_db)):
    tid = request.state.tenant_id
    user_id = request.state.user_id
    uid = _parse_uuid(newspaper_id)
    paper = db.query(Newspaper).filter(Newspaper.id == uid, Newspaper.tenant_id == tid).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Newspaper not found")
    
    paper_name = paper.name
    # Delete related records first
    db.query(CustomerSubscription).filter(CustomerSubscription.newspaper_id == uid, CustomerSubscription.tenant_id == tid).delete()
    db.query(DailyStock).filter(DailyStock.newspaper_id == uid, DailyStock.tenant_id == tid).delete()
    db.delete(paper)
    
    log_audit(db, user_id, "DELETE", "newspapers", uid, {"name": paper_name}, tid)
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
            "subscription_type": s.subscription_type or "daily",
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
        status=1,
        subscription_type=data.subscription_type or "daily",
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
        "subscription_type": sub.subscription_type or "daily",
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
    if data.subscription_type is not None:
        sub.subscription_type = data.subscription_type
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
        has_non_yearly_sub = False
        for sub in subs:
            paper = db.query(Newspaper).filter(Newspaper.id == sub.newspaper_id).first()
            if paper:
                price = float(sub.price) if sub.price else float(paper.base_price)
                # Deduct for missed deliveries if daily delivery records exist
                from sqlalchemy import extract
                missed_days = db.query(func.count(DailyDelivery.id)).filter(
                    DailyDelivery.tenant_id == tid,
                    DailyDelivery.customer_id == cust.id,
                    DailyDelivery.status == "missed",
                    extract('month', DailyDelivery.date) == month,
                    extract('year', DailyDelivery.date) == year
                ).scalar() or 0
                billable_days = days_in_month - missed_days
                total += price * sub.quantity * billable_days
                if sub.subscription_type != "yearly":
                    has_non_yearly_sub = True

        # Service charge (delivery_fee) only applies for non-yearly subscriptions
        applied_fee = delivery_fee if has_non_yearly_sub else 0.0
        total += applied_fee

        invoice = Invoice(
            tenant_id=tid,
            customer_id=cust.id,
            month=month,
            year=year,
            total_amount=round(total, 2),
            delivery_fee=applied_fee,
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


# ──────────────────────────────────────────────
# PRICING GRID
# ──────────────────────────────────────────────

@router.get("/pricing-grid", dependencies=[Depends(require_role(["admin"]))])
def get_pricing_grid(request: Request, db: Session = Depends(get_db)):
    """Get all newspaper base prices for bulk editing."""
    tid = request.state.tenant_id
    papers = db.query(Newspaper).filter(Newspaper.tenant_id == tid).order_by(Newspaper.name).all()
    return [{
        "newspaper_id": str(p.id),
        "name": p.name,
        "base_price": float(p.base_price),
    } for p in papers]


@router.put("/pricing-grid", dependencies=[Depends(require_role(["admin"]))])
def update_pricing_grid(request: Request, data: PricingGridUpdate, db: Session = Depends(get_db)):
    """Bulk update newspaper base prices."""
    tid = request.state.tenant_id
    updated = 0
    for entry in data.prices:
        paper = db.query(Newspaper).filter(
            Newspaper.id == entry.newspaper_id, Newspaper.tenant_id == tid
        ).first()
        if paper:
            paper.base_price = entry.base_price
            updated += 1
    db.commit()
    return {"status": "updated", "count": updated}


# ──────────────────────────────────────────────
# REPORTS & ANALYTICS
# ──────────────────────────────────────────────

@router.get("/reports/profit-loss", dependencies=[Depends(require_role(["admin"]))])
def profit_loss_report(request: Request, month: int = None, year: int = None, db: Session = Depends(get_db)):
    """Profit & Loss report for a given month."""
    tid = request.state.tenant_id
    now = date.today()
    month = month or now.month
    year = year or now.year
    days = monthrange(year, month)[1]

    # Revenue: sum of all invoices for the month
    invoices = db.query(Invoice).filter(
        Invoice.tenant_id == tid, Invoice.month == month, Invoice.year == year
    ).all()
    total_revenue = sum(float(i.total_amount) for i in invoices)
    collected = sum(float(i.total_amount) for i in invoices if i.status == "paid")
    pending = total_revenue - collected

    # Cost: total newspapers purchased (taken * base_price) across all days
    from sqlalchemy import extract
    stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == tid,
        extract('month', DailyStock.date) == month,
        extract('year', DailyStock.date) == year
    ).all()
    total_purchase_cost = 0.0
    total_taken = 0
    total_returned = 0
    total_sold = 0
    for s in stocks:
        paper = db.query(Newspaper).filter(Newspaper.id == s.newspaper_id).first()
        if paper:
            total_purchase_cost += float(paper.base_price) * (s.taken or 0)
        total_taken += s.taken or 0
        total_returned += s.returned or 0
        total_sold += (s.taken or 0) - (s.returned or 0)

    total_expenses = total_purchase_cost
    net_profit = total_revenue - total_expenses

    return {
        "month": month, "year": year, "days": days,
        "revenue": {"total": round(total_revenue, 2), "collected": round(collected, 2), "pending": round(pending, 2)},
        "expenses": {
            "purchase_cost": round(total_purchase_cost, 2),
            "total": round(total_expenses, 2),
        },
        "stock": {"taken": total_taken, "returned": total_returned, "sold": total_sold},
        "net_profit": round(net_profit, 2),
        "invoices_count": len(invoices),
    }


@router.get("/reports/stock-reconciliation", dependencies=[Depends(require_role(["admin"]))])
def stock_reconciliation(request: Request, target_date: str = None, db: Session = Depends(get_db)):
    """Compare stock entries with subscription expectations for a date."""
    tid = request.state.tenant_id
    d = date.fromisoformat(target_date) if target_date else date.today()

    papers = db.query(Newspaper).filter(Newspaper.tenant_id == tid).all()
    result = []
    for paper in papers:
        stock = db.query(DailyStock).filter(
            DailyStock.tenant_id == tid, DailyStock.newspaper_id == paper.id, DailyStock.date == d
        ).first()
        # Expected = sum of active subscription quantities for this newspaper
        expected = db.query(func.coalesce(func.sum(CustomerSubscription.quantity), 0)).filter(
            CustomerSubscription.tenant_id == tid,
            CustomerSubscription.newspaper_id == paper.id,
            CustomerSubscription.status == 1
        ).scalar() or 0

        taken = stock.taken if stock else 0
        returned = stock.returned if stock else 0
        sold = taken - returned
        discrepancy = sold - int(expected)

        result.append({
            "newspaper_id": str(paper.id),
            "newspaper_name": paper.name,
            "base_price": float(paper.base_price),
            "expected": int(expected),
            "taken": taken,
            "returned": returned,
            "sold": sold,
            "discrepancy": discrepancy,
            "status": "match" if discrepancy == 0 else ("surplus" if discrepancy > 0 else "deficit"),
        })

    total_expected = sum(r["expected"] for r in result)
    total_sold = sum(r["sold"] for r in result)
    return {
        "date": d.isoformat(),
        "newspapers": result,
        "summary": {
            "total_expected": total_expected,
            "total_sold": total_sold,
            "total_discrepancy": total_sold - total_expected,
            "newspapers_matched": sum(1 for r in result if r["status"] == "match"),
            "newspapers_surplus": sum(1 for r in result if r["status"] == "surplus"),
            "newspapers_deficit": sum(1 for r in result if r["status"] == "deficit"),
        }
    }


@router.get("/reports/summary", dependencies=[Depends(require_role(["admin"]))])
def report_summary(request: Request, period: str = "daily", target_date: str = None, db: Session = Depends(get_db)):
    """Daily / Weekly / Monthly summary report."""
    tid = request.state.tenant_id
    d = date.fromisoformat(target_date) if target_date else date.today()

    if period == "daily":
        start_date = d
        end_date = d
    elif period == "weekly":
        start_date = d - timedelta(days=d.weekday())
        end_date = start_date + timedelta(days=6)
    elif period == "monthly":
        start_date = d.replace(day=1)
        end_date = d.replace(day=monthrange(d.year, d.month)[1])
    else:
        start_date = d
        end_date = d

    # Stock data for the period
    stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == tid,
        DailyStock.date >= start_date,
        DailyStock.date <= end_date
    ).all()

    total_taken = sum(s.taken or 0 for s in stocks)
    total_returned = sum(s.returned or 0 for s in stocks)
    total_sold = total_taken - total_returned

    # Revenue for the period
    revenue = 0.0
    for s in stocks:
        paper = db.query(Newspaper).filter(Newspaper.id == s.newspaper_id).first()
        if paper:
            revenue += float(paper.base_price) * ((s.taken or 0) - (s.returned or 0))

    # Daily breakdown
    daily_data = {}
    for s in stocks:
        day_key = s.date.isoformat()
        if day_key not in daily_data:
            daily_data[day_key] = {"date": day_key, "taken": 0, "returned": 0, "sold": 0, "revenue": 0.0}
        daily_data[day_key]["taken"] += s.taken or 0
        daily_data[day_key]["returned"] += s.returned or 0
        daily_data[day_key]["sold"] += (s.taken or 0) - (s.returned or 0)
        paper = db.query(Newspaper).filter(Newspaper.id == s.newspaper_id).first()
        if paper:
            daily_data[day_key]["revenue"] += float(paper.base_price) * ((s.taken or 0) - (s.returned or 0))

    for k in daily_data:
        daily_data[k]["revenue"] = round(daily_data[k]["revenue"], 2)

    # Deliveries for the period
    deliveries = db.query(DailyDelivery).filter(
        DailyDelivery.tenant_id == tid,
        DailyDelivery.date >= start_date,
        DailyDelivery.date <= end_date
    ).all()
    total_delivery_count = len(deliveries)
    delivered_count = sum(1 for d in deliveries if d.status == "delivered")
    missed_count = sum(1 for d in deliveries if d.status == "missed")

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "stock": {"taken": total_taken, "returned": total_returned, "sold": total_sold},
        "revenue": round(revenue, 2),
        "deliveries": {"total": total_delivery_count, "delivered": delivered_count, "missed": missed_count},
        "daily_breakdown": sorted(daily_data.values(), key=lambda x: x["date"]),
    }


# ──────────────────────────────────────────────
# REPORT DOWNLOADS (PDF / EXCEL)
# ──────────────────────────────────────────────

@router.get("/reports/profit-loss/download", dependencies=[Depends(require_role(["admin"]))])
def download_profit_loss(request: Request, month: int = None, year: int = None,
                         fmt: str = "pdf", db: Session = Depends(get_db)):
    """Download Profit & Loss report as PDF or Excel."""
    data = profit_loss_report(request, month, year, db)
    if fmt == "excel":
        content = profit_loss_excel(data)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=profit_loss_{data['month']}_{data['year']}.xlsx"},
        )
    content = profit_loss_pdf(data)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=profit_loss_{data['month']}_{data['year']}.pdf"},
    )


@router.get("/reports/stock-reconciliation/download", dependencies=[Depends(require_role(["admin"]))])
def download_stock_recon(request: Request, target_date: str = None,
                         fmt: str = "pdf", db: Session = Depends(get_db)):
    """Download Stock Reconciliation report as PDF or Excel."""
    data = stock_reconciliation(request, target_date, db)
    if fmt == "excel":
        content = stock_recon_excel(data)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=stock_recon_{data['date']}.xlsx"},
        )
    content = stock_recon_pdf(data)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=stock_recon_{data['date']}.pdf"},
    )


@router.get("/reports/summary/download", dependencies=[Depends(require_role(["admin"]))])
def download_summary(request: Request, period: str = "daily", target_date: str = None,
                     fmt: str = "pdf", db: Session = Depends(get_db)):
    """Download Summary report as PDF or Excel."""
    data = report_summary(request, period, target_date, db)
    fname = f"summary_{data['period']}_{data['start_date']}"
    if fmt == "excel":
        content = summary_excel(data)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}.xlsx"},
        )
    content = summary_pdf(data)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={fname}.pdf"},
    )


# ──────────────────────────────────────────────
# ANNOUNCEMENTS
# ──────────────────────────────────────────────

@router.get("/announcements", dependencies=[Depends(require_role(["admin"]))])
def get_announcements(request: Request, db: Session = Depends(get_db)):
    """Returns active announcements relevant to this admin's agency."""
    from app.models.models import Announcement
    from datetime import datetime
    tid = request.state.tenant_id
    now = datetime.utcnow()
    anns = db.query(Announcement).filter(
        Announcement.is_active == True,
        (Announcement.expires_at == None) | (Announcement.expires_at > now),
        (Announcement.target_audience.in_(["all", "admins"])) |
        ((Announcement.target_audience == "specific_agency") & (Announcement.target_agency_id == tid))
    ).order_by(Announcement.created_at.desc()).all()
    return [{
        "id": str(a.id), "title": a.title, "message": a.message,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in anns]


# ──────────────────────────────────────────────
# GOOGLE DRIVE BACKUP
# ──────────────────────────────────────────────

from fastapi.responses import RedirectResponse
from app.core.config import settings


@router.get("/backup/google/connect", dependencies=[Depends(require_role(["admin"]))])
def gdrive_connect(request: Request):
    """Redirect admin to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google Drive integration not configured")
    from app.services.gdrive_service import get_authorization_url
    url = get_authorization_url()
    return {"auth_url": url}


@router.get("/backup/google/callback")
def gdrive_callback(code: str, request: Request, db: Session = Depends(get_db)):
    """OAuth callback — exchange code for tokens and store refresh token."""
    from app.services.gdrive_service import exchange_code_for_tokens
    from app.core.security import encrypt_token
    tid = request.state.tenant_id
    if not tid:
        raise HTTPException(status_code=401, detail="Authentication required")

    tokens = exchange_code_for_tokens(code)
    if not tokens.get("refresh_token"):
        raise HTTPException(status_code=400, detail="No refresh token received. Please revoke app access and try again.")

    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    agency.gdrive_refresh_token = encrypt_token(tokens["refresh_token"])
    agency.gdrive_connected_at = datetime.utcnow()
    db.commit()

    # Redirect to frontend backup page with success
    return RedirectResponse(url="/admin/backup?connected=true")


@router.get("/backup/google/status", dependencies=[Depends(require_role(["admin"]))])
def gdrive_status(request: Request, db: Session = Depends(get_db)):
    """Check if Google Drive is connected for this agency."""
    tid = request.state.tenant_id
    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    connected = agency.gdrive_refresh_token is not None
    return {
        "connected": connected,
        "connected_at": agency.gdrive_connected_at.isoformat() if agency.gdrive_connected_at else None,
        "enabled": bool(settings.GOOGLE_CLIENT_ID),
    }


@router.delete("/backup/google/disconnect", dependencies=[Depends(require_role(["admin"]))])
def gdrive_disconnect(request: Request, db: Session = Depends(get_db)):
    """Remove stored Google Drive credentials."""
    tid = request.state.tenant_id
    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    agency.gdrive_refresh_token = None
    agency.gdrive_folder_id = None
    agency.gdrive_connected_at = None
    db.commit()
    return {"status": "disconnected"}


@router.post("/backup/trigger", dependencies=[Depends(require_role(["admin"]))])
def trigger_backup(request: Request, db: Session = Depends(get_db)):
    """Manually trigger a daily backup for this agency."""
    tid = request.state.tenant_id
    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency or not agency.gdrive_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")

    from app.services.excel_export import (
        generate_daily_stock_excel, generate_daily_deliveries_excel,
    )
    from app.services.gdrive_service import upload_file

    target_date = date.today()
    date_str = target_date.isoformat()
    results = []

    try:
        stock_bytes = generate_daily_stock_excel(db, agency.id, target_date)
        r1 = upload_file(
            agency.gdrive_refresh_token, agency.name,
            "Daily Updates", f"{date_str}_daily_stock.xlsx", stock_bytes,
        )
        results.append({"file": f"{date_str}_daily_stock.xlsx", "status": "uploaded", **r1})
    except Exception as e:
        results.append({"file": "daily_stock.xlsx", "status": "failed", "error": str(e)})

    try:
        delivery_bytes = generate_daily_deliveries_excel(db, agency.id, target_date)
        r2 = upload_file(
            agency.gdrive_refresh_token, agency.name,
            "Daily Updates", f"{date_str}_deliveries.xlsx", delivery_bytes,
        )
        results.append({"file": f"{date_str}_deliveries.xlsx", "status": "uploaded", **r2})
    except Exception as e:
        results.append({"file": "deliveries.xlsx", "status": "failed", "error": str(e)})

    return {"date": date_str, "results": results}


@router.post("/backup/trigger-monthly", dependencies=[Depends(require_role(["admin"]))])
def trigger_monthly_backup(request: Request, month: int = None, year: int = None, db: Session = Depends(get_db)):
    """Manually trigger a monthly backup for this agency."""
    tid = request.state.tenant_id
    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency or not agency.gdrive_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")

    from app.services.excel_export import (
        generate_monthly_revenue_excel, generate_monthly_subscriptions_excel, generate_monthly_invoices_excel,
    )
    from app.services.gdrive_service import upload_file

    today = date.today()
    if not month:
        prev = today.replace(day=1) - timedelta(days=1)
        month, year = prev.month, prev.year
    if not year:
        year = today.year

    month_str = f"{year}-{month:02d}"
    results = []

    for gen_fn, fname in [
        (generate_monthly_revenue_excel, f"{month_str}_revenue_report.xlsx"),
        (generate_monthly_subscriptions_excel, f"{month_str}_subscription_summary.xlsx"),
        (generate_monthly_invoices_excel, f"{month_str}_invoice_report.xlsx"),
    ]:
        try:
            file_bytes = gen_fn(db, agency.id, month, year)
            r = upload_file(agency.gdrive_refresh_token, agency.name, "Monthly Analysis", fname, file_bytes)
            results.append({"file": fname, "status": "uploaded", **r})
        except Exception as e:
            results.append({"file": fname, "status": "failed", "error": str(e)})

    return {"period": month_str, "results": results}


@router.post("/backup/trigger-yearly", dependencies=[Depends(require_role(["admin"]))])
def trigger_yearly_backup(request: Request, year: int = None, db: Session = Depends(get_db)):
    """Manually trigger a yearly backup for this agency."""
    tid = request.state.tenant_id
    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency or not agency.gdrive_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")

    from app.services.excel_export import generate_yearly_report_excel
    from app.services.gdrive_service import upload_file

    if not year:
        year = date.today().year - 1

    results = []
    try:
        yearly_bytes = generate_yearly_report_excel(db, agency.id, year)
        r = upload_file(
            agency.gdrive_refresh_token, agency.name,
            "Yearly Analysis", f"{year}_annual_report.xlsx", yearly_bytes,
        )
        results.append({"file": f"{year}_annual_report.xlsx", "status": "uploaded", **r})
    except Exception as e:
        results.append({"file": f"{year}_annual_report.xlsx", "status": "failed", "error": str(e)})

    return {"year": year, "results": results}


@router.get("/backup/files/{subfolder}", dependencies=[Depends(require_role(["admin"]))])
def list_backup_files_endpoint(subfolder: str, request: Request, db: Session = Depends(get_db)):
    """List backup files in a specific subfolder (Daily Updates, Monthly Analysis, Yearly Analysis)."""
    tid = request.state.tenant_id
    agency = db.query(Agency).filter(Agency.id == tid).first()
    if not agency or not agency.gdrive_refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")

    folder_map = {
        "daily": "Daily Updates",
        "monthly": "Monthly Analysis",
        "yearly": "Yearly Analysis",
    }
    folder_name = folder_map.get(subfolder)
    if not folder_name:
        raise HTTPException(status_code=400, detail="Invalid subfolder. Use: daily, monthly, yearly")

    from app.services.gdrive_service import list_backup_files
    files = list_backup_files(agency.gdrive_refresh_token, agency.name, folder_name)
    return files
