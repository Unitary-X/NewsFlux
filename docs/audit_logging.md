"""
Audit Logging Guide for NewsFlux Platform

This document explains how to implement audit logging for tracking all user actions in the system.

## Overview

Audit logging provides a complete record of all user actions (CREATE, UPDATE, DELETE, READ, EXPORT, etc.)
in the system. This is essential for compliance, security monitoring, and debugging.

## Usage Patterns

### Pattern 1: Direct Audit Logging

For simple CRUD operations, use the log_audit function directly:

```python
from app.core.audit import log_audit

@router.post("/customers")
def create_customer(request: Request, payload: CustomerRequest, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    customer = Customer(
        name=payload.name, tenant_id=tenant_id
    )
    db.add(customer)
    db.flush()  # Get the ID before audit logging
    
    # Log the action
    log_audit(
        db=db,
        user_id=user_id,
        action="CREATE",
        resource="customers",
        resource_id=customer.id,
        tenant_id=tenant_id,
        details={"name": payload.name}
    )
    
    db.commit()
    return customer
```

### Pattern 2: Decorator-Based Audit Logging

For endpoints that follow standard patterns, use the @with_audit decorator:

```python
from app.core.audit_decorator import with_audit

@router.post("/customers")
@with_audit("CREATE", "customers")
def create_customer(request: Request, payload: CustomerRequest, db: Session = Depends(get_db)):
    # Set optional audit details in request.state
    request.state.audit_details = {"name": payload.name}
    
    customer = Customer(
        name=payload.name, tenant_id=request.state.tenant_id
    )
    db.add(customer)
    db.commit()
    return customer
```

### Pattern 3: Update Operations with Change Tracking

Track what specifically changed:

```python
@router.put("/customers/{customer_id}")
def update_customer(
    request: Request, 
    customer_id: str,
    payload: CustomerUpdateRequest,
    db: Session = Depends(get_db)
):
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    customer = db.query(Customer).filter(
        Customer.id == UUID(customer_id),
        Customer.tenant_id == tenant_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404)
    
    # Track changes
    changes = {}
    if payload.name and payload.name != customer.name:
        changes["name"] = {"old": customer.name, "new": payload.name}
        customer.name = payload.name
    
    if payload.address and payload.address != customer.address:
        changes["address"] = {"old": customer.address, "new": payload.address}
        customer.address = payload.address
    
    db.commit()
    
    # Only log if something changed
    if changes:
        log_audit(
            db=db,
            user_id=user_id,
            action="UPDATE",
            resource="customers",
            resource_id=customer.id,
            tenant_id=tenant_id,
            details=changes
        )
        db.commit()
    
    return customer
```

## Audit Log Fields

The AuditLog model captures:
- `id`: Unique audit log ID
- `user_id`: ID of the user who performed the action
- `action`: Type of action (CREATE, UPDATE, DELETE, READ, EXPORT, GDRIVE_CONNECTED, etc.)
- `target_table`: Resource being acted upon (customers, newspapers, agencies, etc.)
- `resource_id`: ID of the specific resource (optional)
- `changes`: JSON field with action details (field names, values, change history)
- `tenant_id`: Tenant/agency ID for multi-tenant isolation
- `created_at`: Timestamp of the action

## Recommended Actions to Log

### Administrative Actions (Always Log)
- CREATE: New agency/newspaper/worker created
- UPDATE: Agency settings, worker assignments changed
- DELETE: Newspapers, customers, workers removed
- EXPORT: Excel/CSV exports for analytics

### Security Events (Always Log)
- LOGIN: User login attempt (success/failure logged separately)
- LOGIN_FAILED: Failed authentication attempt
- GDRIVE_CONNECTED: OAuth2 connection authorized
- GDRIVE_DISCONNECTED: OAuth2 access revoked
- PASSWORD_RESET: User requested password reset
- PASSWORD_CHANGED: Password successfully changed

### Financial Transactions (Always Log)
- BILLING_RUN: Monthly billing initiated
- INVOICE_GENERATED: Invoice created
- PAYMENT_RECEIVED: Payment recorded

### Bulk Operations (Always Log)
- BACKUP_CREATED: Data backup initiated
- BACKUP_DELETED: Backup file removed
- OFFLINE_SYNC: Worker offline sync completed

### Optional (Log in Compliance Environments)
- READ: View sensitive reports, customer lists
- SEARCH: Search queries on customer/order data
- IMPORT: Bulk import of customer/order data

## Best Practices

1. **Log Before Commit**: Always log the action before db.commit() so logs are atomic with data changes
2. **Include Changes**: For UPDATE actions, include the field name and new values in details
3. **Tenant Isolation**: Always pass tenant_id to ensure audit logs respect multi-tenancy  
4. **User Context**: Always log the actual user_id from request.state, not impersonation IDs
5. **Sensitive Data**: Exclude passwords, payment tokens, and PII from audit details where possible
6. **Action Consistency**: Use consistent action names (CREATE, UPDATE, DELETE) for easier analysis

## Querying Audit Logs

Examples of audit queries:

```python
# Get all actions by user in last 30 days
from datetime import timedelta, datetime
user_actions = db.query(AuditLog).filter(
    AuditLog.user_id == target_user_id,
    AuditLog.created_at >= datetime.utcnow() - timedelta(days=30)
).all()

# Get all DELETE operations for a resource
deletes = db.query(AuditLog).filter(
    AuditLog.action == "DELETE",
    AuditLog.target_table == "customers",
    AuditLog.tenant_id == tenant_id
).all()

# Get failed login attempts
failed_logins = db.query(AuditLog).filter(
    AuditLog.action == "LOGIN_FAILED",
    AuditLog.created_at >= datetime.utcnow() - timedelta(hours=1)
).all()
```

## Testing Audit Logging

When writing tests, verify audit logs are created:

```python
def test_create_customer_creates_audit_log(db: Session):
    # Setup
    user = create_test_user(db)
    tenant = create_test_agency(db)
    
    # Execute
    customer = create_customer(db, user.id, tenant.id, "John Doe")
    
    # Assert
    audit = db.query(AuditLog).filter(
        AuditLog.action == "CREATE",
        AuditLog.target_table == "customers",
        AuditLog.resource_id == customer.id
    ).first()
    
    assert audit is not None
    assert audit.user_id == user.id
    assert audit.details["name"] == "John Doe"
```
"""
