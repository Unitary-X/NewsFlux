"""
Audit logging decorator for automatic CRUD audit trail.

This decorator automatically logs user actions by:
1. Executing the route handler
2. Extracting action/resource metadata and result details
3. Logging the action to the audit_logs table
4. Committing the audit log (or letting caller handle it for sync functions)

Usage in route handlers:
    @with_audit("CREATE", "customers")
    def create_customer(request: Request, ...):
        request.state.audit_details = {"name": "John"}  # Optional
        return customer

Environment Variables:
- AUDIT_ENABLED: Set to "false" to disable audit logging globally (default: "true")

For more information, see docs/audit_logging.md
"""
from functools import wraps
from fastapi import Request
from sqlalchemy.orm import Session
from app.core.audit import log_audit
import uuid as uuid_mod
import os
import logging

logger = logging.getLogger(__name__)

# Check if audit logging is enabled
AUDIT_ENABLED = os.getenv("AUDIT_ENABLED", "true").lower() != "false"


def with_audit(action: str, resource: str):
    """
    Decorator to automatically log audit events for route handlers.
    
    This decorator will:
    1. Call the wrapped function
    2. Extract audit metadata from request.state or result
    3. Log the action with user_id, tenant_id, and optional details
    4. Commit the audit log (for async) or add to session (for sync)
    
    Args:
        action: CRUD/audit action type (CREATE, UPDATE, DELETE, READ, EXPORT, 
                LOGIN, LOGIN_FAILED, GDRIVE_CONNECTED, GDRIVE_DISCONNECTED, etc.)
        resource: Resource type being acted upon (customers, newspapers, agencies, 
                  workers, backups, etc.)
    
    Returns:
        Decorated function that logs audit events automatically
    
    Usage Example:
        @router.post("/customers")
        @with_audit("CREATE", "customers")
        def create_customer(request: Request, payload: CreateCustomerRequest, db: Session = Depends(get_db)):
            # Optionally set additional audit details
            request.state.audit_details = {"name": payload.name}
            request.state.audit_resource_id = new_customer.id  # Can extract from result if not set
            
            customer = Customer(name=payload.name, tenant_id=request.state.tenant_id)
            db.add(customer)
            db.commit()
            return customer
    
    Optional request.state attributes:
        - audit_resource_id: Explicit resource ID (will attempt to extract from result if not set)
        - audit_details: Dict of additional details (action-specific metadata)
    
    Note:
        - The decorator uses the global AUDIT_ENABLED flag; set AUDIT_ENABLED=false to disable
        - User must be authenticated (request.state.user_id must exist)
        - Tenant ID is automatically extracted from request.state.tenant_id if available  
        - For async functions, audit log is committed automatically
        - For sync functions, audit log is added to session; caller must commit
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(request: Request, *args, db: Session = None, **kwargs):
            result = await func(request, *args, db=db, **kwargs)
            
            # Skip audit logging if disabled or required context missing
            if not AUDIT_ENABLED or not db or not hasattr(request.state, 'user_id'):
                return result
            
            try:
                # Extract audit metadata from request state or result
                resource_id = getattr(request.state, 'audit_resource_id', None)
                details = getattr(request.state, 'audit_details', {})
                
                # Try to extract ID from result if not explicitly set
                if not resource_id and hasattr(result, 'id'):
                    resource_id = result.id
                elif not resource_id and isinstance(result, dict) and 'id' in result:
                    resource_id = result['id']
                
                log_audit(
                    db=db,
                    user_id=request.state.user_id,
                    action=action,
                    resource=resource,
                    resource_id=resource_id if isinstance(resource_id, uuid_mod.UUID) else None,
                    details=details,
                    tenant_id=getattr(request.state, 'tenant_id', None)
                )
                db.commit()
            except Exception as e:
                logger.error(f"Error logging audit event for {action}/{resource}: {str(e)}", exc_info=True)
                # Don't fail the request if audit logging fails
            
            return result
        
        @wraps(func)
        def sync_wrapper(request: Request, *args, db: Session = None, **kwargs):
            result = func(request, *args, db=db, **kwargs)
            
            # Skip audit logging if disabled or required context missing
            if not AUDIT_ENABLED or not db or not hasattr(request.state, 'user_id'):
                return result
            
            try:
                # Extract audit metadata from request state or result
                resource_id = getattr(request.state, 'audit_resource_id', None)
                details = getattr(request.state, 'audit_details', {})
                
                # Try to extract ID from result if not explicitly set
                if not resource_id and hasattr(result, 'id'):
                    resource_id = result.id
                elif not resource_id and isinstance(result, dict) and 'id' in result:
                    resource_id = result['id']
                
                log_audit(
                    db=db,
                    user_id=request.state.user_id,
                    action=action,
                    resource=resource,
                    resource_id=resource_id if isinstance(resource_id, uuid_mod.UUID) else None,
                    details=details,
                    tenant_id=getattr(request.state, 'tenant_id', None)
                )
                # Note: Don't commit here for sync functions; caller should commit
            except Exception as e:
                logger.error(f"Error logging audit event for {action}/{resource}: {str(e)}", exc_info=True)
                # Don't fail the request if audit logging fails
            
            return result
        
        # Return appropriate wrapper based on whether func is async
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

