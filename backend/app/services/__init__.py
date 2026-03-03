"""
Business logic and service layer implementations.

This module contains service classes that encapsulate:
- Email operations (email_service.py, email_tasks.py)
- Google Drive integration (gdrive_service.py, google_drive.py)
- Data export operations (excel_export.py)
- Scheduled jobs (backup_scheduler.py, billing_job.py)

Services are used by API handlers to separate business logic from HTTP concerns.
"""

# Import main service classes for explicit module interface
# Services should be imported directly when needed rather than exposing everything

__all__ = [
    # Service modules for explicit import
    'email_service',
    'email_tasks',
    'gdrive_service',
    'google_drive',
    'excel_export',
    'backup_scheduler',
    'billing_job',
]
