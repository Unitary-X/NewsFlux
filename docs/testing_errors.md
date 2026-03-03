"""
Error Handling Test Guide for NewsFlux

This guide explains how to write comprehensive tests for error scenarios in the NewsFlux backend.

## Test Categories

### 1. Input Validation Errors
Test that Pydantic schemas properly validate input and return 422 Unprocessable Entity

```python
def test_login_validation_missing_username():
    response = client.post("/auth/login", json={"password": "test123"})
    assert response.status_code == 422
    assert "username" in response.json()["detail"]

def test_registration_validation_weak_password():
    response = client.post("/auth/register", json={
        "agency_name": "Test",
        "admin_username": "testuser",
        "admin_password": "weak"  # Too short
    })
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any("password" in err for err in errors)

def test_registration_validation_invalid_username():
    response = client.post("/auth/register", json={
        "agency_name": "Test",
        "admin_username": "test@user!",  # Invalid characters
        "admin_password": "ValidPass123"
    })
    assert response.status_code == 422
```

### 2. Authentication Errors
Test unauthorized access and token issues

```python
def test_protected_endpoint_no_token():
    response = client.get("/admin/dashboard")
    assert response.status_code == 401

def test_protected_endpoint_invalid_token():
    headers = {"Authorization": "Bearer invalid.token.here"}
    response = client.get("/admin/dashboard", headers=headers)
    assert response.status_code == 401

def test_protected_endpoint_expired_token():
    # Create token that's already expired
    token = create_access_token(user_id=uuid4(), role="admin", 
                                 expires_delta=timedelta(seconds=-1))
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/admin/dashboard", headers=headers)
    assert response.status_code == 401

def test_login_invalid_credentials():
    response = client.post("/auth/login", json={
        "username": "nonexistent",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]
```

### 3. Authorization Errors
Test role-based access control

```python
def test_admin_endpoint_requires_admin_role():
    worker_token = create_access_token(user_id=uuid4(), role="worker")
    headers = {"Authorization": f"Bearer {worker_token}"}
    response = client.post("/admin/newspapers", json={...}, headers=headers)
    assert response.status_code == 403

def test_super_admin_endpoint_requires_super_admin():
    admin_token = create_access_token(user_id=uuid4(), role="admin")
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/superadmin/agencies", headers=headers)
    assert response.status_code == 403
```

### 4. Resource Not Found
Test 404 errors when resources don't exist

```python
def test_get_nonexistent_customer():
    token = create_access_token(user_id=uuid4(), role="admin", 
                                 tenant_id=test_agency_id)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get(f"/admin/customers/{uuid4()}", headers=headers)
    assert response.status_code == 404

def test_update_nonexistent_newspaper():
    token = create_access_token(user_id=uuid4(), role="admin",
                                 tenant_id=test_agency_id)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.put(f"/admin/newspapers/{uuid4()}", 
                         json={"name": "New Name"}, headers=headers)
    assert response.status_code == 404
```

### 5. Business Logic Errors
Test domain-specific error conditions

```python
def test_register_duplicate_username():
    # Setup: user already exists
    existing_user = create_test_user("testuser", test_agency_id)
    
    response = client.post("/auth/register", json={
        "agency_name": "Another Agency",
        "admin_username": "testuser",  # Same as existing
        "admin_password": "ValidPass123"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_create_subscription_suspended_agency():
    # Setup: agency is suspended
    agency = db.query(Agency).get(test_agency_id)
    agency.status = "suspended"
    db.commit()
    
    token = create_access_token(user_id=uuid4(), role="admin",
                                 tenant_id=test_agency_id)
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post("/admin/subscriptions", json={...}, headers=headers)
    assert response.status_code == 403
    assert "suspended" in response.json()["detail"].lower()
```

### 6. Rate Limiting Errors
Test request rate limiting

```python
def test_login_rate_limiting():
    # Make 6 login attempts (limit is 5/minute)
    for i in range(6):
        response = client.post("/auth/login", json={
            "username": f"user{i}",
            "password": "test"
        })
    
    # 6th request should be rate limited
    assert response.status_code == 429
    assert "rate limit" in response.json()["detail"].lower()

def test_register_rate_limiting():
    # Register endpoint has 2/hour limit
    for i in range(3):
        response = client.post("/auth/register", json={
            "agency_name": f"Agency {i}",
            "admin_username": f"admin{i}",
            "admin_password": "ValidPass123"
        })
    
    assert response.status_code == 429
```

### 7. Database Errors
Test error handling for database issues

```python
def test_database_connection_error(monkeypatch):
    # Mock database connection to raise error
    def mock_get_db():
        raise OperationalError("Connection refused", None, None)
    
    monkeypatch.setattr("app.api.dependencies.get_db", mock_get_db)
    
    response = client.get("/admin/dashboard")
    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"].lower()

def test_validation_error_causes_rollback(db):
    # Test that failed operations don't partially commit
    before_count = db.query(Customer).count()
    
    # Trigger error during creation
    # e.g., duplicate unique key
    # The transaction should rollback
    
    after_count = db.query(Customer).count()
    assert before_count == after_count  # Nothing was added
```

### 8. Generic Error Responses
Test that error responses don't leak sensitive information

```python
def test_error_response_no_stack_trace():
    # Trigger an unexpected error
    response = client.post("/admin/something/that/will/error", json={})
    
    # Should return 500 with generic message
    assert response.status_code == 500
    detail = response.json()["detail"]
    
    # Should NOT contain stack trace, file paths, or implementation details
    assert "Traceback" not in detail
    assert "/app/" not in detail
    assert "File" not in detail

def test_auth_error_no_info_leak():
    response = client.post("/auth/login", json={
        "username": "someuser",
        "password": "wrong"
    })
    
    assert response.status_code == 401
    detail = response.json()["detail"]
    
    # Should not reveal if username exists or just wrong password
    assert detail == "Incorrect username or password"
```

## PyTest Fixtures

Create these fixtures in tests/conftest.py:

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from uuid import uuid4
from datetime import timedelta

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_user_id():
    return uuid4()

@pytest.fixture
def test_agency_id():
    return uuid4()

@pytest.fixture
def auth_token(test_user_id, test_agency_id):
    return create_access_token(
        subject=test_user_id,
        role="admin",
        tenant_id=test_agency_id
    )

@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

@pytest.fixture
def worker_token(test_user_id, test_agency_id):
    return create_access_token(
        subject=test_user_id,
        role="worker",
        tenant_id=test_agency_id
    )

@pytest.fixture
def worker_headers(worker_token):
    return {"Authorization": f"Bearer {worker_token}"}

@pytest.fixture
def super_admin_token():
    return create_access_token(
        subject=uuid4(),
        role="super_admin"
    )

@pytest.fixture
def super_admin_headers(super_admin_token):
    return {"Authorization": f"Bearer {super_admin_token}"}
```

## Running Tests

```bash
# All tests
pytest

# Specific test file
pytest tests/test_auth_errors.py

# Specific test
pytest tests/test_auth_errors.py::test_login_invalid_credentials

# With coverage
pytest --cov=app

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Run only failed tests from last run
pytest --lf
```

## Test Organization

```
tests/
├── conftest.py                    # Shared fixtures
├── test_auth_errors.py            # Authentication & validation
├── test_authorization_errors.py   # Role-based errors
├── test_business_logic_errors.py  # Domain errors
├── test_database_errors.py        # DB connection & constraints
├── test_rate_limiting.py          # Rate limit enforcement
└── test_error_responses.py        # Generic error handling
```

## Checklist for New Endpoints

When adding new endpoints, ensure tests cover:

- [ ] Valid request with happy path
- [ ] Missing required fields (400)
- [ ] Invalid field types (422)
- [ ] Authentication required (401 if applicable)
- [ ] Authorization checks (403 if role-required)
- [ ] Non-existent resource (404 if applicable)
- [ ] Duplicate data (409 if applicable)
- [ ] Rate limiting (429 if rate-limited)
- [ ] Database constraints (400/409)
- [ ] Error response doesn't leak info

## Example: Complete Test Suite for Endpoint

```python
# tests/test_auth.py
import pytest
from uuid import uuid4

class TestLogin:
    def test_login_success(self, client):
        # Setup: create user
        user = create_test_user("testuser", "password123")
        
        # Execute
        response = client.post("/auth/login", json={
            "username": "testuser",
            "password": "password123"
        })
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_missing_username(self, client):
        response = client.post("/auth/login", json={
            "password": "test"
        })
        assert response.status_code == 422
    
    def test_login_invalid_credentials(self, client):
        response = client.post("/auth/login", json={
            "username": "nonexistent",
            "password": "wrong"
        })
        assert response.status_code == 401
        assert "Incorrect" in response.json()["detail"]
    
    def test_login_rate_limiting(self, client):
        for _ in range(6):  # Limit is 5/minute
            client.post("/auth/login", json={
                "username": "test",
                "password": "test"
            })
        assert response.status_code == 429
```

## Continuous Integration

Add to .github/workflows/test.yml:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/
```
"""
