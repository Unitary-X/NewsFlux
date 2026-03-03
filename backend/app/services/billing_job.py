from app.core.celery_app import celery_app
from app.api.dependencies import SessionLocal
from app.models.models import Customer, CustomerSubscription, Newspaper, DailyDelivery, Invoice
import calendar
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def generate_monthly_bills(tenant_id: str, month: int, year: int):
    """
    Background Task: Scans all subscribers for the Agency (tenant_id)
    and aggregates their daily delivery vectors to compute their Final Bill.
    """
    db = SessionLocal()
    invoices_generated = 0
    failed_customers = []
    
    try:
        logger.info(f"Starting billing job for tenant={tenant_id}, month={month}/{year}")
        
        days_in_month = calendar.monthrange(year, month)[1]
        customers = db.query(Customer).filter(Customer.tenant_id == tenant_id).all()
        
        logger.info(f"Processing {len(customers)} customers for tenant={tenant_id}")
        
        for cust in customers:
            try:
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
                        logger.warning(f"Newspaper {sub.newspaper_id} not found for customer {cust.id}")
                        continue
                    
                    price = float(sub.price) if sub.price else float(newspaper.base_price)
                    
                    # Count missed deliveries to deduct
                    missed = db.query(DailyDelivery).filter(
                        DailyDelivery.customer_id == cust.id,
                        DailyDelivery.tenant_id == tenant_id,
                        DailyDelivery.status == "missed",
                    ).count()
                    
                    active_days = days_in_month - missed
                    sub_amount = price * sub.quantity * active_days
                    total_bill += sub_amount
                    
                    logger.debug(f"Customer {cust.id}: newspaper {newspaper.name}, "
                                f"amount={sub_amount}, missed_days={missed}")

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
                    invoices_generated += 1
                    logger.debug(f"Invoice created for customer {cust.id}: {total_bill}")
                
            except Exception as e:
                logger.error(f"Failed to process billing for customer {cust.id}: {str(e)}", exc_info=True)
                failed_customers.append(cust.id)
                continue
        
        db.commit()
        logger.info(f"Billing job completed: {invoices_generated} invoices generated, "
                   f"{len(failed_customers)} customers failed")
        
        if failed_customers:
            logger.warning(f"Failed customer IDs: {failed_customers}")
            
    except Exception as e:
        logger.error(f"Billing job failed for tenant={tenant_id}: {str(e)}", exc_info=True)
        db.rollback()
        raise e
    finally:
        db.close()
        
    return {
        "status": "success" if not failed_customers else "partial",
        "tenant_id": tenant_id,
        "month": month,
        "year": year,
        "invoices_generated": invoices_generated,
        "failed_customers": len(failed_customers)
    }
