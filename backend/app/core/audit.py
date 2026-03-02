"""
Audit logging utility for tracking all CRUD operations in the system.
Usage:
    from app.core.audit import log_audit
    log_audit(db, user_id, "CREATE", "customers", entity_id, {"name": "John"})
"""
from sqlalchemy.orm import Session
from app.models.models import AuditLog
import uuid as uuid_mod


def log_audit(
    db: Session,
    user_id: uuid_mod.UUID,
    action: str,  # CREATE, UPDATE, DELETE, READ, EXPORT, etc.
    resource: str,  # customers, newspapers, workers, etc.
    resource_id: uuid_mod.UUID = None,
    details: dict = None,
    tenant_id: uuid_mod.UUID = None
):
    """
    Log an audit event to the audit_logs table.
    
    Args:
        db: SQLAlchemy session
        user_id: UUID of the user performing the action
        action: Type of action (CREATE, UPDATE, DELETE, READ, EXPORT, etc.)
        resource: Resource being acted upon (customers, newspapers, etc.)
        resource_id: UUID of the specific resource (optional)
        details: Additional JSON details about the action (optional)
        tenant_id: Tenant/agency ID for multi-tenant logging (optional)
    """
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource, 
        resource_id=resource_id,
        details=details or {},
        tenant_id=tenant_id
    )
    db.add(audit)
    # Note: Caller should commit the transaction
    return audit
