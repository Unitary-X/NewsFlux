"""
Request State Documentation for NewsFlux API

The request.state object carries user context and tenant information through the request lifecycle.
This is set by middleware and must be available in all protected endpoints.

## Request State Attributes

All attributes are added to `request.state` by TenantMiddleware (see core/middleware.py).

### Authentication & Authorization
- `user_id` (UUID): ID of the authenticated user
  - Type: uuid.UUID
  - Availability: All authenticated endpoints (401 if missing)
  - Used for: Audit logging, owner validation, user-specific queries
  
- `username` (str): Username of authenticated user
  - Type: str
  - Availability: All authenticated endpoints
  - Used for: Logging, display purposes

- `role` (str): User's role in the system
  - Type: str
  - Values: "super_admin", "admin", "worker"
  - Availability: All authenticated endpoints
  - Used for: Authorization checks via @require_role decorator

### Multi-Tenancy
- `tenant_id` (UUID): ID of the user's agency/tenant
  - Type: uuid.UUID
  - Availability: All endpoints except super_admin endpoints
  - Used for: Data isolation, filtering queries to tenant scope
  - Important: ALL database queries must filter by tenant_id unless super_admin

### User State (Set by Middleware)
- `is_authenticated` (bool): Whether user is authenticated
  - Type: bool
  - Availability: All endpoints
  - Used for: Conditional logic, determining if auth is required

- `headers` (dict): HTTP request headers
  - Type: dict
  - Availability: All endpoints
  - Used for: Extracting auth tokens, user agent, etc.

## Usage Patterns

### In API Endpoints

#### Protected Endpoint (Regular User)
```python
@router.get("/customers")
def get_customers(request: Request, db: Session = Depends(get_db)):
    # request.state.user_id - who is making the request
    # request.state.tenant_id - which agency's data to return
    # request.state.role - to check if they have permission
    
    customers = db.query(Customer).filter(
        Customer.tenant_id == request.state.tenant_id  # CRITICAL for isolation
    ).all()
    
    # Log the action
    log_audit(db, request.state.user_id, "READ", "customers", 
              tenant_id=request.state.tenant_id)
    
    return customers
```

#### Checking Specific Roles
```python
@router.post("/admin/settings")
def update_settings(request: Request, db: Session = Depends(get_db)):
    # Dependencies can check role automatically
    if request.state.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # OR use the @require_role decorator
    # @router.post("/admin/settings")
    # def update_settings(..., role = Depends(require_role(["admin"]))):
```

#### Super Admin Endpoints
```python
@router.get("/superadmin/agencies")
def get_all_agencies(request: Request, db: Session = Depends(get_db)):
    # Super admin can see all agencies
    if request.state.role != "super_admin":
        raise HTTPException(status_code=403)
    
    # No tenant_id filter - super admin sees everything
    agencies = db.query(Agency).all()
    
    return agencies
```

### In Services

```python
def send_welcome_email(user_id: UUID, tenant_id: UUID, email: str):
    """Services receive explicit parameters, not request.state"""
    # Good practice: pass needed values explicitly
    # This makes services easier to test and reuse
    pass
```

### In Tests

```python
def test_customer_listing(client):
    # Setup: mock request.state
    request.state.user_id = test_user_id
    request.state.tenant_id = test_tenant_id
    request.state.role = "admin"
    
    # Test the endpoint
    response = client.get("/customers")
    assert response.status_code == 200
```

## Middleware Initialization

The TenantMiddleware (in core/middleware.py) sets these attributes:

1. Extract Bearer token from Authorization header
2. Decode JWT to get user_id, tenant_id, role, username
3. Set request.state attributes
4. If token missing/invalid → return 401

```python
# From middleware.py
async def __call__(self, request: Request, call_next):
    # Extract token from header
    token = extract_bearer_token(request.headers.get("Authorization", ""))
    
    if token:
        try:
            payload = decode_token(token)
            request.state.user_id = payload.get("sub")
            request.state.role = payload.get("role")
            request.state.tenant_id = payload.get("tenant_id")
            request.state.username = payload.get("username")
            request.state.is_authenticated = True
        except:
            request.state.is_authenticated = False
    else:
        request.state.is_authenticated = False
    
    response = await call_next(request)
    return response
```

## Database Query Patterns

### Correct: Tenant-filtered queries
```python
# Single user from their own agency
customer = db.query(Customer).filter(
    Customer.id == customer_id,
    Customer.tenant_id == request.state.tenant_id  # Always add this
).first()

# All customers in user's agency
customers = db.query(Customer).filter(
    Customer.tenant_id == request.state.tenant_id
).all()

# With relationships
agency = db.query(Agency).filter(
    Agency.id == request.state.tenant_id
).first()
```

### Incorrect: Missing tenant_id filter
```python
# ❌ SECURITY BUG: Can access any customer
customer = db.query(Customer).filter(Customer.id == customer_id).first()

# ❌ SECURITY BUG: Returns all customers across all agencies
customers = db.query(Customer).all()
```

## Audit Logging

Every action should log user context:

```python
@router.post("/customers")
def create_customer(request: Request, payload: CustomerRequest, db: Session = Depends(get_db)):
    customer = Customer(**payload.dict(), tenant_id=request.state.tenant_id)
    db.add(customer)
    db.flush()
    
    # Log with user and tenant context
    log_audit(
        db=db,
        user_id=request.state.user_id,
        action="CREATE",
        resource="customers",
        resource_id=customer.id,
        tenant_id=request.state.tenant_id,  # Important for audit trails
        details={"name": payload.name}
    )
    
    db.commit()
    return customer
```

## Troubleshooting

### AttributeError: 'Request' object has no attribute 'state.user_id'
This means:
1. The request didn't pass through TenantMiddleware
2. The Authorization header is missing or invalid
3. JWT token couldn't be decoded

**Fix**: Ensure request includes valid Bearer token in Authorization header

### Status 403 when should be 200
This means:
1. `request.state.role` doesn't match required role
2. `request.state.tenant_id` filter prevented query results
3. Check @require_role decorator requirements

**Fix**: Verify that the authenticated user has the correct role

### 401 Unauthorized on protected endpoint
This means:
1. No Authorization header provided
2. Authorization header format invalid (must be "Bearer <token>")
3. Token is expired or invalid

**Fix**: Request must include valid Bearer token in Authorization header

## Security Checklist

When writing endpoints:
- [ ] All protected endpoints require Authentication
- [ ] All queries filter by request.state.tenant_id
- [ ] Audit logging includes user_id and tenant_id
- [ ] Role-based checks use @require_role or explicit checks
- [ ] Super admin endpoints explicitly check super_admin role
- [ ] No leaking of user data across tenants
- [ ] Error messages don't expose tenant/user info

## Related Files

- [core/middleware.py](../backend/app/core/middleware.py) - TenantMiddleware implementation
- [core/security.py](../backend/app/core/security.py) - Token creation/validation
- [api/dependencies.py](../backend/app/api/dependencies.py) - Endpoint dependencies
- [core/audit.py](../backend/app/core/audit.py) - Audit logging
"""
