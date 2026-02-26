from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.api.dependencies import get_db, require_role
from app.models.models import Newspaper, User, Customer, DailyStock
from app.schemas.admin import NewspaperCreate, NewspaperResponse, WorkerCreate, WorkerResponse, DailyStockEntry, CustomerCreate, CustomerResponse
from app.core.security import get_password_hash

router = APIRouter()

# --- NEWSPAPERS ---
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
    # RLS/Isolation applied strictly below
    newspapers = db.query(Newspaper).filter(Newspaper.tenant_id == request.state.tenant_id).all()
    return newspapers

# --- WORKERS ---
@router.post("/workers", response_model=WorkerResponse, dependencies=[Depends(require_role(["admin"]))])
def create_worker(request: Request, worker: WorkerCreate, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    
    # Check if username exists system-wide to prevent DB crash
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

# --- CUSTOMERS ---
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

# --- DAILY STOCK ---
@router.post("/stock", dependencies=[Depends(require_role(["admin"]))])
def add_daily_stock(request: Request, entry: DailyStockEntry, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    
    # Check if entry already exists
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
    # target_date format: YYYY-MM-DD
    stocks = db.query(DailyStock).filter(
        DailyStock.tenant_id == request.state.tenant_id, 
        DailyStock.date == target_date
    ).all()
    return stocks
