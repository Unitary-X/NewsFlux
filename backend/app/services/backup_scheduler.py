"""
Backup Scheduler — Celery tasks for automated Google Drive backups.
Daily / Monthly / Yearly exports per agency.
"""
import logging
from datetime import date, timedelta

from app.core.celery_app import celery_app
from app.api.dependencies import SessionLocal
from app.models.models import Agency
from app.services.excel_export import (
    generate_daily_stock_excel,
    generate_daily_deliveries_excel,
    generate_monthly_revenue_excel,
    generate_monthly_subscriptions_excel,
    generate_monthly_invoices_excel,
    generate_yearly_report_excel,
)
from app.services.gdrive_service import upload_file

logger = logging.getLogger(__name__)


def _get_connected_agencies(db):
    """Return agencies that have Google Drive connected."""
    return db.query(Agency).filter(
        Agency.gdrive_refresh_token.isnot(None),
        Agency.status == "active",
    ).all()


@celery_app.task(name="backup.daily")
def run_daily_backup(agency_id: str = None):
    """
    Generate and upload daily reports.
    If agency_id is given, run for that agency only. Otherwise run for all connected agencies.
    """
    db = SessionLocal()
    try:
        target_date = date.today()
        date_str = target_date.isoformat()

        if agency_id:
            agencies = db.query(Agency).filter(Agency.id == agency_id).all()
        else:
            agencies = _get_connected_agencies(db)

        results = []
        for agency in agencies:
            if not agency.gdrive_refresh_token:
                continue
            try:
                # Daily stock report
                stock_bytes = generate_daily_stock_excel(db, agency.id, target_date)
                upload_file(
                    agency.gdrive_refresh_token, agency.name,
                    "Daily Updates", f"{date_str}_daily_stock.xlsx", stock_bytes,
                )

                # Daily deliveries report
                delivery_bytes = generate_daily_deliveries_excel(db, agency.id, target_date)
                upload_file(
                    agency.gdrive_refresh_token, agency.name,
                    "Daily Updates", f"{date_str}_deliveries.xlsx", delivery_bytes,
                )

                results.append({"agency": agency.name, "status": "success"})
                logger.info(f"Daily backup completed for agency: {agency.name}")
            except Exception as e:
                results.append({"agency": agency.name, "status": "error", "error": str(e)})
                logger.error(f"Daily backup failed for {agency.name}: {e}")

        return {"date": date_str, "results": results}
    finally:
        db.close()


@celery_app.task(name="backup.monthly")
def run_monthly_backup(agency_id: str = None):
    """
    Generate and upload monthly reports (for the previous month).
    Typically scheduled on the 1st of each month.
    """
    db = SessionLocal()
    try:
        # Previous month
        today = date.today()
        first_of_month = today.replace(day=1)
        last_month_date = first_of_month - timedelta(days=1)
        month = last_month_date.month
        year = last_month_date.year
        month_str = f"{year}-{month:02d}"

        if agency_id:
            agencies = db.query(Agency).filter(Agency.id == agency_id).all()
        else:
            agencies = _get_connected_agencies(db)

        results = []
        for agency in agencies:
            if not agency.gdrive_refresh_token:
                continue
            try:
                # Revenue report
                rev_bytes = generate_monthly_revenue_excel(db, agency.id, month, year)
                upload_file(
                    agency.gdrive_refresh_token, agency.name,
                    "Monthly Analysis", f"{month_str}_revenue_report.xlsx", rev_bytes,
                )

                # Subscription summary
                sub_bytes = generate_monthly_subscriptions_excel(db, agency.id, month, year)
                upload_file(
                    agency.gdrive_refresh_token, agency.name,
                    "Monthly Analysis", f"{month_str}_subscription_summary.xlsx", sub_bytes,
                )

                # Invoice report
                inv_bytes = generate_monthly_invoices_excel(db, agency.id, month, year)
                upload_file(
                    agency.gdrive_refresh_token, agency.name,
                    "Monthly Analysis", f"{month_str}_invoice_report.xlsx", inv_bytes,
                )

                results.append({"agency": agency.name, "status": "success"})
                logger.info(f"Monthly backup completed for agency: {agency.name}")
            except Exception as e:
                results.append({"agency": agency.name, "status": "error", "error": str(e)})
                logger.error(f"Monthly backup failed for {agency.name}: {e}")

        return {"month": month_str, "results": results}
    finally:
        db.close()


@celery_app.task(name="backup.yearly")
def run_yearly_backup(agency_id: str = None):
    """
    Generate and upload yearly report (for the previous year).
    Typically scheduled on Jan 1st.
    """
    db = SessionLocal()
    try:
        year = date.today().year - 1

        if agency_id:
            agencies = db.query(Agency).filter(Agency.id == agency_id).all()
        else:
            agencies = _get_connected_agencies(db)

        results = []
        for agency in agencies:
            if not agency.gdrive_refresh_token:
                continue
            try:
                yearly_bytes = generate_yearly_report_excel(db, agency.id, year)
                upload_file(
                    agency.gdrive_refresh_token, agency.name,
                    "Yearly Analysis", f"{year}_annual_report.xlsx", yearly_bytes,
                )

                results.append({"agency": agency.name, "status": "success"})
                logger.info(f"Yearly backup completed for agency: {agency.name}")
            except Exception as e:
                results.append({"agency": agency.name, "status": "error", "error": str(e)})
                logger.error(f"Yearly backup failed for {agency.name}: {e}")

        return {"year": year, "results": results}
    finally:
        db.close()
