"""
Audit logging decorator for automatic CRUD audit trail.
Usage in route handlers:
    request.state.audit_action = "CREATE"
    request.state.audit_resource = "customers"
    request.state.audit_resource_id = customer.id
    request.state.audit_details = {"name": "John"}
"""
from functools import wraps
from fastapi import Request
from sqlalchemy.orm import Session
from app.core.audit import log_audit
import uuid as uuid_mod


def with_audit(action: str, resource: str):
    """
    Decorator to automatically log audit events for route handlers.
    
    Args:
        action: CRUD action (CREATE, UPDATE, DELETE, READ, EXPORT)
        resource: Resource type (customers, newspapers, workers, etc.)
    
    Usage:
        @with_audit("CREATE", "customers")
        def create_customer(request: Request, ...):
            # Your code here
            # Optionally set request.state.audit_details for additional info
            return result
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(request: Request, *args, db: Session = None, **kwargs):
            result = await func(request, *args, db=db, **kwargs)
            
            if db and hasattr(request.state, 'user_id'):
                # Extract audit details from request state or result
                resource_id = getattr(request.state, 'audit_resource_id', None)
                details = getattr(request.state, 'audit_details', {})
                
                # Try to extract ID from result if it's a dict or object
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
            
            return result
        
        @wraps(func)
        def sync_wrapper(request: Request, *args, db: Session = None, **kwargs):
            result = func(request, *args, db=db, **kwargs)
            
            if db and hasattr(request.state, 'user_id'):
                # Extract audit details from request state or result
                resource_id = getattr(request.state, 'audit_resource_id', None)
                details = getattr(request.state, 'audit_details', {})
                
                # Try to extract ID from result if it's a dict or object
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
                # Note: Don't commit here, let the route handler commit
            
            return result
        
        # Return appropriate wrapper based on whether func is async
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
