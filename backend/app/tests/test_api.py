"""Integration tests for API endpoints."""
import pytest
from httpx import AsyncClient
import hashlib


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Test basic health check endpoint."""
        response = await client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "Happy Little Learners"
        assert data["version"] == "0.1.0"

    @pytest.mark.asyncio
    async def test_health_check_db(self, client: AsyncClient):
        """Test database health check endpoint."""
        response = await client.get("/api/v1/health/db")
        
        # This will fail in test environment without proper DB
        # but should return a proper response structure
        assert response.status_code in (200, 503)
        data = response.json()
        assert "status" in data
        assert "database" in data


class TestAuthEndpoints:
    """Tests for authentication endpoints."""

    @pytest.mark.asyncio
    async def test_csrf_token_endpoint(self, client: AsyncClient):
        """Test CSRF token endpoint."""
        response = await client.get("/api/v1/auth/csrf-token")
        
        assert response.status_code == 200
        data = response.json()
        assert "csrf_token" in data
        assert len(data["csrf_token"]) > 0

    @pytest.mark.asyncio
    async def test_parent_registration_success(self, client: AsyncClient):
        """Test successful parent registration."""
        # Get CSRF token first
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        response = await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "testparent1@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Test Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Registration successful"
        assert "user_id" in data
        assert data["email_verification_required"] is False
        
        # Verify cookies are set
        assert "access_token" in client.cookies
        assert "refresh_token" in client.cookies
        assert "csrf_token" in client.cookies

    @pytest.mark.asyncio
    async def test_parent_registration_duplicate_email(self, client: AsyncClient):
        """Test duplicate email registration fails."""
        # Get CSRF token
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        # First registration
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "duplicate@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Test Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        # Second registration with same email
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        response = await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "duplicate@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Test Parent 2",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        assert response.status_code == 409
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "CONFLICT"

    @pytest.mark.asyncio
    async def test_parent_login_success(self, client: AsyncClient):
        """Test successful parent login."""
        # Create a parent first
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "loginparent@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Login Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        # Now login
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        response = await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "loginparent@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["user"]["role"] == "parent"
        assert data["user"]["email"] == "loginparent@example.com"

    @pytest.mark.asyncio
    async def test_parent_login_invalid_credentials(self, client: AsyncClient):
        """Test parent login with invalid credentials fails."""
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        response = await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "nonexistent@example.com",
                "password": "WrongPassword",
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "AUTHENTICATION_ERROR"

    @pytest.mark.asyncio
    async def test_student_login_success(self, client: AsyncClient):
        """Test successful student login with PIN."""
        # Create a parent and child with PIN via API
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        # Register parent
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "studentparent@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Student Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        # Login as parent
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "studentparent@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        # Create child with PIN
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        csrf_token3 = csrf_response3.json()["csrf_token"]
        
        child_response = await client.post(
            "/api/v1/parents/me/children",
            json={
                "display_name": "TestStudent",
                "date_of_birth": "2020-01-01",
                "gender": "male",
                "avatar_type": "elephant",
                "current_stage_id": 2,
                "preferred_language": "en",
                "pin": "1234",
            },
            headers={"X-CSRF-Token": csrf_token3},
        )
        
        assert child_response.status_code == 201
        child_id = child_response.json()["id"]
        child_username = f"teststudent_{child_id}"
        
        # Now test student login
        # Create new client for student login (to avoid cookie conflicts)
        from httpx import AsyncClient as NewAsyncClient
        from app.main import create_app
        from app.core.database import get_db
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        from sqlalchemy.pool import StaticPool
        from app.core.database import Base
        
        # Use the same test client but clear cookies
        client.cookies.clear()
        
        csrf_response4 = await client.get("/api/v1/auth/csrf-token")
        csrf_token4 = csrf_response4.json()["csrf_token"]
        
        response = await client.post(
            "/api/v1/auth/student/login",
            json={
                "username": child_username,
                "pin": "1234",
            },
            headers={"X-CSRF-Token": csrf_token4},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["role"] == "student"

    @pytest.mark.asyncio
    async def test_student_login_invalid_pin(self, client: AsyncClient):
        """Test student login with invalid PIN fails."""
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        response = await client.post(
            "/api/v1/auth/student/login",
            json={
                "username": "NonExistentStudent",
                "pin": "1234",
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "AUTHENTICATION_ERROR"

    @pytest.mark.asyncio
    async def test_create_child_without_pin_fails(self, client: AsyncClient):
        """Test that creating a child without PIN fails validation."""
        # Register and login as parent
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "nopinparent@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "No PIN Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "nopinparent@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        csrf_token3 = csrf_response3.json()["csrf_token"]
        
        # Try to create child without PIN - should fail
        child_response = await client.post(
            "/api/v1/parents/me/children",
            json={
                "display_name": "NoPinChild",
                "date_of_birth": "2021-01-01",
                "gender": "female",
                "avatar_type": "owl",
                "current_stage_id": 1,
                "preferred_language": "en",
            },
            headers={"X-CSRF-Token": csrf_token3},
        )
        
        assert child_response.status_code == 422
        data = child_response.json()
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Check that PIN field is in the validation error
        pin_error = any(d.get("field") == "pin" for d in data["error"]["details"])
        assert pin_error, "PIN field should be required"

    @pytest.mark.asyncio
    async def test_student_login_rate_limiting(self, client: AsyncClient):
        """Test student login rate limiting (5 attempts per 15 min)."""
        # Note: This test may be flaky in CI due to shared rate limiter
        # We just verify the rate limit response structure
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        # Make multiple failed attempts
        for i in range(6):
            response = await client.post(
                "/api/v1/auth/student/login",
                json={
                    "username": "RateLimitTest",
                    "pin": "wrong",
                },
                headers={"X-CSRF-Token": csrf_token},
            )
        
        # The 6th request should be rate limited
        assert response.status_code == 429
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Retry-After" in response.headers


class TestRootEndpoint:
    """Tests for root endpoint."""

    @pytest.mark.asyncio
    async def test_root(self, client: AsyncClient):
        """Test root endpoint returns app info."""
        response = await client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Happy Little Learners"
        assert data["version"] == "0.1.0"


class TestParentChildEndpoints:
    """Tests for parent-child management endpoints."""

    @pytest.mark.asyncio
    async def test_create_child_with_pin(self, client: AsyncClient):
        """Test creating a child with PIN."""
        # Register and login as parent
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "childparent@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Child Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "childparent@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        # Create child with PIN
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        csrf_token3 = csrf_response3.json()["csrf_token"]
        
        response = await client.post(
            "/api/v1/parents/me/children",
            json={
                "display_name": "ChildWithPin",
                "date_of_birth": "2020-01-01",
                "gender": "male",
                "avatar_type": "elephant",
                "current_stage_id": 2,
                "preferred_language": "en",
                "pin": "1234",
            },
            headers={"X-CSRF-Token": csrf_token3},
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["display_name"] == "ChildWithPin"
        assert data["avatar_type"] == "elephant"
        assert data["current_stage_code"] == "nursery"

    @pytest.mark.asyncio
    async def test_parent_cannot_access_other_parent_child(self, client: AsyncClient):
        """Test that a parent cannot access another parent's child."""
        # Create parent 1 and child
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "parent1@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Parent One",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "parent1@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        csrf_token3 = csrf_response3.json()["csrf_token"]
        
        child_response = await client.post(
            "/api/v1/parents/me/children",
            json={
                "display_name": "ChildOfParent1",
                "date_of_birth": "2020-01-01",
                "gender": "male",
                "avatar_type": "elephant",
                "current_stage_id": 2,
                "preferred_language": "en",
                "pin": "1234",
            },
            headers={"X-CSRF-Token": csrf_token3},
        )
        
        assert child_response.status_code == 201
        child_id = child_response.json()["id"]
        
        # Logout parent 1
        client.cookies.clear()
        
        # Create parent 2
        csrf_response4 = await client.get("/api/v1/auth/csrf-token")
        csrf_token4 = csrf_response4.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "parent2@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Parent Two",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token4},
        )
        
        csrf_response5 = await client.get("/api/v1/auth/csrf-token")
        csrf_token5 = csrf_response5.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "parent2@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token5},
        )
        
        # Try to access parent 1's child
        csrf_response6 = await client.get("/api/v1/auth/csrf-token")
        csrf_token6 = csrf_response6.json()["csrf_token"]
        
        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}",
            headers={"X-CSRF-Token": csrf_token6},
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_child_progress_includes_rewards_earned(self, client: AsyncClient):
        """Test that child progress includes rewards_earned field."""
        # Register and login as parent
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "progressparent@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "Progress Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "progressparent@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        # Create child
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        csrf_token3 = csrf_response3.json()["csrf_token"]
        
        child_response = await client.post(
            "/api/v1/parents/me/children",
            json={
                "display_name": "ProgressChild",
                "date_of_birth": "2020-01-01",
                "gender": "male",
                "avatar_type": "elephant",
                "current_stage_id": 2,
                "preferred_language": "en",
                "pin": "1234",
            },
            headers={"X-CSRF-Token": csrf_token3},
        )
        
        assert child_response.status_code == 201
        child_id = child_response.json()["id"]
        
        # Get child progress
        csrf_response4 = await client.get("/api/v1/auth/csrf-token")
        csrf_token4 = csrf_response4.json()["csrf_token"]
        
        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}/progress",
            headers={"X-CSRF-Token": csrf_token4},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "rewards_earned" in data
        assert isinstance(data["rewards_earned"], int)


class TestPINUpdate:
    """Tests for PIN update functionality."""

    @pytest.mark.asyncio
    async def test_update_child_pin(self, client: AsyncClient):
        """Test updating a child's PIN."""
        # Register and login as parent
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/register",
            json={
                "email": "pinparent@example.com",
                "password": "Test@123",
                "confirm_password": "Test@123",
                "full_name": "PIN Parent",
                "accept_terms": True,
                "accept_privacy": True,
            },
            headers={"X-CSRF-Token": csrf_token},
        )
        
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        
        await client.post(
            "/api/v1/auth/parent/login",
            json={
                "email": "pinparent@example.com",
                "password": "Test@123",
            },
            headers={"X-CSRF-Token": csrf_token2},
        )
        
        # Create child WITH initial PIN
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        csrf_token3 = csrf_response3.json()["csrf_token"]
        
        child_response = await client.post(
            "/api/v1/parents/me/children",
            json={
                "display_name": "PinChild",
                "date_of_birth": "2020-01-01",
                "gender": "male",
                "avatar_type": "elephant",
                "current_stage_id": 2,
                "preferred_language": "en",
                "pin": "1234",  # Initial PIN
            },
            headers={"X-CSRF-Token": csrf_token3},
        )
        
        assert child_response.status_code == 201
        child_id = child_response.json()["id"]
        
        # Update PIN to a new value
        csrf_response4 = await client.get("/api/v1/auth/csrf-token")
        csrf_token4 = csrf_response4.json()["csrf_token"]
        
        response = await client.patch(
            f"/api/v1/parents/me/children/{child_id}",
            json={"pin": "5678"},
            headers={"X-CSRF-Token": csrf_token4},
        )
        
        assert response.status_code == 200
        
        # Verify NEW PIN works for student login (use unique client ID to avoid rate limiting)
        child_username = f"pinchild_{child_id}"
        
        from httpx import AsyncClient
        student_client = AsyncClient(transport=client._transport, base_url="http://test")
        
        # Use different X-Client-ID for each login attempt
        csrf_response5 = await student_client.get("/api/v1/auth/csrf-token")
        csrf_token5 = csrf_response5.json()["csrf_token"]
        
        login_response = await student_client.post(
            "/api/v1/auth/student/login",
            json={"username": child_username, "pin": "5678"},
            headers={"X-CSRF-Token": csrf_token5, "X-Client-ID": "test-pin-update-new"},
        )
        
        assert login_response.status_code == 200
        data = login_response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "student"
        
        # Verify OLD PIN no longer works
        await student_client.aclose()
        student_client2 = AsyncClient(transport=client._transport, base_url="http://test")
        
        csrf_response6 = await student_client2.get("/api/v1/auth/csrf-token")
        csrf_token6 = csrf_response6.json()["csrf_token"]
        
        old_login = await student_client2.post(
            "/api/v1/auth/student/login",
            json={"username": child_username, "pin": "1234"},
            headers={"X-CSRF-Token": csrf_token6, "X-Client-ID": "test-pin-update-old"},
        )
        
        assert old_login.status_code == 401
        data = old_login.json()
        assert data["error"]["code"] == "AUTHENTICATION_ERROR"
        
        await student_client2.aclose()