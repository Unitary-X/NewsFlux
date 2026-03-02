from app.core.celery_app import celery_app
from app.api.dependencies import SessionLocal
from app.models.models import Customer, CustomerSubscription, Newspaper, DailyDelivery, Invoice
import calendar

@celery_app.task
def generate_monthly_bills(tenant_id: str, month: int, year: int):
    """
    Background Task: Scans all subscribers for the Agency (tenant_id)
    and aggregates their daily delivery vectors to compute their Final Bill.
    """
    db = SessionLocal()
    try:
        days_in_month = calendar.monthrange(year, month)[1]
        customers = db.query(Customer).filter(Customer.tenant_id == tenant_id).all()
        
        for cust in customers:
            # 1. Fetch active subscriptions for this customer
            subscriptions = db.query(CustomerSubscription).filter(
               CustomerSubscription.customer_id == cust.id,
               CustomerSubscription.status == 1  # Active
            ).all()

            total_bill = 0.0
            
            for sub in subscriptions:
                # Get the newspaper's base price, use subscription override if set
                newspaper = db.query(Newspaper).filter(Newspaper.id == sub.newspaper_id).first()
                if not newspaper:
                    continue
                price = float(sub.price) if sub.price else float(newspaper.base_price)
                
                # Count missed deliveries to deduct
                missed = db.query(DailyDelivery).filter(
                    DailyDelivery.customer_id == cust.id,
                    DailyDelivery.tenant_id == tenant_id,
                    DailyDelivery.status == "missed",
                ).count()
                
                active_days = days_in_month - missed
                total_bill += price * sub.quantity * active_days

            # 2. Generate Invoice Record
            if total_bill > 0:
                new_invoice = Invoice(
                    tenant_id=tenant_id,
                    customer_id=cust.id,
                    month=month,
                    year=year,
                    total_amount=total_bill,
                    delivery_fee=0.00,
                    status="pending"
                )
                db.add(new_invoice)
                
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
        
    return {"status": "success", "tenant_id": tenant_id, "month": month, "year": year}
