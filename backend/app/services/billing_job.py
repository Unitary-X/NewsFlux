from app.core.celery_app import celery_app
from app.api.dependencies import SessionLocal
from app.models.models import Customer, CustomerSubscription, DailyStock, Invoice

@celery_app.task
def generate_monthly_bills(tenant_id: str, month: int, year: int):
    """
    Background Task: Scans all subscribers for the Agency (tenant_id)
    and aggregates their daily delivery vectors to compute their Final Bill.
    """
    db = SessionLocal()
    try:
        customers = db.query(Customer).filter(Customer.tenant_id == tenant_id).all()
        
        for cust in customers:
            # 1. Fetch Subscription rules (Base Newspaper Costs)
            subscriptions = db.query(CustomerSubscription).filter(
               CustomerSubscription.customer_id == cust.id,
               CustomerSubscription.status == 1 # Active this month
            ).all()

            total_bill = 0.0
            
            # This is a simplified calculation:
            for sub in subscriptions:
                # E.g. (Price_d * Days_Delivered)
                # In a real model, we query the `AuditLogs` for specific un-delivered days
                # and subtract them from the absolute month length.
                total_bill += (sub.delivery_fee + float(sub.newspaper.base_price * 30))

            # 2. Generate Invoice Record
            if total_bill > 0:
                new_invoice = Invoice(
                    tenant_id=tenant_id,
                    customer_id=cust.id,
                    amount_due=total_bill,
                    status="Pending"
                )
                db.add(new_invoice)
                
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
        
    return {"status": "success", "tenant_id": tenant_id, "month": month, "year": year}
