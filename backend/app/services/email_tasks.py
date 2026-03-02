"""
Celery tasks for sending emails asynchronously.
"""
import asyncio
import logging
from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

# Create database session
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Get database session for Celery tasks"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@shared_task(name="email.send_agency_created")
def send_agency_created_email(agency_name: str, admin_username: str, admin_email: str, dashboard_url: str):
    """Send email when a new agency is created"""
    plain_text, html = EmailService.get_agency_created_template(
        agency_name=agency_name,
        admin_username=admin_username,
        dashboard_url=dashboard_url
    )
    
    try:
        # Use asyncio to run async email sending in Celery task
        result = asyncio.run(EmailService.send_email(
            to_email=admin_email,
            subject=f"Welcome to NewsFlux - {agency_name}",
            html_content=html,
            plain_text_content=plain_text
        ))
        logger.info(f"Agency created email sent to {admin_email}: {result}")
        return {"status": "sent", "recipient": admin_email}
    except Exception as e:
        logger.error(f"Failed to send agency created email: {str(e)}")
        return {"status": "failed", "error": str(e)}

@shared_task(name="email.send_agency_suspended")
def send_agency_suspended_email(agency_name: str, admin_email: str, reason: str, support_email: str):
    """Send email when an agency is suspended"""
    plain_text, html = EmailService.get_agency_suspended_template(
        agency_name=agency_name,
        reason=reason,
        support_email=support_email
    )
    
    try:
        result = asyncio.run(EmailService.send_email(
            to_email=admin_email,
            subject="Agency Suspension Notice",
            html_content=html,
            plain_text_content=plain_text
        ))
        logger.info(f"Agency suspended email sent to {admin_email}: {result}")
        return {"status": "sent", "recipient": admin_email}
    except Exception as e:
        logger.error(f"Failed to send agency suspended email: {str(e)}")
        return {"status": "failed", "error": str(e)}

@shared_task(name="email.send_billing_reminder")
def send_billing_reminder_email(agency_name: str, admin_email: str, amount: float, due_date: str, invoice_url: str):
    """Send email billing reminder"""
    plain_text, html = EmailService.get_billing_reminder_template(
        agency_name=agency_name,
        amount=amount,
        due_date=due_date,
        invoice_url=invoice_url
    )
    
    try:
        result = asyncio.run(EmailService.send_email(
            to_email=admin_email,
            subject=f"Billing Reminder - Invoice Due {due_date}",
            html_content=html,
            plain_text_content=plain_text
        ))
        logger.info(f"Billing reminder email sent to {admin_email}: {result}")
        return {"status": "sent", "recipient": admin_email}
    except Exception as e:
        logger.error(f"Failed to send billing reminder email: {str(e)}")
        return {"status": "failed", "error": str(e)}

@shared_task(name="email.send_announcement")
def send_announcement_email(recipient_email: str, title: str, message: str, platform_url: str):
    """Send announcement email"""
    plain_text, html = EmailService.get_announcement_template(
        title=title,
        message=message,
        platform_url=platform_url
    )
    
    try:
        result = asyncio.run(EmailService.send_email(
            to_email=recipient_email,
            subject=f"NewsFlux: {title}",
            html_content=html,
            plain_text_content=plain_text
        ))
        logger.info(f"Announcement email sent to {recipient_email}: {result}")
        return {"status": "sent", "recipient": recipient_email}
    except Exception as e:
        logger.error(f"Failed to send announcement email: {str(e)}")
        return {"status": "failed", "error": str(e)}

@shared_task(name="email.bulk_announcements")
def send_bulk_announcements(recipient_emails: list, title: str, message: str, platform_url: str):
    """Send announcements to multiple recipients"""
    results = []
    for email in recipient_emails:
        result = send_announcement_email.delay(email, title, message, platform_url)
        results.append({"email": email, "task_id": result.id})
    
    return {"total": len(recipient_emails), "task_ids": results}
