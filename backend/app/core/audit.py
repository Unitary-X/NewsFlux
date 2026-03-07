"""
Audit logging utility for tracking all CRUD operations in the system.

This module provides the core log_audit function for recording user actions.
For decorator-based automatic logging, use audit_decorator.with_audit.
For comprehensive usage guide, see docs/audit_logging.md

Usage:
    from app.core.audit import log_audit
    log_audit(
        db=db,
        user_id=user_id,
        action="CREATE",
        resource="customers",
        resource_id=customer_id,
        tenant_id=agency_id,
        details={"name": "John Doe"}
    )
    db.commit()  # Important: commit after logging
"""
from sqlalchemy.orm import Session
from app.models.models import AuditLog
import uuid as uuid_mod
from typing import Optional, Any, Dict
import logging

logger = logging.getLogger(__name__)


def log_audit(
    db: Session,
    user_id: uuid_mod.UUID,
    action: str,
    resource: str,
    resource_id: Optional[uuid_mod.UUID] = None,
    details: Optional[Dict[str, Any]] = None,
    tenant_id: Optional[uuid_mod.UUID] = None
) -> AuditLog:
    """
    Log an audit event to the audit_logs table.
    
    This function creates an AuditLog record capturing a user action.
    The audit log is added to the session but NOT committed - the caller
    must call db.commit() when ready.
    
    Args:
        db: SQLAlchemy session for database operations
        user_id: UUID of the user performing the action (required)
        action: Type of action being logged. Common values:
            - CRUD actions: CREATE, UPDATE, DELETE, READ
            - Auth actions: LOGIN, LOGIN_FAILED, PASSWORD_RESET, PASSWORD_CHANGED
            - Integration actions: GDRIVE_CONNECTED, GDRIVE_DISCONNECTED
            - Data actions: EXPORT, IMPORT, BACKUP_CREATED, BACKUP_DELETED
            - Other: OFFLINE_SYNC, BILLING_RUN, INVOICE_GENERATED, etc.
        resource: Resource/table being acted upon. Examples:
            - customers, newspapers, workers
            - agencies, users, subscriptions
            - backups, exports, payments
        resource_id: UUID of the specific resource being affected (optional)
            For list operations (e.g., READ all customers), omit this.
            For specific operations (CREATE customer, UPDATE newspaper), include it.
        details: Dictionary of additional context-specific details (optional)
            For CREATE: {"field_name": "value"}
            For UPDATE: {"field_name": {"old": old_value, "new": new_value}}
            For DELETE: {"name": resource_name, "related_count": 5}
            For EXPORT: {"format": "xlsx", "rows": 1000}
        tenant_id: UUID of the tenant/agency performing the action (optional but recommended)
            Required for multi-tenant isolation and compliance
    
    Returns:
        The created AuditLog object (added to session, not yet committed)
    
    Example 1 - Create with full details:
        log_audit(
            db=db,
            user_id=user_id,
            action="CREATE",
            resource="customers",
            resource_id=new_customer.id,
            tenant_id=tenant_id,
            details={"name": "Acme Corp", "email": "contact@acme.com"}
        )
        db.commit()
    
    Example 2 - Update with change tracking:
        log_audit(
            db=db,
            user_id=user_id,
            action="UPDATE",
            resource="newspapers",
            resource_id=newspaper_id,
            tenant_id=tenant_id,
            details={
                "base_price": {"old": 5.00, "new": 6.00},
                "status": {"old": "active", "new": "paused"}
            }
        )
        db.commit()
    
    Example 3 - Security event (no resource_id needed):
        log_audit(
            db=db,
            user_id=user_id,
            action="GDRIVE_CONNECTED",
            resource="agencies",
            tenant_id=tenant_id,
            details={"email": "admin@acme.com"}
        )
        db.commit()
    
    Note:
        - Always call db.commit() after log_audit to persist the log
        - Include tenant_id for multi-tenant compliance
        - Avoid logging sensitive data (passwords, tokens, SSNs) in details
        - user_id should be the actual user performing the action, not an impersonation ID
    """
    try:
        # Ensure UUIDs are proper types, not strings
        if isinstance(user_id, str):
            user_id = uuid_mod.UUID(user_id)
        if isinstance(tenant_id, str):
            tenant_id = uuid_mod.UUID(tenant_id)
        audit = AuditLog(
            user_id=user_id,
            action=action,
            target_table=resource,
            changes=details or {},
            tenant_id=tenant_id
        )
        db.add(audit)
        logger.debug(f"Audit log created: {action} on {resource} by user {user_id}")
        return audit
    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
        # Re-raise so caller knows logging failed
        raise

