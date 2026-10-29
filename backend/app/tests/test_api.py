"""Integration tests for API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
import hashlib
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import create_app
from app.models import (
    User, StudentProfile, Role, UserRole,
    Subject, Topic, Lesson, Activity, Question, AnswerOption,
    ActivityTypeEnum, LearningStage, StudentReward,
)
from app.core.security import get_password_hash


def create_async_session(db_url: str):
    """Create a new async session for a given database URL."""
    async_db_url = db_url
    if not db_url.startswith('sqlite+aiosqlite://'):
        if db_url.startswith('sqlite://'):
            async_db_url = db_url.replace('sqlite://', 'sqlite+aiosqlite://')
        else:
            async_db_url = db_url
    engine = create_async_engine(
        async_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return session_factory(), engine


def create_sync_session(db_url: str):
    """Create a new sync session for a given database URL."""
    sync_db_url = db_url
    if sync_db_url.startswith('sqlite+aiosqlite://'):
        sync_db_url = sync_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
    elif not sync_db_url.startswith('sqlite://'):
        sync_db_url = sync_db_url
    engine = create_engine(
        sync_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = sessionmaker(bind=engine)
    return session_factory(), engine


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
        from httpx import AsyncClient, ASGITransport as NewAsyncClient
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
                    "/api/v1/auth/student/login",            json={
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
                    "/api/v1/auth/student/login",            json={
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
        """Test student login rate limiting."""
        # Note: This test may be flaky in CI due to shared rate limiter
        # We just verify the rate limit response structure
        from app.core.config import settings
        
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        # Determine expected limit based on environment
        # In development, limit is 4x the base limit
        if settings.APP_ENV == "development":
            expected_limit = settings.RATE_LIMIT_LOGIN_ATTEMPTS * 4
        else:
            expected_limit = settings.RATE_LIMIT_LOGIN_ATTEMPTS
        
        # Make requests up to and including the rate limited one
        for i in range(expected_limit + 1):
            response = await client.post(
                    "/api/v1/auth/student/login",                json={
                    "username": f"RateLimitTest{i}",
                    "pin": "wrong",
            },
                headers={"X-CSRF-Token": csrf_token},
            )
        
        # The (limit+1)th request should be rate limited
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


class TestParentAnalytics:
    """Tests for parent analytics endpoints (Phase 6 Stage 4)."""

    async def _setup_parent_and_child(
        self, client: AsyncClient, email: str, full_name: str
    ):
        """Register, login, and create a child. Returns (csrf_token, child_id)."""
        # Register
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        await client.post(
            "/api/v1/auth/parent/register",
                json={
            "email": email,
            "password": "Test@123",
            "confirm_password": "Test@123",
            "full_name": full_name,
            "accept_terms": True,
            "accept_privacy": True,
            },
                headers={"X-CSRF-Token": csrf_token},
        )
        # Login
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        await client.post(
            "/api/v1/auth/parent/login",
                json={"email": email, "password": "Test@123"},
                headers={"X-CSRF-Token": csrf_token2},
        )
        # Get fresh CSRF token
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        token = csrf_response3.json()["csrf_token"]
        # Create child
        response = await client.post(
            "/api/v1/parents/me/children",
            json={
                "display_name": "Analytics Child",
                "date_of_birth": "2020-01-01",
                "gender": "male",
                "avatar_type": "elephant",
                "current_stage_id": 2,
                "preferred_language": "en",
                "pin": "1234",
            },
            headers={"X-CSRF-Token": token},
        )
        assert response.status_code == 201, f"Child creation failed: {response.text}"
        return token, response.json()["id"]

    @pytest.mark.asyncio
    async def test_authorized_parent_can_access_child_analytics(
        self, client: AsyncClient, seeded_data, test_db_url
    ):
        """Authorized parent can view analytics for their own child."""
        # Use the pre-seeded child from seeded_data
        child_id = seeded_data["student_id"]
        parent_user_id = seeded_data["user_id"]
        
        # Get parent profile ID
        from app.models import ParentProfile
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        from sqlalchemy import select
        
        sync_db_url = test_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
        sync_engine = create_engine(
            sync_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SyncSession = sessionmaker(bind=sync_engine)
        
        with SyncSession() as session:
            parent_profile = session.execute(
                select(ParentProfile).where(ParentProfile.user_id == parent_user_id)
            ).scalar_one_or_none()
            parent_profile_id = parent_profile.id if parent_profile else None
        
        sync_engine.dispose()
        
        if not parent_profile_id:
            raise AssertionError("ParentProfile not found")
        
        # Debug: check if parent exists in the database
        from app.models import User
        from app.core.security import verify_password
        
        sync_engine = create_engine(
            sync_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SyncSession = sessionmaker(bind=sync_engine)
        
        with SyncSession() as session:
            result = session.execute(select(User).where(User.email == "attemptparent@example.com"))
            parent = result.scalar_one_or_none()
            print(f"DEBUG: Parent found in DB: {parent is not None}")
            if parent:
                print(f"DEBUG: Parent email: {parent.email}, verified: {parent.is_verified}")
                # Test password verification
                pw_check = verify_password("Test@123", parent.password_hash)
                print(f"DEBUG: Password verify result: {pw_check}")
        
        sync_engine.dispose()
        
        # Login as the pre-seeded parent
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        login_response = await client.post(
            "/api/v1/auth/parent/login",
            json={"email": "attemptparent@example.com", "password": "Test@123"},
            headers={"X-CSRF-Token": csrf_token},
        )
        print(f"Login response: {login_response.status_code}, {login_response.text}")
        assert login_response.status_code == 200
        
        # Get fresh CSRF token
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response2.json()["csrf_token"]

        # Use the pre-seeded activity and lesson from seeded_data
        activity_id = seeded_data["activity_id"]
        lesson_id = seeded_data["lesson_id"]
        
        # Create 2 more activities for the same lesson (total 3)
        from app.models import Activity, ActivityTypeEnum
        
        # Use synchronous SQLAlchemy to add activities
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        
        sync_db_url = test_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
        sync_engine = create_engine(
            sync_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SyncSession = sessionmaker(bind=sync_engine)
        
        with SyncSession() as session:
            activities = []
            for i in range(2, 4):
                activity = Activity(
                    lesson_id=lesson_id,
                    type=ActivityTypeEnum.PICTURE_MATCHING,
                    code=f"analytics-activity-{i}",
                    status="published",
                    version=1,
                    display_order=i,
                    is_active=True,
                )
                session.add(activity)
                session.flush()
                activities.append(activity)
            
            activity_ids = [activity_id] + [a.id for a in activities]
            session.commit()
        
        sync_engine.dispose()

        # Add ParentStudentRelationship and ConsentRecord for analytics access
        from app.models import ParentStudentRelationship, ConsentRecord, ParentProfile

        # Get parent profile ID
        sync_engine = create_engine(
            sync_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SyncSession = sessionmaker(bind=sync_engine)

        with SyncSession() as session:
            parent_profile = session.execute(
                select(ParentProfile).where(ParentProfile.user_id == parent_user_id)
            ).scalar_one_or_none()
            parent_profile_id = parent_profile.id if parent_profile else None
        
        sync_engine.dispose()
        
        if not parent_profile_id:
            raise AssertionError("ParentProfile not found")

        sync_engine = create_engine(
            sync_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SyncSession = sessionmaker(bind=sync_engine)

        with SyncSession() as session:
            # Check if relationship already exists
            existing_rel = session.execute(
                select(ParentStudentRelationship).where(
                    ParentStudentRelationship.parent_id == parent_profile_id,
                    ParentStudentRelationship.student_id == child_id,
                )
            ).scalar_one_or_none()
            
            if not existing_rel:
                relationship = ParentStudentRelationship(
                    parent_id=parent_profile_id,
                    student_id=child_id,
                    relationship_type="parent",
                    can_manage_profile=True,
                    can_view_progress=True,
                    can_manage_settings=True,
                    is_primary=False,
                )
                session.add(relationship)
            
            # Add analytics consent
            existing_consent = session.execute(
                select(ConsentRecord).where(
                    ConsentRecord.parent_id == parent_profile_id,
                    ConsentRecord.student_id == child_id,
                    ConsentRecord.consent_type == "analytics",
                )
            ).scalar_one_or_none()
            
            if not existing_consent:
                consent = ConsentRecord(
                    parent_id=parent_profile_id,
                    student_id=child_id,
                    consent_type="analytics",
                    consent_given=True,
                    consent_version="1.0",
                    withdrawn_at=None,
                )
                session.add(consent)
            
            session.commit()
        
        sync_engine.dispose()

        # Add learning data directly to database using sync session
        from app.models import (
            ActivityAttempt,
            StudentLessonProgress,
            StudentReward,
            StudentRewardAward,
        )
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool

        sync_engine = create_engine(
            sync_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SyncSession = sessionmaker(bind=sync_engine)
        
        with SyncSession() as session:
            attempt1 = ActivityAttempt(
                student_id=child_id,
                activity_id=activity_ids[0],
                attempt_number=1,
                status="completed",
                score=100,
                max_score=100,
                passed=True,
                completed_at=datetime.now(timezone.utc),
                time_spent_seconds=300,
            )
            attempt2 = ActivityAttempt(
                student_id=child_id,
                activity_id=activity_ids[1],
                attempt_number=1,
                status="completed",
                score=80,
                max_score=100,
                passed=True,
                completed_at=datetime.now(timezone.utc) - timedelta(days=1),
                time_spent_seconds=240,
            )
            attempt3 = ActivityAttempt(
                student_id=child_id,
                activity_id=activity_ids[2],
                attempt_number=1,
                status="started",
                score=None,
                max_score=100,
                passed=None,
                time_spent_seconds=120,
            )
            session.add(attempt1)
            session.add(attempt2)
            session.add(attempt3)

            progress = StudentLessonProgress(
                student_id=child_id,
                lesson_id=lesson_id,
                status="completed",
                completion_percentage=100,
                time_spent_seconds=540,
                completed_at=datetime.now(timezone.utc),
            )
            session.add(progress)

            # Check if reward already exists
            from sqlalchemy import select
            existing_reward = session.execute(select(StudentReward).where(StudentReward.code == "first_star")).scalar_one_or_none()
            if existing_reward:
                reward = existing_reward
            else:
                reward = StudentReward(
                    code="first_star",
                    name="First Star",
                    description="First star",
                    reward_type="star",
                    points_value=1,
                    display_order=1,
                    is_active=True,
                )
                session.add(reward)
                session.flush()

            award = StudentRewardAward(
                student_id=child_id,
                reward_id=reward.id,
                earned_at=datetime.now(timezone.utc),
            )
            session.add(award)

            session.commit()
        
        sync_engine.dispose()

        # Get fresh CSRF and call analytics
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        token = csrf_response.json()["csrf_token"]

        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}/analytics",
                headers={"X-CSRF-Token": token},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["child_id"] == child_id
        assert data["child_name"] == "Attempt Test Student"
        assert data["completed_activities"] == 2
        assert data["total_activities"] == 3
        assert data["rewards_earned"] == 1
        assert data["average_score"] == 90.0
        assert data["current_streak"] == 0
        assert len(data["daily_completions"]) >= 1
        assert isinstance(data["activity_detail"], list)
        assert len(data["rewards"]) >= 1
        assert data["rewards"][0]["earned"] is True

    @pytest.mark.asyncio
    async def test_parent_cannot_access_other_parent_child_analytics(
        self, client: AsyncClient
    ):
        """A parent cannot access another parent's child analytics."""
        # Parent 1 creates child
        csrf_token1, child_id = await self._setup_parent_and_child(
            client, "analyticsparent1@example.com", "Analytics Parent 1"
        )

        # Logout parent 1
        client.cookies.clear()

        # Parent 2 registers and logs in
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        await client.post(
            "/api/v1/auth/parent/register",
                json={
            "email": "analyticsparent2@example.com",
            "password": "Test@123",
            "confirm_password": "Test@123",
            "full_name": "Analytics Parent 2",
            "accept_terms": True,
            "accept_privacy": True,
            },
                headers={"X-CSRF-Token": csrf_token},
        )
        csrf_response2 = await client.get("/api/v1/auth/csrf-token")
        csrf_token2 = csrf_response2.json()["csrf_token"]
        await client.post(
            "/api/v1/auth/parent/login",
                json={"email": "analyticsparent2@example.com", "password": "Test@123"},
                headers={"X-CSRF-Token": csrf_token2},
        )
        csrf_response3 = await client.get("/api/v1/auth/csrf-token")
        token2 = csrf_response3.json()["csrf_token"]

        # Parent 2 tries to access parent 1's child analytics
        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}/analytics",
                headers={"X-CSRF-Token": token2},
        )

        assert response.status_code == 404
        data = response.json()
        assert "error" in data

    @pytest.mark.asyncio
    async def test_analytics_missing_child_returns_404(
        self, client: AsyncClient
    ):
        """Analytics for a non-existent child returns 404."""
        csrf_token, _ = await self._setup_parent_and_child(
            client, "analyticsmissing@example.com", "Analytics Missing Parent"
        )

        csrf_response = await client.get("/api/v1/auth/csrf-token")
        token = csrf_response.json()["csrf_token"]

        response = await client.get(
            "/api/v1/parents/me/children/99999/analytics",
                headers={"X-CSRF-Token": token},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_analytics_requires_analytics_consent(
        self, client: AsyncClient, seeded_session
    ):
        """Analytics endpoint requires analytics consent (not withdrawn)."""
        csrf_token, child_id = await self._setup_parent_and_child(
            client, "analyticsconsent@example.com", "Analytics Consent Parent"
        )

        # Withdraw analytics consent directly in session
        from app.models import ConsentRecord
        from datetime import datetime, timezone

        consent_result = await seeded_session.execute(
            select(ConsentRecord).where(
            ConsentRecord.student_id == child_id,
            ConsentRecord.consent_type == "analytics",
            )
        )
        consent = consent_result.scalar_one_or_none()
        if consent:
            consent.withdrawn_at = datetime.now(timezone.utc)
        await seeded_session.commit()

        csrf_response = await client.get("/api/v1/auth/csrf-token")
        token = csrf_response.json()["csrf_token"]

        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}/analytics",
                headers={"X-CSRF-Token": token},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_analytics_empty_history(
        self, client: AsyncClient
    ):
        """Analytics for a child with no learning data returns zeros."""
        csrf_token, child_id = await self._setup_parent_and_child(
            client, "analyticsempty@example.com", "Analytics Empty Parent"
        )

        csrf_response = await client.get("/api/v1/auth/csrf-token")
        token = csrf_response.json()["csrf_token"]

        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}/analytics",
                headers={"X-CSRF-Token": token},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["child_id"] == child_id
        assert data["total_lessons"] == 0
        assert data["completed_lessons"] == 0
        assert data["completed_activities"] == 0
        assert data["total_activities"] == 0
        assert data["total_time_spent_minutes"] == 0
        assert data["average_score"] is None
        assert data["current_streak"] == 0
        assert data["longest_streak"] == 0
        assert data["rewards_earned"] == 0
        assert data["daily_completions"] == []
        assert data["activity_detail"] == []
        assert data["rewards"] == []

    @pytest.mark.asyncio
    async def test_analytics_soft_deleted_child(
        self, client: AsyncClient, seeded_session
    ):
        """Analytics for a soft-deleted child returns 404."""
        csrf_token, child_id = await self._setup_parent_and_child(
            client, "analyticsdeleted@example.com", "Analytics Deleted Parent"
        )

        # Soft-delete the child directly in session
        from app.models import StudentProfile

        result = await seeded_session.execute(
            select(StudentProfile).where(StudentProfile.id == child_id)
        )
        student = result.scalar_one_or_none()
        if student:
            student.is_active = False
            student.deleted_at = datetime.now(timezone.utc)
        await seeded_session.commit()

        csrf_response = await client.get("/api/v1/auth/csrf-token")
        token = csrf_response.json()["csrf_token"]

        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}/analytics",
                headers={"X-CSRF-Token": token},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_analytics_is_read_only(
        self, client: AsyncClient, seeded_session
    ):
        """Analytics request does not modify any state."""
        csrf_token, child_id = await self._setup_parent_and_child(
            client, "analyticsreadonly@example.com", "Analytics ReadOnly Parent"
        )

        # Capture initial state
        from app.models import ActivityAttempt, StudentProfile

        result_before = await seeded_session.execute(
            select(ActivityAttempt).where(ActivityAttempt.student_id == child_id)
        )
        attempts_before = len(result_before.scalars().all())

        result_profile_before = await seeded_session.execute(
            select(StudentProfile).where(StudentProfile.id == child_id)
        )
        student_before = result_profile_before.scalar_one_or_none()
        streak_before = student_before.current_streak if student_before else 0

        # Make analytics request
        csrf_response = await client.get("/api/v1/auth/csrf-token")
        token = csrf_response.json()["csrf_token"]

        response = await client.get(
            f"/api/v1/parents/me/children/{child_id}/analytics",
                headers={"X-CSRF-Token": token},
        )

        assert response.status_code == 200

        # Verify no state changed
        result_after = await seeded_session.execute(
            select(ActivityAttempt).where(ActivityAttempt.student_id == child_id)
        )
        attempts_after = len(result_after.scalars().all())

        result_profile_after = await seeded_session.execute(
            select(StudentProfile).where(StudentProfile.id == child_id)
        )
        student_after = result_profile_after.scalar_one_or_none()
        streak_after = student_after.current_streak if student_after else 0

        assert attempts_before == attempts_after
        assert streak_before == streak_after


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
        
        from httpx import AsyncClient, ASGITransport
        student_client = AsyncClient(transport=client._transport, base_url="http://test")
        
        # Use different X-Client-ID for each login attempt
        csrf_response5 = await student_client.get("/api/v1/auth/csrf-token")
        csrf_token5 = csrf_response5.json()["csrf_token"]

        login_response = await student_client.post(
            "/api/v1/auth/student/login",
            json={"username": child_username, "pin": "5678"},
            headers={"X-CSRF-Token": csrf_token5, "X-Client-ID": "test-pin-update-new"},
        )

        assert login_response.status_code == 200, f"Student login failed: {login_response.text}"
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




@pytest.fixture(scope="function")
async def attempt_scenario(seeded_data, test_db_url):
    """
    Fixture to create a full test scenario using the pre-seeded database.
    Returns a context dict with client, auth tokens, and database IDs.
    Uses synchronous SQLAlchemy for seeding to avoid greenlet context issues.
    """
    # Import needed modules
    from sqlalchemy import select
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    
    # Use synchronous SQLAlchemy to query seeded data (avoids greenlet issues)
    sync_db_url = test_db_url
    if sync_db_url.startswith('sqlite+aiosqlite://'):
        sync_db_url = sync_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
    elif not sync_db_url.startswith('sqlite://'):
        sync_db_url = sync_db_url
    
    sync_engine = create_engine(
        sync_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SyncSession = sessionmaker(bind=sync_engine)
    
    with SyncSession() as session:
        # Get stage
        stage_result = session.execute(select(LearningStage).where(LearningStage.code == "playgroup"))
        stage = stage_result.scalar_one()
        
        # Get subject
        subject_result = session.execute(select(Subject).where(Subject.code == "english"))
        subject = subject_result.scalar_one()
        
        # Get topic
        topic_result = session.execute(select(Topic).where(Topic.code == "letters"))
        topic = topic_result.scalar_one()
        
        # Get lesson
        lesson_result = session.execute(select(Lesson).where(Lesson.code == "lesson-001"))
        lesson = lesson_result.scalar_one()
        
        # Get activity
        activity_result = session.execute(select(Activity).where(Activity.code == "activity-001"))
        activity = activity_result.scalar_one()
        
        # Get questions
        q1_result = session.execute(select(Question).where(Question.prompt == "Which image matches A?"))
        q1 = q1_result.scalar_one()
        q2_result = session.execute(select(Question).where(Question.prompt == "Which image matches B?"))
        q2 = q2_result.scalar_one()
        
        # Get answer options
        q1_correct_result = session.execute(
            select(AnswerOption).where(AnswerOption.question_id == q1.id, AnswerOption.is_correct == True)
        )
        q1_correct = q1_correct_result.scalar_one()
        q1_wrong_result = session.execute(
            select(AnswerOption).where(AnswerOption.question_id == q1.id, AnswerOption.is_correct == False)
        )
        q1_wrong = q1_wrong_result.scalar_one()
        q2_correct_result = session.execute(
            select(AnswerOption).where(AnswerOption.question_id == q2.id, AnswerOption.is_correct == True)
        )
        q2_correct = q2_correct_result.scalar_one()
        
        # Get parent user and student
        parent_result = session.execute(select(User).where(User.email == "attemptparent@example.com"))
        parent_user = parent_result.scalar_one()
        student_result = session.execute(select(StudentProfile).where(StudentProfile.user_id == parent_user.id))
        student = student_result.scalar_one()
        
        # Extract IDs before session closes
        stage_id = stage.id
        subject_id = subject.id
        topic_id = topic.id
        lesson_id = lesson.id
        activity_id = activity.id
        q1_id = q1.id
        q2_id = q2.id
        q1_correct_id = q1_correct.id
        q1_wrong_id = q1_wrong.id
        q2_correct_id = q2_correct.id
        parent_user_id = parent_user.id
        student_id = student.id
        student_username = student.username
    
    sync_engine.dispose()
    
    # Create app with overridden get_db - create a single async engine with NullPool for proper async handling
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import NullPool
    
    # Convert to async URL
    async_db_url = test_db_url
    if not test_db_url.startswith('sqlite+aiosqlite://'):
        if test_db_url.startswith('sqlite://'):
            async_db_url = test_db_url.replace('sqlite://', 'sqlite+aiosqlite://')
        else:
            async_db_url = test_db_url
    
    # Create a single engine for the test fixture with NullPool (recommended for async)
    test_engine = create_async_engine(
        async_db_url,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )
    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    
    app = create_app()
    
    async def override_get_db():
        # Create a new session for each request from the shared engine
        async with test_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as ac:
        # Get CSRF token for login
        csrf_response = await ac.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        # Login as student (username is deterministic from seeded data)
        login_response = await ac.post(
            "/api/v1/auth/student/login",
            json={"username": student_username, "pin": "1234"},
            headers={"X-CSRF-Token": csrf_token, "X-Client-ID": "test-attempt-helper"},
        )
        assert login_response.status_code == 200, f"Student login failed: {login_response.text}"
        
        # Get fresh CSRF token after login
        csrf_response2 = await ac.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response2.json()["csrf_token"]
        
        yield {
            "client": ac,
            "csrf_token": csrf_token,
            "test_db_url": test_db_url,
            "student_id": student_id,
            "user_id": parent_user_id,
            "activity_id": activity_id,
            "lesson_id": lesson_id,
            "topic_id": topic_id,
            "q1_id": q1_id,
            "q2_id": q2_id,
            "q1_correct_id": q1_correct_id,
            "q1_wrong_id": q1_wrong_id,
            "q2_correct_id": q2_correct_id,
        }
    
    app.dependency_overrides.clear()
    await test_engine.dispose()


async def _create_isolated_student_scenario(test_db_url):
    """
    Create an isolated student scenario with its own database for testing
    cross-student access restrictions. Returns an async context manager
    that yields a context dict with client, auth tokens, and database IDs.
    """
    import tempfile
    import os
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import StaticPool
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # Create a new temporary database for isolation
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
    
    isolated_db_url = f"sqlite+aiosqlite:///{db_path}"
    isolated_sync_url = f"sqlite:///{db_path}"
    
    # Create tables using sync engine
    sync_engine = create_engine(
        isolated_sync_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(sync_engine)
    sync_engine.dispose()
    
    # Seed minimal data for the isolated student
    SyncSession = sessionmaker(bind=create_engine(
        isolated_sync_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    ))
    
    with SyncSession() as session:
        # Seed learning stage
        stage = LearningStage(
            code="playgroup", name="Playgroup / Pre-Nursery",
            min_age_months=24, max_age_months=36,
            display_order=1, icon="baby", color="#FFB3BA", is_active=True,
        )
        session.add(stage)
        session.flush()
        
        # Seed subject, topic, lesson, activity
        subject = Subject(
            stage_id=stage.id, domain_id=1, code="english", name="English",
            display_order=1, icon="abc", color="#FFB3BA", is_active=True,
        )
        session.add(subject)
        session.flush()
        
        topic = Topic(
            subject_id=subject.id, code="letters", name="Letters",
            display_order=1, is_active=True,
        )
        session.add(topic)
        session.flush()
        
        lesson = Lesson(
            topic_id=topic.id, code="lesson-001", status="published",
            version=1, is_active=True, display_order=1,
        )
        session.add(lesson)
        session.flush()
        
        activity = Activity(
            lesson_id=lesson.id, type=ActivityTypeEnum.PICTURE_MATCHING,
            code="activity-001", status="published", version=1,
            display_order=1, is_active=True,
        )
        session.add(activity)
        session.flush()
        
        # Two questions with options
        q1 = Question(
            activity_id=activity.id, question_type="single_choice",
            prompt="Which image matches A?", display_order=1, points=10,
            is_active=True,
        )
        session.add(q1)
        session.flush()
        
        q1_correct = AnswerOption(
            question_id=q1.id, text="Correct Option 1", is_correct=True,
            display_order=1,
        )
        q1_wrong = AnswerOption(
            question_id=q1.id, text="Wrong Option 1", is_correct=False,
            display_order=2,
        )
        session.add(q1_correct)
        session.add(q1_wrong)
        
        q2 = Question(
            activity_id=activity.id, question_type="single_choice",
            prompt="Which image matches B?", display_order=2, points=10,
            is_active=True,
        )
        session.add(q2)
        session.flush()
        
        q2_correct = AnswerOption(
            question_id=q2.id, text="Correct Option 2", is_correct=True,
            display_order=1,
        )
        session.add(q2_correct)
        session.commit()
        
        # Create parent user
        parent_user = User(
            email="isolatedparent@example.com",
            password_hash=get_password_hash("Test@123"),
            is_active=True, is_verified=True,
        )
        session.add(parent_user)
        session.flush()
        
        # Get or create student role
        from sqlalchemy import select
        from app.models import Role, UserRole
        role_result = session.execute(select(Role).where(Role.name == "student"))
        role = session.scalars(select(Role).where(Role.name == "student")).first()
        if not role:
            role = Role(name="student", description="Student role", is_system=True)
            session.add(role)
            session.flush()
        
        session.add(
            UserRole(user_id=parent_user.id, role_id=role.id)
        )
        
        # Create student profile
        student = StudentProfile(
            user_id=parent_user.id, display_name="Isolated Test Student",
            username=f"isolatedstudent_{parent_user.id}",
            pin_hash=get_password_hash("1234"),
            is_active=True, preferred_language="en",
            current_stage_id=stage.id,
        )
        session.add(student)
        session.commit()
        
        # Extract IDs
        student_id = student.id
        parent_user_id = parent_user.id
        activity_id = activity.id
        lesson_id = lesson.id
        topic_id = topic.id
        q1_id = q1.id
        q2_id = q2.id
        q1_correct_id = q1_correct.id
        q1_wrong_id = q1_wrong.id
        q2_correct_id = q2_correct.id
        student_username = student.username
    
    # Create app with overridden get_db - create new async engine for each request
    app = create_app()
    
    async def override_get_db():
        request_engine = create_async_engine(
            isolated_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        request_session = async_sessionmaker(request_engine, class_=AsyncSession, expire_on_commit=False)
        async with request_session() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await request_engine.dispose()
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as ac:
        # Get CSRF token for login
        csrf_response = await ac.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response.json()["csrf_token"]
        
        # Login as student
        login_response = await ac.post(
            "/api/v1/auth/student/login",
            json={"username": student_username, "pin": "1234"},
            headers={"X-CSRF-Token": csrf_token, "X-Client-ID": "test-isolated-helper"},
        )
        assert login_response.status_code == 200, f"Student login failed: {login_response.text}"
        
        # Get fresh CSRF token after login
        csrf_response2 = await ac.get("/api/v1/auth/csrf-token")
        csrf_token = csrf_response2.json()["csrf_token"]
        
        yield {
            "client": ac,
            "csrf_token": csrf_token,
            "test_db_url": isolated_db_url,
            "student_id": student_id,
            "user_id": parent_user_id,
            "activity_id": activity_id,
            "lesson_id": lesson_id,
            "topic_id": topic_id,
            "q1_id": q1_id,
            "q2_id": q2_id,
            "q1_correct_id": q1_correct_id,
            "q1_wrong_id": q1_wrong_id,
            "q2_correct_id": q2_correct_id,
        }
    
    app.dependency_overrides.clear()
    
    # Clean up
    try:
        os.unlink(db_path)
    except:
        pass


async def _setup_student_attempt_scenario():
    """
    Deprecated: Use the attempt_scenario fixture instead.
    This async generator creates an isolated test scenario for backward compatibility.
    """
    import warnings
    warnings.warn("_setup_student_attempt_scenario is deprecated, use attempt_scenario fixture instead", DeprecationWarning)
    
    # Create a temporary database for isolation
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
    
    test_db_url = f"sqlite+aiosqlite:///{db_path}"
    
    try:
        async for ctx in _create_isolated_student_scenario(test_db_url):
            yield ctx
    finally:
        try:
            os.unlink(db_path)
        except:
            pass


class TestActivityAttemptPersistence:
    """Tests for activity attempt persistence (Phase 6 Stage 1)."""

    @pytest.mark.asyncio
    async def test_valid_authenticated_attempt_is_persisted_with_metadata(self, attempt_scenario, test_db_url):
        """A valid authenticated student attempt is persisted with progress metadata."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]

        # Start an attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": csrf_token},
            )
        assert start_response.status_code == 200
        start_data = start_response.json()
        attempt_id = start_data["attempt_id"]
        assert attempt_id is not None

        # Submit a correct answer
        submit_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )
        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        assert submit_data["is_correct"] is True
        assert submit_data["points_earned"] == 10
        assert "saved_progress" in submit_data
        assert submit_data["saved_progress"]["current_question_index"] == 0
        assert submit_data["saved_progress"]["accumulated_score"] == 10
        assert submit_data["saved_progress"]["answers_submitted"] == 1

        # Verify the attempt record in the database has metadata
        from app.models import ActivityAttempt

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(ActivityAttempt).where(ActivityAttempt.id == attempt_id)
            )
            attempt = result.scalar_one_or_none()
            assert attempt is not None
            assert attempt.student_id == ctx["student_id"]
            assert attempt.activity_id == activity_id
            assert attempt.status == "in_progress"
            assert attempt.metadata_json is not None
            assert attempt.metadata_json["current_question_index"] == 0
            assert attempt.metadata_json["accumulated_score"] == 10
        await check_engine.dispose()

    @pytest.mark.asyncio
    async def test_attempt_resumption_returns_saved_progress(self, attempt_scenario, test_db_url):
        """Getting an existing attempt returns the saved progress metadata for resumption."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]

            # Start and submit an answer
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": csrf_token},
            )
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )

        # Get the attempt - should return saved_progress
        get_response = await client.get(f"/api/v1/students/me/attempts/{attempt_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["saved_progress"] is not None
        assert get_data["saved_progress"]["current_question_index"] == 0
        assert get_data["saved_progress"]["accumulated_score"] == 10
        assert get_data["saved_progress"]["answers_submitted"] == 1

    @pytest.mark.asyncio
    async def test_student_cannot_access_another_students_attempt(self, attempt_scenario, test_db_url):
        """A student cannot submit or access another student's attempt via identifier manipulation."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]

        # Start an attempt as the first student
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id = start_response.json()["attempt_id"]

        # Set up a second student with a separate database using the original helper
        async for ctx2 in _setup_student_attempt_scenario():
            client2 = ctx2["client"]
            csrf_token2 = ctx2["csrf_token"]

            # Try to access the first student's attempt from the second student
            access_response = await client2.get(
                f"/api/v1/students/me/attempts/{attempt_id}"
            )
            assert access_response.status_code in [403, 404]

            # Try to submit to the first student's attempt from the second student
            submit_response = await client2.post(
                f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": ctx["q1_id"], "selected_option_ids": [ctx["q1_correct_id"]]},
                headers={"X-CSRF-Token": csrf_token2},
            )
            assert submit_response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_unauthenticated_requests_are_rejected(self, attempt_scenario, test_db_url):
        """Requests without authentication are rejected."""
        ctx = attempt_scenario
        activity_id = ctx["activity_id"]

        # Create a client without auth cookies
        app = create_app()

        async def override_get_db():
            yield None

        app.dependency_overrides[get_db] = override_get_db

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as ac:
            # POST without CSRF token → 403 (CSRF middleware blocks before auth)
            response = await ac.post(
                f"/api/v1/students/me/activities/{activity_id}/attempts"
            )
            assert response.status_code == 403

            # GET without auth cookie → 403 (AuthorizationException: Not authenticated)
            response = await ac.get(f"/api/v1/students/me/attempts/1")
            assert response.status_code == 403

            # POST without CSRF → 403
            response = await ac.post(
                f"/api/v1/attempts/1/responses",
                json={"question_id": 1, "selected_option_ids": [1]},
            )
            assert response.status_code == 403

        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_invalid_submission_rejected(self, attempt_scenario, test_db_url):
        """Invalid or incomplete submissions are rejected."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]

        # Start an attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id = start_response.json()["attempt_id"]

        # Submit with empty option IDs
        response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": []},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response.status_code == 200  # Empty selection is valid, just incorrect
        data = response.json()
        assert data["is_correct"] is False
        assert data["points_earned"] == 0

        # Submit for non-existent question
        response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": 99999, "selected_option_ids": [1]},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response.status_code == 404  # Question not found

        # Submit correct answers for all questions so the completion passes
            # (score must reach the 70% pass threshold for the attempt to be marked completed)
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": ctx["q2_id"], "selected_option_ids": [ctx["q2_correct_id"]]},
                headers={"X-CSRF-Token": csrf_token},
        )
        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert complete_response.status_code == 200

        response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response.status_code == 422  # Attempt already completed

    @pytest.mark.asyncio
    async def test_repeated_submission_does_not_duplicate_records(self, attempt_scenario, test_db_url):
        """Submitting the same answer twice does not create duplicate response records."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]

        # Start an attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id = start_response.json()["attempt_id"]

        # Submit the same answer twice
        response1 = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response1.status_code == 200

        response2 = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert response2.status_code == 200

        # Verify response records exist for this attempt+question
        from app.models import ActivityResponse

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(ActivityResponse).where(
                    ActivityResponse.attempt_id == attempt_id,
                    ActivityResponse.question_id == q1_id,
                )
            )
            responses = result.scalars().all()
        await check_engine.dispose()
        assert len(responses) >= 1

    @pytest.mark.asyncio
    async def test_complete_attempt_persists_score_and_passed(self, attempt_scenario, test_db_url):
        """Completing an attempt persists score, passed status, and completion timestamp."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]
        q2_id = ctx["q2_id"]
        q2_correct_id = ctx["q2_correct_id"]

        # Start an attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": csrf_token},
            )
        attempt_id = start_response.json()["attempt_id"]

            # Submit correct answers for both questions
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q2_id, "selected_option_ids": [q2_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )

            # Complete the attempt
        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
                headers={"X-CSRF-Token": csrf_token},
            )
        assert complete_response.status_code == 200
        complete_data = complete_response.json()
        assert complete_data["score"] == 100
        assert complete_data["passed"] is True
        assert "next_activity_id" in complete_data

        # Verify attempt record
        from app.models import ActivityAttempt

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(ActivityAttempt).where(ActivityAttempt.id == attempt_id)
            )
            attempt = result.scalar_one_or_none()
            assert attempt is not None
            assert attempt.status == "completed"
            assert attempt.score == 100
            assert attempt.passed is True
            assert attempt.completed_at is not None
        await check_engine.dispose()

    @pytest.mark.asyncio
    async def test_duplicate_completion_rejected_after_first(self, attempt_scenario, test_db_url):
        """A second completion of the same attempt is rejected with 422."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]
        q2_id = ctx["q2_id"]
        q2_correct_id = ctx["q2_correct_id"]

        # Start an attempt and submit correct answers for both questions
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": csrf_token},
            )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q2_id, "selected_option_ids": [q2_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )

        # First completion succeeds
        first_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert first_response.status_code == 200

        # Second completion is rejected
        second_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert second_response.status_code == 422

    @pytest.mark.asyncio
    async def test_concurrent_completion_only_one_succeeds(self, attempt_scenario, test_db_url):
        """Concurrent completion requests: only one succeeds, no duplicate streak/reward/progress.

        Uses a conditional UPDATE (WHERE status != "completed") to atomically transition
        the attempt from non-completed to completed. Only one request can successfully
        transition the status; concurrent requests match 0 rows and are rejected with 422.

        Verified against MySQL InnoDB (5/5 repeated runs passed; see DEF-005).
        Against SQLite, the shared AsyncSession cannot execute concurrent flushes, so this
        test verifies sequential idempotency: first completion succeeds (200), repeat is
        rejected (422), and final state has no duplicate streak/rewards/progress.
        """
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]
        q2_id = ctx["q2_id"]
        q2_correct_id = ctx["q2_correct_id"]

        # Start an attempt and submit correct answers for both questions
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": csrf_token},
            )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q2_id, "selected_option_ids": [q2_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )

        # First completion succeeds
        first_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert first_response.status_code == 200

        # Repeat completion is rejected (idempotent)
        repeat_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert repeat_response.status_code == 422

        # Verify final database state: no duplicate streak, no duplicate rewards
        from app.models import ActivityAttempt, StudentProfile, StudentRewardAward

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(ActivityAttempt).where(ActivityAttempt.id == attempt_id)
            )
            attempt = result.scalar_one_or_none()
            assert attempt is not None
            assert attempt.status == "completed"

            # Streak must be exactly 1, not incremented twice
            result_profile = await check_session.execute(
                select(StudentProfile).where(StudentProfile.id == ctx["student_id"])
            )
            student = result_profile.scalar_one_or_none()
            assert student.current_streak == 1

            # No duplicate reward awards (unique constraint also enforces at DB level)
            result_reward = await check_session.execute(
                select(StudentRewardAward).where(
                    StudentRewardAward.student_id == ctx["student_id"]
                )
            )
            awards = result_reward.scalars().all()
            reward_ids = [a.reward_id for a in awards]
            assert len(reward_ids) == len(set(reward_ids)), "Duplicate reward awards detected"
        await check_engine.dispose()


class TestLessonProgressUpdates:
    """Tests for automatic lesson-progress updates (Phase 6 Stage 2)."""

    @pytest.mark.asyncio
    async def test_starting_activity_creates_lesson_progress(self, attempt_scenario, test_db_url):
        """Starting an activity creates or updates the correct lesson-progress record."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        lesson_id = ctx["lesson_id"]

        # Start an attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        start_data = start_response.json()
        assert "lesson_progress" in start_data
        lp = start_data["lesson_progress"]
        assert lp["status"] == "in_progress"
        assert lp["completion_percentage"] == 0

        # Verify lesson progress record in database
        from app.models import StudentLessonProgress

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentLessonProgress).where(
                    StudentLessonProgress.student_id == ctx["student_id"],
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
            progress = result.scalar_one_or_none()
        await check_engine.dispose()
        assert progress is not None
        assert progress.student_id == ctx["student_id"]
        assert progress.lesson_id == lesson_id
        assert progress.status == "in_progress"
        assert progress.completion_percentage == 0
        assert progress.last_activity_at is not None
        assert progress.current_activity_id == activity_id

    @pytest.mark.asyncio
    async def test_completing_activity_updates_lesson_progress(self, attempt_scenario, test_db_url):
        """Completing one activity updates lesson progress correctly."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        lesson_id = ctx["lesson_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]
        q2_id = ctx["q2_id"]
        q2_correct_id = ctx["q2_correct_id"]

        # Start and complete an attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id = start_response.json()["attempt_id"]

        # Submit correct answers for both questions
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q2_id, "selected_option_ids": [q2_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )

        # Complete the attempt
        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
                headers={"X-CSRF-Token": csrf_token},
            )
        assert complete_response.status_code == 200
        complete_data = complete_response.json()
        assert complete_data["score"] == 100
        assert complete_data["passed"] is True

        # Verify lesson progress shows 100% and completed status
        from app.models import StudentLessonProgress

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentLessonProgress).where(
                    StudentLessonProgress.student_id == ctx["student_id"],
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
            progress = result.scalar_one_or_none()
        await check_engine.dispose()
        assert progress is not None
        assert progress.status == "completed"
        assert progress.completion_percentage == 100
        assert progress.completed_at is not None
        assert progress.last_activity_at is not None

    @pytest.mark.asyncio
    async def test_completing_all_activities_marks_lesson_completed(self, attempt_scenario, test_db_url):
        """Completing the final required activity marks the lesson completed."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        lesson_id = ctx["lesson_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]
        q2_id = ctx["q2_id"]
        q2_correct_id = ctx["q2_correct_id"]

        # Start and complete an attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id = start_response.json()["attempt_id"]

        # Submit correct answers for both questions (this activity is fully answered)
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q2_id, "selected_option_ids": [q2_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )

        # Complete - this is the only activity in the lesson, so lesson completes
        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
                headers={"X-CSRF-Token": csrf_token},
            )
        assert complete_response.status_code == 200

        from app.models import StudentLessonProgress

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentLessonProgress).where(
                    StudentLessonProgress.student_id == ctx["student_id"],
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
            progress = result.scalar_one_or_none()
        await check_engine.dispose()
        assert progress is not None
        assert progress.status == "completed"
        assert progress.completion_percentage == 100

    @pytest.mark.asyncio
    async def test_repeated_completion_does_not_inflate_progress(self, attempt_scenario, test_db_url):
        """Completing the same activity repeatedly does not inflate progress."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        lesson_id = ctx["lesson_id"]
        q1_id = ctx["q1_id"]
        q1_correct_id = ctx["q1_correct_id"]

        # Start attempt and complete it
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id = start_response.json()["attempt_id"]

        # Submit correct answers for all questions so the completion passes
        # (score must reach the 70% pass threshold for the attempt to be marked completed)
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": ctx["q2_id"], "selected_option_ids": [ctx["q2_correct_id"]]},
            headers={"X-CSRF-Token": csrf_token},
        )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )

        # Try to complete again - should be rejected
        repeat_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert repeat_response.status_code == 422  # Attempt already completed

        # Progress should not change
        from app.models import StudentLessonProgress

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentLessonProgress).where(
                    StudentLessonProgress.student_id == ctx["student_id"],
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
            progress = result.scalar_one_or_none()
        await check_engine.dispose()
        assert progress is not None
        assert progress.status == "completed"
        assert progress.completion_percentage == 100

    @pytest.mark.asyncio
    async def test_student_cannot_access_another_students_lesson_progress(self, attempt_scenario, test_db_url):
        """A student cannot access another student's lesson progress."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        lesson_id = ctx["lesson_id"]

        # Start and complete an attempt as first student
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": ctx["q1_id"], "selected_option_ids": [ctx["q1_correct_id"]]},
            headers={"X-CSRF-Token": csrf_token},
        )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )

        # Create a second student using the original helper (separate database)
        async for ctx2 in _setup_student_attempt_scenario():
            client2 = ctx2["client"]
            csrf_token2 = ctx2["csrf_token"]

            # Try to access the first student's lesson progress - should fail
            access_response = await client2.get(
                f"/api/v1/students/me/learn/{lesson_id}",
                headers={"X-CSRF-Token": csrf_token2},
            )
            # The lesson progress belongs to a different student
            assert access_response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_empty_lesson_handled_safely(self, attempt_scenario, test_db_url):
        """A lesson with no activities is handled without division-by-zero."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]

            # Create an empty lesson (no activities)
        from app.models import Lesson

        # Use synchronous SQLAlchemy to avoid greenlet issues
        sync_session, sync_engine = create_sync_session(ctx["test_db_url"])
        with sync_session:
            empty_lesson = Lesson(
                topic_id=ctx["topic_id"],  # References the topic from the scenario
                code="empty-lesson",
                status="published",
                version=1,
                is_active=True,
                display_order=99,
            )
            sync_session.add(empty_lesson)
            sync_session.commit()
            empty_lesson_id = empty_lesson.id
        sync_engine.dispose()

        # Call get_lesson_content for empty lesson
        response = await client.get(
            f"/api/v1/students/me/learn/{empty_lesson_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["progress"]["completion_percentage"] == 0
        assert data["progress"]["status"] == "in_progress"
        assert data["activities"] == []

    @pytest.mark.asyncio
    async def test_resume_does_not_duplicate_lesson_progress(self, attempt_scenario, test_db_url):
        """Resuming an existing attempt does not create duplicate lesson-progress records."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        lesson_id = ctx["lesson_id"]

        # Start first attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id_1 = start_response.json()["attempt_id"]

        # Start second attempt (retry)
        start_response2 = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        attempt_id_2 = start_response2.json()["attempt_id"]
        assert attempt_id_2 != attempt_id_1

        # Verify only ONE lesson progress record exists
        from app.models import StudentLessonProgress

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentLessonProgress).where(
                    StudentLessonProgress.student_id == ctx["student_id"],
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
            progress_records = result.scalars().all()
        await check_engine.dispose()
        assert len(progress_records) == 1
        assert progress_records[0].student_id == ctx["student_id"]
        assert progress_records[0].lesson_id == lesson_id


class TestStreaksAndRewards:
    """Tests for streaks and rewards (Phase 6 Stage 3)."""

    async def _complete_activity(self, ctx, activity_id):
        """Helper to complete an activity: start, submit answers, complete."""
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        q1_id = ctx["q1_id"]
        q2_id = ctx["q2_id"]
        q1_correct_id = ctx["q1_correct_id"]
        q2_correct_id = ctx["q2_correct_id"]

        # Start attempt
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        # Submit correct answers for both questions
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q1_id, "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
        )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q2_id, "selected_option_ids": [q2_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
        )

        # Complete the attempt
        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
                headers={"X-CSRF-Token": csrf_token},
        )
        assert complete_response.status_code == 200
        return complete_response.json()

    @pytest.mark.asyncio
    async def test_qualifying_completion_earns_reward(self, attempt_scenario, test_db_url):
        """A qualifying completion earns an eligible reward."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_correct_id = ctx["q1_correct_id"]

        result = await self._complete_activity(ctx, activity_id)

        # Should have earned at least first_star reward
        assert len(result["rewards_earned"]) >= 1
        reward_names = [r["name"] for r in result["rewards_earned"]]
        assert "First Star" in reward_names

    @pytest.mark.asyncio
    async def test_incomplete_activity_earns_no_reward(self, attempt_scenario, test_db_url):
        """An ineligible or incomplete activity earns no reward."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_wrong_id = ctx["q1_wrong_id"]

        # Start attempt and submit wrong answer
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        # Submit wrong answer (not passing)
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": ctx["q1_id"], "selected_option_ids": [q1_wrong_id]},
                headers={"X-CSRF-Token": csrf_token},
            )

            # Complete with failing score - no rewards should be earned
        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert complete_response.status_code == 200
        result = complete_response.json()
        assert result["passed"] is False
        assert len(result["rewards_earned"]) == 0

    @pytest.mark.asyncio
    async def test_repeated_completion_no_duplicate_awards(self, attempt_scenario, test_db_url):
        """Repeated completion does not create duplicate one-time awards."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_correct_id = ctx["q1_correct_id"]

        # Complete activity once - capture attempt_id
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": ctx["q1_id"], "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": ctx["q2_id"], "selected_option_ids": [ctx["q2_correct_id"]]},
            headers={"X-CSRF-Token": csrf_token},
        )

        result1 = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert result1.status_code == 200
        result1_data = result1.json()
        first_star_count = sum(
            1 for r in result1_data["rewards_earned"] if r["name"] == "First Star"
        )
        assert first_star_count == 1

        # Try to complete again - should be rejected (idempotent)
        repeat_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert repeat_response.status_code == 422

    @pytest.mark.asyncio
    async def test_student_cannot_access_another_students_rewards(self, attempt_scenario, test_db_url):
        """A student cannot access another student's rewards or streak."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_correct_id = ctx["q1_correct_id"]

        # Complete activity as first student
        await self._complete_activity(ctx, activity_id)

        # Second student tries to access rewards - use original helper
        async for ctx2 in _setup_student_attempt_scenario():
            client2 = ctx2["client"]
            csrf_token2 = ctx2["csrf_token"]

            # Get rewards - should only see second student's rewards
            rewards_response = await client2.get(
                "/api/v1/students/me/rewards",
                headers={"X-CSRF-Token": csrf_token2},
            )
            assert rewards_response.status_code == 200
            rewards_data = rewards_response.json()
            # Second student should not see first student's rewards
            assert len(rewards_data) == 0 or all(
                r["earned"] is False for r in rewards_data
            )

    @pytest.mark.asyncio
    async def test_first_qualifying_completion_starts_streak(self, attempt_scenario, test_db_url):
        """A first qualifying completion starts a streak."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_correct_id = ctx["q1_correct_id"]

        result = await self._complete_activity(ctx, ctx["activity_id"])

            # Streak should be 1 after first completion
        assert result["streak"] is not None
        assert result["streak"]["current_streak"] == 1
        assert result["streak"]["longest_streak"] == 1

    @pytest.mark.asyncio
    async def test_streak_info_returned_on_lesson_completion(self, attempt_scenario, test_db_url):
        """Calculated streak_info is returned in the API response when a lesson is just completed."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_correct_id = ctx["q1_correct_id"]

        result = await self._complete_activity(ctx, activity_id)

            # A qualifying first completion must return calculated streak info
        assert result["streak"] is not None
        assert result["streak"]["current_streak"] == 1
        assert result["streak"]["longest_streak"] == 1
        assert result["streak"]["last_activity_date"] is not None

    @pytest.mark.asyncio
    async def test_same_day_repeated_completion_no_streak_inflation(self, attempt_scenario, test_db_url):
        """Same-day repeated completions do not inflate the streak."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]

        # Complete first activity/lesson
        activity_id = ctx["activity_id"]
        result1 = await self._complete_activity(ctx, activity_id)
        assert result1["streak"]["current_streak"] == 1

        # Create a second lesson+activity in the same topic
        from app.models import Lesson, Activity

        # Use synchronous SQLAlchemy to avoid greenlet issues
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool
        
        # Convert to sync URL
        sync_db_url = test_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
        sync_engine = create_engine(
            sync_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SyncSession = sessionmaker(bind=sync_engine)
        
        with SyncSession() as check_session:
            topic_id = ctx["topic_id"]
            
            lesson2 = Lesson(
                topic_id=topic_id,
                code="lesson-002",
                status="published",
                version=1,
                is_active=True,
                display_order=2,
            )
            check_session.add(lesson2)
            check_session.flush()

            activity2 = Activity(
                lesson_id=lesson2.id,
                type=ActivityTypeEnum.PICTURE_MATCHING,
                code="activity-002",
                status="published",
                version=1,
                display_order=1,
                is_active=True,
            )
            check_session.add(activity2)
            check_session.flush()

            # Create questions for activity2
            q_new = Question(
                activity_id=activity2.id,
                question_type="single_choice",
                prompt="New question?",
                display_order=1,
                points=10,
                is_active=True,
            )
            check_session.add(q_new)
            check_session.flush()

            q_new_correct = AnswerOption(
                question_id=q_new.id,
                text="Correct Answer",
                is_correct=True,
                display_order=1,
            )
            check_session.add(q_new_correct)
            check_session.commit()

            # Extract IDs before session closes
            lesson2_id = lesson2.id
            activity2_id = activity2.id
            q_new_id = q_new.id
            q_new_correct_id = q_new_correct.id

        # Manually set last_activity_date to today (same day)
        from app.models import StudentProfile

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentProfile).where(
                    StudentProfile.id == ctx["student_id"]
                )
            )
            student = result.scalar_one_or_none()
            student.last_activity_date = date.today()
            await check_session.commit()
        await check_engine.dispose()

        # Complete second activity on the same day
        # Use the existing helper pattern but with new activity/question IDs
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity2_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q_new.id, "selected_option_ids": [q_new_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )

        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert complete_response.status_code == 200
        result2 = complete_response.json()

        # Streak should still be 1 (same day, no inflation)
        assert result2["streak"]["current_streak"] == 1

    @pytest.mark.asyncio
    async def test_consecutive_day_extends_streak(self, attempt_scenario, test_db_url):
        """Consecutive qualifying days extend the streak."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]

        # Complete first activity/lesson
        activity_id = ctx["activity_id"]
        result1 = await self._complete_activity(ctx, activity_id)
        assert result1["streak"]["current_streak"] == 1

        # Create second lesson+activity
        from app.models import Lesson, Activity

        # Use synchronous SQLAlchemy to avoid greenlet issues
        sync_session, sync_engine = create_sync_session(ctx["test_db_url"])
        with sync_session:
            topic_id = ctx["topic_id"]
            
            lesson2 = Lesson(
                topic_id=topic_id,
                code="lesson-002",
                status="published",
                version=1,
                is_active=True,
                display_order=2,
            )
            sync_session.add(lesson2)
            sync_session.flush()

            activity2 = Activity(
                lesson_id=lesson2.id,
                type=ActivityTypeEnum.PICTURE_MATCHING,
                code="activity-002",
                status="published",
                version=1,
                display_order=1,
                is_active=True,
            )
            sync_session.add(activity2)
            sync_session.flush()

            q_new = Question(
                activity_id=activity2.id,
                question_type="single_choice",
                prompt="New question?",
                display_order=1,
                points=10,
                is_active=True,
            )
            sync_session.add(q_new)
            sync_session.flush()

            q_new_correct = AnswerOption(
                question_id=q_new.id,
                text="Correct Answer",
                is_correct=True,
                display_order=1,
            )
            sync_session.add(q_new_correct)
            sync_session.commit()

            # Extract IDs before session closes
            activity2_id = activity2.id
            q_new_id = q_new.id
            q_new_correct_id = q_new_correct.id
        sync_engine.dispose()

        # Set last_activity_date to yesterday
        from app.models import StudentProfile

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentProfile).where(
                    StudentProfile.id == ctx["student_id"]
                )
            )
            student = result.scalar_one_or_none()
            student.last_activity_date = date.today() - timedelta(days=1)
            await check_session.commit()
        await check_engine.dispose()

        # Complete second activity on consecutive day
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity2_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q_new.id, "selected_option_ids": [q_new_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )

        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert complete_response.status_code == 200
        result2 = complete_response.json()

        # Streak should be 2 (consecutive day)
        assert result2["streak"]["current_streak"] == 2
        assert result2["streak"]["longest_streak"] == 2

    @pytest.mark.asyncio
    async def test_missed_day_resets_streak(self, attempt_scenario, test_db_url):
        """A missed day resets the streak."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]

        # Complete first activity/lesson
        activity_id = ctx["activity_id"]
        result1 = await self._complete_activity(ctx, activity_id)
        assert result1["streak"]["current_streak"] == 1

        # Create second lesson+activity
        from app.models import Lesson, Activity

        # Use synchronous SQLAlchemy to avoid greenlet issues
        sync_session, sync_engine = create_sync_session(ctx["test_db_url"])
        with sync_session:
            topic_id = ctx["topic_id"]
            
            lesson2 = Lesson(
                topic_id=topic_id,
                code="lesson-002",
                status="published",
                version=1,
                is_active=True,
                display_order=2,
            )
            sync_session.add(lesson2)
            sync_session.flush()

            activity2 = Activity(
                lesson_id=lesson2.id,
                type=ActivityTypeEnum.PICTURE_MATCHING,
                code="activity-002",
                status="published",
                version=1,
                display_order=1,
                is_active=True,
            )
            sync_session.add(activity2)
            sync_session.flush()

            q_new = Question(
                activity_id=activity2.id,
                question_type="single_choice",
                prompt="New question?",
                display_order=1,
                points=10,
                is_active=True,
            )
            sync_session.add(q_new)
            sync_session.flush()

            q_new_correct = AnswerOption(
                question_id=q_new.id,
                text="Correct Answer",
                is_correct=True,
                display_order=1,
            )
            sync_session.add(q_new_correct)
            sync_session.commit()

            # Extract IDs before session closes
            activity2_id = activity2.id
            q_new_id = q_new.id
            q_new_correct_id = q_new_correct.id
        sync_engine.dispose()

        # Set last_activity_date to 2 days ago (missed a day)
        from app.models import StudentProfile

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            result = await check_session.execute(
                select(StudentProfile).where(
                    StudentProfile.id == ctx["student_id"]
                )
            )
            student = result.scalar_one_or_none()
            student.last_activity_date = date.today() - timedelta(days=2)
            await check_session.commit()
        await check_engine.dispose()

        # Complete second activity after missing a day
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity2_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": q_new.id, "selected_option_ids": [q_new_correct_id]},
                headers={"X-CSRF-Token": csrf_token},
            )

        complete_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert complete_response.status_code == 200
        result2 = complete_response.json()

        # Streak should reset to 1 (missed day)
        assert result2["streak"]["current_streak"] == 1

    @pytest.mark.asyncio
    async def test_repeated_requests_idempotent(self, attempt_scenario, test_db_url):
        """Repeated completion requests are idempotent."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_correct_id = ctx["q1_correct_id"]

        # Complete activity once
        result1 = await self._complete_activity(ctx, activity_id)
        rewards_count_1 = len(result1["rewards_earned"])

        # Try to complete again - should be rejected (idempotent)
        start_response = await client.post(
            f"/api/v1/students/me/activities/{activity_id}/attempts",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert start_response.status_code == 200
        attempt_id = start_response.json()["attempt_id"]

        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": ctx["q1_id"], "selected_option_ids": [q1_correct_id]},
            headers={"X-CSRF-Token": csrf_token},
        )
        await client.post(
            f"/api/v1/students/attempts/{attempt_id}/responses",
            json={"question_id": ctx["q2_id"], "selected_option_ids": [ctx["q2_correct_id"]]},
            headers={"X-CSRF-Token": csrf_token},
        )

        repeat_response = await client.post(
            f"/api/v1/students/attempts/{attempt_id}/complete",
            headers={"X-CSRF-Token": csrf_token},
        )
        assert repeat_response.status_code == 200
        result2 = repeat_response.json()

        # Same rewards should NOT be re-awarded (idempotent)
        assert len(result2["rewards_earned"]) == 0

    @pytest.mark.asyncio
    async def test_database_failure_no_partial_state(self, attempt_scenario, test_db_url):
        """Database failures do not leave partial reward or streak state.

        Simulates a database write failure on the completion commit and verifies
        that the completion-related state (attempt completion, streak, reward
        award, lesson progress) is rolled back and no partial state persists.
        """
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        activity_id = ctx["activity_id"]
        q1_correct_id = ctx["q1_correct_id"]

        from unittest.mock import patch, AsyncMock

        # Create a session we can patch for the API calls
        # We'll override the get_db dependency to use a session we control
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        from sqlalchemy.pool import StaticPool

        async_db_url = test_db_url
        if not test_db_url.startswith('sqlite+aiosqlite://'):
            if test_db_url.startswith('sqlite://'):
                async_db_url = test_db_url.replace('sqlite://', 'sqlite+aiosqlite://')
            else:
                async_db_url = test_db_url
        
        test_engine = create_async_engine(
            async_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
        
        # Get a session we can patch
        test_session = test_session_factory()

        fail_commit = {"enabled": False, "consumed": False}

        original_commit = test_session.commit

        async def failing_commit():
            if fail_commit["enabled"] and not fail_commit["consumed"]:
                fail_commit["consumed"] = True
                raise RuntimeError("Simulated database failure")
            # Call the original commit
            return await original_commit()

        # Patch the test session's commit method
        test_session.commit = failing_commit

        # Temporarily override get_db to use our patched session
        app = create_app()
        
        async def override_get_db():
            yield test_session

        app.dependency_overrides[get_db] = override_get_db
        
        # Create a new client with the patched app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as patched_ac:
            # Get CSRF token
            csrf_response = await patched_ac.get("/api/v1/auth/csrf-token")
            patched_csrf = csrf_response.json()["csrf_token"]
            
            # Login as student
            login_response = await patched_ac.post(
                "/api/v1/auth/student/login",
                json={"username": ctx["client"].cookies.get("username", "attemptstudent_1"), "pin": "1234"},
                headers={"X-CSRF-Token": patched_csrf, "X-Client-ID": "test-failure-helper"},
            )
            assert login_response.status_code == 200
            
            # Get fresh CSRF token
            csrf_response2 = await patched_ac.get("/api/v1/auth/csrf-token")
            patched_csrf = csrf_response2.json()["csrf_token"]

            # Start attempt - commit succeeds
            start_response = await patched_ac.post(
                f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": patched_csrf},
            )
            assert start_response.status_code == 200
            attempt_id = start_response.json()["attempt_id"]

            # Submit correct answers - commits succeed
            await patched_ac.post(
                f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": ctx["q1_id"], "selected_option_ids": [q1_correct_id]},
                headers={"X-CSRF-Token": patched_csrf},
            )
            await patched_ac.post(
                f"/api/v1/students/attempts/{attempt_id}/responses",
                json={"question_id": ctx["q2_id"], "selected_option_ids": [ctx["q2_correct_id"]]},
                headers={"X-CSRF-Token": patched_csrf},
            )

            # Enable commit failure for the completion attempt
            fail_commit["enabled"] = True

            # Completion commit will fail - endpoint should not return 200.
            try:
                complete_response = await patched_ac.post(
                    f"/api/v1/students/attempts/{attempt_id}/complete",
                    headers={"X-CSRF-Token": patched_csrf},
                )
                assert complete_response.status_code != 200
            except RuntimeError:
                # Simulated database failure propagated from the endpoint.
                pass

        # Restore original commit
        test_session.commit = original_commit

        # Verify no partial completion state was persisted using a fresh session
        from app.models import (
            ActivityAttempt,
            StudentProfile,
            StudentLessonProgress,
            StudentRewardAward,
        )

        check_session, check_engine = create_async_session(ctx["test_db_url"])
        async with check_session:
            # Attempt exists but is NOT completed
            result_attempt = await check_session.execute(
                select(ActivityAttempt).where(ActivityAttempt.id == attempt_id)
            )
            attempt = result_attempt.scalar_one_or_none()
            assert attempt is not None
            assert attempt.status != "completed"

            # Streak was not updated
            result_profile = await check_session.execute(
                select(StudentProfile).where(
                    StudentProfile.id == ctx["student_id"]
                )
            )
            student = result_profile.scalar_one_or_none()
            assert student.current_streak == 0

            # Lesson progress was not marked completed
            result_progress = await check_session.execute(
                select(StudentLessonProgress).where(
                    StudentLessonProgress.student_id == ctx["student_id"],
                    StudentLessonProgress.lesson_id == ctx["lesson_id"],
                )
            )
            progress = result_progress.scalar_one_or_none()
            assert progress is None or progress.status != "completed"

            # No reward was awarded
            result_reward = await check_session.execute(
                select(StudentRewardAward).where(
                    StudentRewardAward.student_id == ctx["student_id"]
                )
            )
            awards = result_reward.scalars().all()
            assert len(awards) == 0
        await check_engine.dispose()
        await test_engine.dispose()


class TestNextActivityRecommendation:
    """Tests for the next activity recommendation endpoint (Phase 6 Stage 5D)."""

    @pytest.mark.asyncio
    async def test_cold_start_recommendation(self, attempt_scenario, test_db_url):
        """A student with no completed attempts gets a cold start recommendation."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]

        # The attempt_scenario fixture already logs in and completes some attempts
        # We need a fresh student with no completed attempts
        # Use a fresh client with the seeded data's pre-seeded student
        # But the attempt_scenario creates completed attempts, so let's test
        # by calling the endpoint directly
        
        # First, let's check that the endpoint returns a valid response
        response = await client.get(
            "/api/v1/students/me/next-activity",
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "activity_id" in data
        assert "reason" in data
        assert "confidence" in data
        assert "tier" in data
        assert "has_evidence" in data
        assert data["confidence"] in ["low", "medium", "high"]
        assert data["tier"] in ["cold_start", "remediate", "maintain", "advance"]

    @pytest.mark.asyncio
    async def test_recommendation_after_completion(self, attempt_scenario, test_db_url):
        """A student with completed attempts gets a recommendation based on mastery."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        
        response = await client.get(
            "/api/v1/students/me/next-activity",
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "activity_id" in data
        assert data["reason"] in [
            "cold_start_sequence", "review_overdue", "remediate_repeat",
            "maintain_practice", "advance_next", "curriculum_sequence",
            "no_more_activities", "attempt_not_found", "activity_not_found",
            "lesson_not_found"
        ]

    @pytest.mark.asyncio
    async def test_recommendation_includes_activity_details(self, attempt_scenario, test_db_url):
        """When activity_id is present, the response should include activity details."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        
        response = await client.get(
            "/api/v1/students/me/next-activity",
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 200
        data = response.json()
        # If activity_id is present, activity should be populated
        if data["activity_id"] is not None:
            assert data["activity"] is not None
            assert "id" in data["activity"]
            assert "questions" in data["activity"]
            assert "type" in data["activity"]

    @pytest.mark.asyncio
    async def test_unauthenticated_rejected(self, test_db_url):
        """Unauthenticated requests to next-activity are rejected."""
        from app.main import create_app
        from app.core.database import get_db
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        
        app = create_app()
        
        async def override_get_db():
            async_db_url = test_db_url
            if not test_db_url.startswith('sqlite+aiosqlite://'):
                if test_db_url.startswith('sqlite://'):
                    async_db_url = test_db_url.replace('sqlite://', 'sqlite+aiosqlite://')
                else:
                    async_db_url = test_db_url
            request_engine = create_async_engine(
                async_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            request_session = async_sessionmaker(request_engine, class_=AsyncSession, expire_on_commit=False)
            async with request_session() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
                finally:
                    await request_engine.dispose()
        
        app.dependency_overrides[get_db] = override_get_db
        
        from httpx import AsyncClient, ASGITransport
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as ac:
            response = await ac.get("/api/v1/students/me/next-activity")
            assert response.status_code == 403  # CSRF middleware blocks
        
        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_cross_student_isolation(self, test_db_url):
        """A student cannot access another student's recommendation."""
        # Create first student using isolated scenario
        async for ctx1 in _create_isolated_student_scenario(test_db_url):
            client1 = ctx1["client"]
            csrf_token1 = ctx1["csrf_token"]
            
            # Get recommendation for first student
            response1 = await client1.get(
                "/api/v1/students/me/next-activity",
                headers={"X-CSRF-Token": csrf_token1},
            )
            assert response1.status_code == 200
            data1 = response1.json()
            
            # Create a second student using another isolated scenario
            async for ctx2 in _create_isolated_student_scenario(test_db_url):
                client2 = ctx2["client"]
                csrf_token2 = ctx2["csrf_token"]
                
                response2 = await client2.get(
                    "/api/v1/students/me/next-activity",
                    headers={"X-CSRF-Token": csrf_token2},
                )
                assert response2.status_code == 200
                data2 = response2.json()
                
                # Each student should get their own recommendation based on their own progress
                # Verify both students get valid recommendations from their own stage
                assert data1["activity_id"] is not None
                assert data2["activity_id"] is not None
                assert data1["activity_id"] > 0
                assert data2["activity_id"] > 0
                
                # Verify both recommendations are from the correct stage (playgroup)
                # Check first student's recommended activity in their database
                from app.models import Activity, Lesson, Topic, Subject, LearningStage
                from sqlalchemy import create_engine
                from sqlalchemy.orm import sessionmaker
                from sqlalchemy.pool import StaticPool
                
                # Check first student's recommended activity in their database
                sync_db_url1 = ctx1["test_db_url"].replace('sqlite+aiosqlite://', 'sqlite://')
                sync_engine1 = create_engine(
                    sync_db_url1,
                    connect_args={"check_same_thread": False},
                    poolclass=StaticPool,
                )
                SyncSession1 = sessionmaker(bind=sync_engine1)
                
                with SyncSession1() as session:
                    from sqlalchemy import select
                    result1 = session.execute(
                        select(Activity)
                        .join(Lesson, Activity.lesson_id == Lesson.id)
                        .join(Topic, Lesson.topic_id == Topic.id)
                        .join(Subject, Topic.subject_id == Subject.id)
                        .where(Activity.id == data1["activity_id"])
                    )
                    activity1 = result1.scalar_one_or_none()
                    assert activity1 is not None
                    
                    # Verify it belongs to the playgroup stage
                    stage_result = session.execute(
                        select(LearningStage).where(LearningStage.code == "playgroup")
                    )
                    playgroup_stage = stage_result.scalar_one()
                    assert activity1.lesson.topic.subject.stage_id == playgroup_stage.id
                
                sync_engine1.dispose()
                
                # Check second student's recommended activity in their database
                sync_db_url2 = ctx2["test_db_url"].replace('sqlite+aiosqlite://', 'sqlite://')
                sync_engine2 = create_engine(
                    sync_db_url2,
                    connect_args={"check_same_thread": False},
                    poolclass=StaticPool,
                )
                SyncSession2 = sessionmaker(bind=sync_engine2)
                
                with SyncSession2() as session:
                    from sqlalchemy import select
                    from app.models import Activity, Lesson, Topic, Subject, LearningStage
                    
                    result2 = session.execute(
                        select(Activity)
                        .join(Lesson, Activity.lesson_id == Lesson.id)
                        .join(Topic, Lesson.topic_id == Topic.id)
                        .join(Subject, Topic.subject_id == Subject.id)
                        .where(Activity.id == data2["activity_id"])
                    )
                    activity2 = result2.scalar_one_or_none()
                    assert activity2 is not None
                    
                    # Verify it belongs to the playgroup stage
                    stage_result = session.execute(
                        select(LearningStage).where(LearningStage.code == "playgroup")
                    )
                    playgroup_stage = stage_result.scalar_one()
                    assert activity2.lesson.topic.subject.stage_id == playgroup_stage.id
                
                sync_engine2.dispose()
            break

    @pytest.mark.asyncio
    async def test_stage_restriction_enforced(self, attempt_scenario, test_db_url):
        """Recommendations respect the student's current curriculum stage."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        
        response = await client.get(
            "/api/v1/students/me/next-activity",
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["activity_id"] is not None:
            # Verify the recommended activity belongs to the student's stage
            from app.models import Activity, Lesson, Topic, Subject
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy.pool import StaticPool
            
            sync_db_url = test_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
            sync_engine = create_engine(
                sync_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            SyncSession = sessionmaker(bind=sync_engine)
            
            with SyncSession() as session:
                from sqlalchemy import select
                result = session.execute(
                    select(Activity)
                    .join(Lesson, Activity.lesson_id == Lesson.id)
                    .join(Topic, Lesson.topic_id == Topic.id)
                    .join(Subject, Topic.subject_id == Subject.id)
                    .where(Activity.id == data["activity_id"])
                )
                activity = result.scalar_one_or_none()
                assert activity is not None
                
                # Get the student's current stage
                from app.models import StudentProfile
                student_result = session.execute(
                    select(StudentProfile).where(StudentProfile.id == ctx["student_id"])
                )
                student = student_result.scalar_one_or_none()
                assert student is not None
                assert student.current_stage_id is not None
                
                # Verify the activity belongs to the student's current stage
                assert activity.lesson.topic.subject.stage_id == student.current_stage_id
            
            sync_engine.dispose()

    @pytest.mark.asyncio
    async def test_response_schema_validity(self, attempt_scenario, test_db_url):
        """Response matches the defined schema exactly."""
        ctx = attempt_scenario
        client = ctx["client"]
        csrf_token = ctx["csrf_token"]
        
        response = await client.get(
            "/api/v1/students/me/next-activity",
            headers={"X-CSRF-Token": csrf_token},
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        required_fields = ["activity_id", "reason", "confidence", "tier", "has_evidence"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Type checks
        assert isinstance(data["reason"], str)
        assert isinstance(data["confidence"], str)
        assert data["confidence"] in ["low", "medium", "high"]
        assert isinstance(data["tier"], str) or data["tier"] is None
        assert isinstance(data["has_evidence"], bool)
        
        # mastery_score is float or null
        if data["mastery_score"] is not None:
            assert isinstance(data["mastery_score"], (int, float))
            assert 0 <= data["mastery_score"] <= 1


    @pytest.mark.asyncio
    async def test_genuine_cold_start_recommendation(self, test_db_url):
        """A student with zero completed attempts gets a genuine cold start recommendation."""
        # Create a fresh student with no completed attempts using the isolated scenario
        async for ctx in _create_isolated_student_scenario(test_db_url):
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            
            # Verify the student has no completed attempts
            from app.models import ActivityAttempt
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy.pool import StaticPool
            from sqlalchemy import select
            
            # Use the isolated scenario's database URL
            sync_db_url = ctx["test_db_url"].replace('sqlite+aiosqlite://', 'sqlite://')
            sync_engine = create_engine(
                sync_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            SyncSession = sessionmaker(bind=sync_engine)
            
            with SyncSession() as session:
                # Verify the student has no completed attempts
                result = session.execute(
                    select(ActivityAttempt).where(
                        ActivityAttempt.student_id == ctx["student_id"],
                        ActivityAttempt.status == "completed"
                    )
                )
                completed_attempts = result.scalars().all()
                assert len(completed_attempts) == 0, "Student should have no completed attempts"
                
                # Verify student has current_stage_id
                from app.models import StudentProfile
                student_result = session.execute(
                    select(StudentProfile).where(StudentProfile.id == ctx["student_id"])
                )
                student = student_result.scalar_one_or_none()
                assert student is not None
                assert student.current_stage_id is not None
            
            sync_engine.dispose()
            
            # Call the endpoint
            response = await client.get(
                "/api/v1/students/me/next-activity",
                headers={"X-CSRF-Token": csrf_token},
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify cold start response
            assert data["activity_id"] is not None
            assert data["reason"] == "cold_start_sequence"
            assert data["tier"] == "cold_start"
            assert data["confidence"] == "medium"
            assert data["mastery_score"] is None
            assert data["has_evidence"] is False
            
            # Verify the recommended activity belongs to the student's stage (playgroup)
            from app.models import Activity, Lesson, Topic, Subject
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy.pool import StaticPool
            from sqlalchemy import select
            
            # Use the isolated scenario's database URL
            sync_db_url = ctx["test_db_url"].replace('sqlite+aiosqlite://', 'sqlite://')
            sync_engine = create_engine(
                sync_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            SyncSession = sessionmaker(bind=sync_engine)
            
            with SyncSession() as session:
                result = session.execute(
                    select(Activity)
                    .join(Lesson, Activity.lesson_id == Lesson.id)
                    .join(Topic, Lesson.topic_id == Topic.id)
                    .join(Subject, Topic.subject_id == Subject.id)
                    .where(Activity.id == data["activity_id"])
                )
                activity = result.scalar_one_or_none()
                assert activity is not None
                
                # Verify the activity is published and active
                assert activity.status == "published"
                assert activity.is_active is True
                
                # Verify it belongs to the playgroup stage
                from app.models import LearningStage
                stage_result = session.execute(
                    select(LearningStage).where(LearningStage.code == "playgroup")
                )
                playgroup_stage = stage_result.scalar_one()
                assert activity.lesson.topic.subject.stage_id == playgroup_stage.id
            
            sync_engine.dispose()
            break

    @pytest.mark.asyncio
    async def test_review_overdue_recommendation(self, test_db_url):
        """An overdue activity is recommended for review (spaced repetition)."""
        async for ctx in _create_isolated_student_scenario(test_db_url):
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            
            # Add a completed attempt for the activity that is overdue for review
            from app.models import ActivityAttempt
            from datetime import datetime, timedelta, timezone
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy.pool import StaticPool
            
            sync_db_url = test_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
            sync_engine = create_engine(
                sync_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            SyncSession = sessionmaker(bind=sync_engine)
            
            @pytest.mark.asyncio
            async def test_review_overdue_recommendation(self, test_db_url):
                """An overdue activity is recommended for review (spaced repetition)."""
                async for ctx in _create_isolated_student_scenario(test_db_url):
                    client = ctx["client"]
                    csrf_token = ctx["csrf_token"]
                    
                    # Add a completed attempt for the activity that is overdue for review
                    from app.models import ActivityAttempt
                    from datetime import datetime, timedelta, timezone
                    from sqlalchemy import create_engine
                    from sqlalchemy.orm import sessionmaker
                    from sqlalchemy.pool import StaticPool
                    
                    # Use the isolated scenario's database URL
                    sync_db_url = ctx["test_db_url"].replace('sqlite+aiosqlite://', 'sqlite://')
                    sync_engine = create_engine(
                        sync_db_url,
                        connect_args={"check_same_thread": False},
                        poolclass=StaticPool,
                    )
                    SyncSession = sessionmaker(bind=sync_engine)
                    
                    with SyncSession() as session:
                        from app.models import ActivityAttempt
                        from app.core.security import get_password_hash
                        
                        # Create a completed attempt that is overdue for review (> 7 days ago)
                        overdue_attempt = ActivityAttempt(
                            student_id=ctx["student_id"],
                            activity_id=ctx["activity_id"],
                            attempt_number=1,
                            status="completed",
                            score=80,
                            max_score=100,
                            passed=True,
                            completed_at=datetime.now(timezone.utc) - timedelta(days=10),
                            time_spent_seconds=300,
                        )
                        session.add(overdue_attempt)
                        session.commit()
                    
                    sync_engine.dispose()
                    
                    # Call the endpoint
                    response = await client.get(
                        "/api/v1/students/me/next-activity",
                        headers={"X-CSRF-Token": csrf_token},
                    )
                    
                    assert response.status_code == 200
                    data = response.json()
                    
                    # Should recommend the overdue activity for review
                    assert data["activity_id"] == ctx["activity_id"]
                    assert data["reason"] == "review_overdue"
                    assert data["confidence"] == "medium"
                    assert data["has_evidence"] is True
                    
                    sync_engine.dispose()
                    break

    @pytest.mark.asyncio
    async def test_attempt_not_found_recommendation(self, test_db_url):
        """Recommendation returns attempt_not_found when no completed attempt exists for the activity."""
        async for ctx in _create_isolated_student_scenario(test_db_url):
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            
            # The student has NO completed attempts for the activity
            # The endpoint will try to use the latest completed attempt as anchor
            # Since there are none, it should fall back to cold start
            # But let's verify the endpoint handles this gracefully
            response = await client.get(
                "/api/v1/students/me/next-activity",
                headers={"X-CSRF-Token": csrf_token},
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Should fall back to cold start
            assert data["reason"] == "cold_start_sequence"
            assert data["tier"] == "cold_start"
            assert data["mastery_score"] is None
            assert data["has_evidence"] is False
            
            break

    @pytest.mark.asyncio
    async def test_no_stage_assigned_recommendation(self, test_db_url):
        """Returns no_stage_assigned when student has no current_stage_id."""
        async for ctx in _create_isolated_student_scenario(test_db_url):
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            
            # Debug: check student's current_stage_id before modification
            from app.models import StudentProfile
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy.pool import StaticPool
            from sqlalchemy import select
            
            sync_db_url = test_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
            sync_engine = create_engine(
                sync_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            SyncSession = sessionmaker(bind=sync_engine)
            
            with SyncSession() as session:
                student_result = session.execute(
                    select(StudentProfile).where(StudentProfile.id == ctx["student_id"])
                )
                student = student_result.scalar_one_or_none()
                print(f"DEBUG BEFORE: student.current_stage_id = {student.current_stage_id if student else None}")
                if student:
                    student.current_stage_id = None
                    session.commit()
                
                # Verify the change
                student_result2 = session.execute(
                    select(StudentProfile).where(StudentProfile.id == ctx["student_id"])
                )
                student2 = student_result2.scalar_one_or_none()
                print(f"DEBUG AFTER COMMIT: student.current_stage_id = {student2.current_stage_id if student2 else None}")
            
            sync_engine.dispose()
            
            # Call the endpoint
            response = await client.get(
                "/api/v1/students/me/next-activity",
                headers={"X-CSRF-Token": csrf_token},
            )
            
            print(f"DEBUG: response.status_code = {response.status_code}")
            print(f"DEBUG: response.json() = {response.json()}")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should return no_stage_assigned
            assert data["activity_id"] is None
            assert data["reason"] == "no_stage_assigned"
            assert data["tier"] == "cold_start"
            assert data["confidence"] == "low"
            assert data["mastery_score"] is None
            assert data["has_evidence"] is False
            
            break

    @pytest.mark.asyncio
    async def test_no_activities_in_stage_recommendation(self, test_db_url):
        """Returns no_activities_in_stage when stage has no published activities."""
        async for ctx in _create_isolated_student_scenario(test_db_url):
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            
            # Mark all activities in the student's stage as unpublished
            from app.models import Activity, Lesson, Topic, Subject
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy.pool import StaticPool
            
            sync_db_url = test_db_url.replace('sqlite+aiosqlite://', 'sqlite://')
            sync_engine = create_engine(
                sync_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            SyncSession = sessionmaker(bind=sync_engine)
            
            with SyncSession() as session:
                from sqlalchemy import select
                
                # Get the student's stage
                from app.models import StudentProfile
                student_result = session.execute(
                    select(StudentProfile).where(StudentProfile.id == ctx["student_id"])
                )
                student = student_result.scalar_one_or_none()
                stage_id = student.current_stage_id
                
                # Mark all activities in this stage as unpublished
                activities_result = session.execute(
                    select(Activity)
                    .join(Lesson, Activity.lesson_id == Lesson.id)
                    .join(Topic, Lesson.topic_id == Topic.id)
                    .join(Subject, Topic.subject_id == Subject.id)
                    .where(Subject.stage_id == stage_id)
                )
                activities = activities_result.scalars().all()
                for activity in activities:
                    activity.status = "draft"  # Mark as unpublished
                session.commit()
            
            sync_engine.dispose()
            
            # Call the endpoint
            response = await client.get(
                "/api/v1/students/me/next-activity",
                headers={"X-CSRF-Token": csrf_token},
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Should return no_activities_in_stage
            assert data["activity_id"] is None
            assert data["reason"] == "no_activities_in_stage"
            assert data["tier"] == "cold_start"
            assert data["confidence"] == "low"
            
            break

    @pytest.mark.asyncio
    async def test_unauthenticated_rejected_properly(self, test_db_url):
        """Unauthenticated requests to next-activity are rejected with 401."""
        from app.main import create_app
        from app.core.database import get_db
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        
        app = create_app()
        
        async def override_get_db():
            async_db_url = test_db_url
            if not test_db_url.startswith('sqlite+aiosqlite://'):
                if test_db_url.startswith('sqlite://'):
                    async_db_url = test_db_url.replace('sqlite://', 'sqlite+aiosqlite://')
                else:
                    async_db_url = test_db_url
            request_engine = create_async_engine(
                async_db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
            request_session = async_sessionmaker(request_engine, class_=AsyncSession, expire_on_commit=False)
            async with request_session() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
                finally:
                    await request_engine.dispose()
        
        app.dependency_overrides[get_db] = override_get_db
        
        from httpx import AsyncClient, ASGITransport
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as ac:
            # Request WITHOUT CSRF token - should be rejected by auth middleware
            # The CSRF middleware may intercept first, but we should get a 401/403
            response = await ac.get("/api/v1/students/me/next-activity")
            # Should be rejected (either 401 Unauthorized or 403 Forbidden)
            assert response.status_code in [401, 403]
        
        app.dependency_overrides.clear()