# ============================================================
# tests/test_auth.py
#
# Auth Module Tests
# Run with: pytest tests/test_auth.py -v
#
# WHY write tests even for a portfolio project?
#   - Shows you understand professional development workflows
#   - Helps you catch bugs when changing code later
#   - Interviewers WILL ask: "How do you test your API?"
# ============================================================

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


# ── Test Client Setup ─────────────────────────────────────

@pytest_asyncio.fixture
async def client():
    """Async test client — spins up the FastAPI app in test mode."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


# ── Test Data ─────────────────────────────────────────────

VALID_USER = {
    "email": "testuser@smartcart.dev",
    "password": "SecurePass@123",
    "first_name": "Test",
    "last_name": "User",
    "phone": "9876543210",
}

WEAK_PASSWORD_USER = {
    "email": "weakpass@smartcart.dev",
    "password": "password",               # Fails strength check
    "first_name": "Weak",
    "last_name": "Pass",
}


# ============================================================
# REGISTER TESTS
# ============================================================

@pytest.mark.asyncio
async def test_register_success(client):
    """Happy path — valid registration."""
    response = await client.post("/api/v1/auth/register", json=VALID_USER)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "user_id" in data["data"]
    print(f"\n✅ Register Success: user_id={data['data']['user_id']}")


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    """Registering with the same email twice → 409 Conflict."""
    await client.post("/api/v1/auth/register", json=VALID_USER)
    response = await client.post("/api/v1/auth/register", json=VALID_USER)
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "AUTH_EMAIL_EXISTS"
    print(f"\n✅ Duplicate email returns 409")


@pytest.mark.asyncio
async def test_register_weak_password(client):
    """Weak password → 422 Unprocessable Entity."""
    response = await client.post("/api/v1/auth/register", json=WEAK_PASSWORD_USER)
    assert response.status_code == 422
    print(f"\n✅ Weak password returns 422")


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    """Invalid email format → 422."""
    payload = {**VALID_USER, "email": "not-an-email"}
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    print(f"\n✅ Invalid email returns 422")


# ============================================================
# LOGIN TESTS
# ============================================================

@pytest.mark.asyncio
async def test_login_success(client):
    """Happy path — valid login returns access token + sets cookie."""
    # Register first
    await client.post("/api/v1/auth/register", json=VALID_USER)

    response = await client.post("/api/v1/auth/login", json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"
    assert data["data"]["user"]["email"] == VALID_USER["email"]
    # Refresh token cookie should be set
    assert "refresh_token" in response.cookies
    print(f"\n✅ Login Success — access_token received, cookie set")


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Wrong password → 401 with generic message."""
    await client.post("/api/v1/auth/register", json=VALID_USER)

    response = await client.post("/api/v1/auth/login", json={
        "email": VALID_USER["email"],
        "password": "WrongPass@999",
    })
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "AUTH_INVALID_CREDENTIALS"
    print(f"\n✅ Wrong password returns 401")


@pytest.mark.asyncio
async def test_login_nonexistent_email(client):
    """Non-existent email → same 401 error (no email enumeration)."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "ghost@nowhere.com",
        "password": "SomePass@123",
    })
    assert response.status_code == 401
    data = response.json()
    # IMPORTANT: same error code as wrong password — security requirement
    assert data["error"]["code"] == "AUTH_INVALID_CREDENTIALS"
    print(f"\n✅ Non-existent email returns same 401 (no enumeration)")


# ============================================================
# TOKEN & PROTECTED ROUTE TESTS
# ============================================================

@pytest.mark.asyncio
async def test_get_me_authenticated(client):
    """GET /auth/me with valid token → returns user info."""
    await client.post("/api/v1/auth/register", json=VALID_USER)
    login_res = await client.post("/api/v1/auth/login", json={
        "email": VALID_USER["email"],
        "password": VALID_USER["password"],
    })
    access_token = login_res.json()["data"]["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["email"] == VALID_USER["email"]
    assert "CUSTOMER" in data["data"]["roles"]
    print(f"\n✅ GET /me returns user info for authenticated user")


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    """GET /auth/me without token → 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    print(f"\n✅ Protected route returns 401 without token")


@pytest.mark.asyncio
async def test_get_me_invalid_token(client):
    """GET /auth/me with garbage token → 401."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.garbage"}
    )
    assert response.status_code == 401
    print(f"\n✅ Invalid token returns 401")


# ============================================================
# HEALTH CHECK
# ============================================================

@pytest.mark.asyncio
async def test_health_check(client):
    """Health check returns app info."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "SmartCart"
    print(f"\n✅ Health check passing: {data}")