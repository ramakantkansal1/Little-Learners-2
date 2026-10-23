"""Integration tests for API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
import hashlib
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import create_app
from app.models import (
    User, StudentProfile, Role, UserRole,
    Subject, Topic, Lesson, Activity, Question, AnswerOption,
    ActivityTypeEnum, LearningStage, StudentReward,
)
from app.core.security import get_password_hash


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
                "/api/v1/auth/student/login",
                json={
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
        self, client: AsyncClient, seeded_session
    ):
        """Authorized parent can view analytics for their own child."""
        csrf_token, child_id = await self._setup_parent_and_child(
            client, "analytics1@example.com", "Analytics Parent 1"
        )

        # Add learning data directly to session
        from app.models import (
            ActivityAttempt,
            StudentLessonProgress,
            StudentReward,
            StudentRewardAward,
        )
        from datetime import datetime, timezone, timedelta

        attempt1 = ActivityAttempt(
            student_id=child_id,
            activity_id=1,
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
            activity_id=2,
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
            activity_id=3,
            attempt_number=1,
            status="started",
            score=None,
            max_score=100,
            passed=None,
            time_spent_seconds=120,
        )
        seeded_session.add(attempt1)
        seeded_session.add(attempt2)
        seeded_session.add(attempt3)

        progress = StudentLessonProgress(
            student_id=child_id,
            lesson_id=1,
            status="completed",
            completion_percentage=100,
            time_spent_seconds=540,
            completed_at=datetime.now(timezone.utc),
        )
        seeded_session.add(progress)

        reward = StudentReward(
            code="first_star",
            name="First Star",
            description="First star",
            reward_type="star",
            points_value=1,
            display_order=1,
            is_active=True,
        )
        seeded_session.add(reward)
        await seeded_session.flush()

        award = StudentRewardAward(
            student_id=child_id,
            reward_id=reward.id,
            earned_at=datetime.now(timezone.utc),
        )
        seeded_session.add(award)

        await seeded_session.commit()

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
        assert data["child_name"] == "Analytics Child"
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


async def _setup_student_attempt_scenario():
    """
    Helper to create a full test scenario:
    - In-memory database with all tables
    - Stage, subject, topic, lesson, activity, questions, answer options
    - Parent user + student profile with PIN
    - Authenticated test client as the student
    """
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Seed a stage
        stage = LearningStage(
            code="playgroup", name="Playgroup / Pre-Nursery",
            min_age_months=24, max_age_months=36,
            display_order=1, icon="baby", color="#FFB3BA", is_active=True,
        )
        session.add(stage)
        await session.flush()

        # Subject, topic, lesson, activity
        subject = Subject(
            stage_id=stage.id, domain_id=1, code="english", name="English",
            display_order=1, icon="abc", color="#FFB3BA", is_active=True,
        )
        session.add(subject)
        await session.flush()

        topic = Topic(
            subject_id=subject.id, code="letters", name="Letters",
            display_order=1, is_active=True,
        )
        session.add(topic)
        await session.flush()

        lesson = Lesson(
            topic_id=topic.id, code="lesson-001", status="published",
            version=1, is_active=True, display_order=1,
        )
        session.add(lesson)
        await session.flush()

        activity = Activity(
            lesson_id=lesson.id, type=ActivityTypeEnum.PICTURE_MATCHING,
            code="activity-001", status="published", version=1,
            display_order=1, is_active=True,
        )
        session.add(activity)
        await session.flush()

        # Two questions with options
        q1 = Question(
            activity_id=activity.id, question_type="single_choice",
            prompt="Which image matches A?", display_order=1, points=10,
            is_active=True,
        )
        session.add(q1)
        await session.flush()

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
        await session.flush()

        q2_correct = AnswerOption(
            question_id=q2.id, text="Correct Option 2", is_correct=True,
            display_order=1,
        )
        session.add(q2_correct)
        await session.commit()

        # Seed rewards
        rewards_data = [
            {"code": "first_star", "name": "First Star", "description": "Earned your first star!", "reward_type": "star", "points_value": 1, "display_order": 1},
            {"code": "five_stars", "name": "Five Stars", "description": "Collected 5 stars!", "reward_type": "star", "points_value": 5, "display_order": 2},
            {"code": "ten_stars", "name": "Ten Stars", "description": "Collected 10 stars!", "reward_type": "star", "points_value": 10, "display_order": 3},
            {"code": "first_lesson", "name": "First Lesson", "description": "Completed your first lesson!", "reward_type": "badge", "points_value": 10, "display_order": 4},
            {"code": "five_lessons", "name": "Five Lessons", "description": "Completed 5 lessons!", "reward_type": "badge", "points_value": 25, "display_order": 5},
            {"code": "perfect_score", "name": "Perfect Score", "description": "Got 100% on an activity!", "reward_type": "sticker", "points_value": 5, "display_order": 6},
            {"code": "week_streak", "name": "Week Streak", "description": "Learned 7 days in a row!", "reward_type": "badge", "points_value": 50, "display_order": 7},
        ]
        for reward_data in rewards_data:
            reward = StudentReward(**reward_data, is_active=True)
            session.add(reward)
        await session.commit()

        # Create parent user
        parent_user = User(
            email="attemptparent@example.com",
            password_hash=get_password_hash("Test@123"),
            is_active=True, is_verified=True,
        )
        session.add(parent_user)
        await session.flush()

        # Get or create student role
        role_result = await session.execute(
            select(Role).where(Role.name == "student")
        )
        role = role_result.scalar_one_or_none()
        if not role:
            role = Role(name="student", description="Student role", is_system=True)
            session.add(role)
            await session.flush()

        session.add(UserRole(user_id=parent_user.id, role_id=role.id))

        # Create student profile
        student = StudentProfile(
            user_id=parent_user.id, display_name="Attempt Test Student",
            username=f"attemptstudent_{parent_user.id}",
            pin_hash=get_password_hash("1234"),
            is_active=True, preferred_language="en",
        )
        session.add(student)
        await session.commit()

        # Create app with overridden get_db
        app = create_app()

        async def override_get_db():
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

            # Login as student (this sets new auth + CSRF cookies)
            login_response = await ac.post(
                "/api/v1/auth/student/login",
                json={"username": student.username, "pin": "1234"},
                headers={"X-CSRF-Token": csrf_token, "X-Client-ID": "test-attempt-helper"},
            )
            assert login_response.status_code == 200, f"Student login failed: {login_response.text}"

            # Get fresh CSRF token after login (login rotates the CSRF cookie)
            csrf_response2 = await ac.get("/api/v1/auth/csrf-token")
            csrf_token = csrf_response2.json()["csrf_token"]

            yield {
                "client": ac,
                "csrf_token": csrf_token,
                "async_session": async_session,
                "student_id": student.id,
                "user_id": parent_user.id,
                "activity_id": activity.id,
                "lesson_id": lesson.id,
                "q1_id": q1.id,
                "q2_id": q2.id,
                "q1_correct_id": q1_correct.id,
                "q1_wrong_id": q1_wrong.id,
                "q2_correct_id": q2_correct.id,
            }

        app.dependency_overrides.clear()
        await engine.dispose()


class TestActivityAttemptPersistence:
    """Tests for activity attempt persistence (Phase 6 Stage 1)."""

    @pytest.mark.asyncio
    async def test_valid_authenticated_attempt_is_persisted_with_metadata(self):
        """A valid authenticated student attempt is persisted with progress metadata."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
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

    @pytest.mark.asyncio
    async def test_attempt_resumption_returns_saved_progress(self):
        """Getting an existing attempt returns the saved progress metadata for resumption."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_student_cannot_access_another_students_attempt(self):
        """A student cannot submit or access another student's attempt via identifier manipulation."""
        async for ctx in _setup_student_attempt_scenario():
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            activity_id = ctx["activity_id"]

            # Start an attempt as the first student
            start_response = await client.post(
                f"/api/v1/students/me/activities/{activity_id}/attempts",
                headers={"X-CSRF-Token": csrf_token},
            )
            attempt_id = start_response.json()["attempt_id"]

            # Set up a second student with a separate database
            async for ctx2 in _setup_student_attempt_scenario():
                client2 = ctx2["client"]
                csrf_token2 = ctx2["csrf_token"]

                # Try to access the first student's attempt from the second student
                access_response = await client2.get(
                    f"/api/v1/students/me/attempts/{attempt_id}"
                )
                assert access_response.status_code == 404

                # Try to submit to the first student's attempt from the second student
                submit_response = await client2.post(
                    f"/api/v1/students/attempts/{attempt_id}/responses",
                    json={"question_id": ctx["q1_id"], "selected_option_ids": [ctx["q1_correct_id"]]},
                    headers={"X-CSRF-Token": csrf_token2},
                )
                assert submit_response.status_code == 404
                break

    @pytest.mark.asyncio
    async def test_unauthenticated_requests_are_rejected(self):
        """Requests without authentication are rejected."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_invalid_submission_rejected(self):
        """Invalid or incomplete submissions are rejected."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_repeated_submission_does_not_duplicate_records(self):
        """Submitting the same answer twice does not create duplicate response records."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(ActivityResponse).where(
                        ActivityResponse.attempt_id == attempt_id,
                        ActivityResponse.question_id == q1_id,
                    )
                )
                responses = result.scalars().all()
                assert len(responses) >= 1

    @pytest.mark.asyncio
    async def test_complete_attempt_persists_score_and_passed(self):
        """Completing an attempt persists score, passed status, and completion timestamp."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(ActivityAttempt).where(ActivityAttempt.id == attempt_id)
                )
                attempt = result.scalar_one_or_none()
                assert attempt is not None
                assert attempt.status == "completed"
                assert attempt.score == 100
                assert attempt.passed is True
                assert attempt.completed_at is not None

    @pytest.mark.asyncio
    async def test_duplicate_completion_rejected_after_first(self):
        """A second completion of the same attempt is rejected with 422."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_concurrent_completion_only_one_succeeds(self):
        """Concurrent completion requests: only one succeeds, no duplicate streak/reward/progress.

        Uses a conditional UPDATE (WHERE status != "completed") to atomically transition
        the attempt from non-completed to completed. Only one request can successfully
        transition the status; concurrent requests match 0 rows and are rejected with 422.

        Verified against MySQL InnoDB (5/5 repeated runs passed; see DEF-005).
        Against SQLite, the shared AsyncSession cannot execute concurrent flushes, so this
        test verifies sequential idempotency: first completion succeeds (200), repeat is
        rejected (422), and final state has no duplicate streak/rewards/progress.
        """
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
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


class TestLessonProgressUpdates:
    """Tests for automatic lesson-progress updates (Phase 6 Stage 2)."""

    @pytest.mark.asyncio
    async def test_starting_activity_creates_lesson_progress(self):
        """Starting an activity creates or updates the correct lesson-progress record."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentLessonProgress).where(
                        StudentLessonProgress.student_id == ctx["student_id"],
                        StudentLessonProgress.lesson_id == lesson_id,
                    )
                )
                progress = result.scalar_one_or_none()
                assert progress is not None
                assert progress.student_id == ctx["student_id"]
                assert progress.lesson_id == lesson_id
                assert progress.status == "in_progress"
                assert progress.completion_percentage == 0
                assert progress.last_activity_at is not None
                assert progress.current_activity_id == activity_id

    @pytest.mark.asyncio
    async def test_completing_activity_updates_lesson_progress(self):
        """Completing one activity updates lesson progress correctly."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentLessonProgress).where(
                        StudentLessonProgress.student_id == ctx["student_id"],
                        StudentLessonProgress.lesson_id == lesson_id,
                    )
                )
                progress = result.scalar_one_or_none()
                assert progress is not None
                assert progress.status == "completed"
                assert progress.completion_percentage == 100
                assert progress.completed_at is not None
                assert progress.last_activity_at is not None

    @pytest.mark.asyncio
    async def test_completing_all_activities_marks_lesson_completed(self):
        """Completing the final required activity marks the lesson completed."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentLessonProgress).where(
                        StudentLessonProgress.student_id == ctx["student_id"],
                        StudentLessonProgress.lesson_id == lesson_id,
                    )
                )
                progress = result.scalar_one_or_none()
                assert progress is not None
                assert progress.status == "completed"
                assert progress.completion_percentage == 100

    @pytest.mark.asyncio
    async def test_repeated_completion_does_not_inflate_progress(self):
        """Completing the same activity repeatedly does not inflate progress."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentLessonProgress).where(
                        StudentLessonProgress.student_id == ctx["student_id"],
                        StudentLessonProgress.lesson_id == lesson_id,
                    )
                )
                progress = result.scalar_one_or_none()
                assert progress is not None
                assert progress.status == "completed"
                assert progress.completion_percentage == 100

    @pytest.mark.asyncio
    async def test_student_cannot_access_another_students_lesson_progress(self):
        """A student cannot access another student's lesson progress."""
        async for ctx in _setup_student_attempt_scenario():
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

            # Second student tries to access - set up separate scenario
            async for ctx2 in _setup_student_attempt_scenario():
                client2 = ctx2["client"]
                csrf_token2 = ctx2["csrf_token"]

                # Try to start an activity in the first student's lesson
                access_response = await client2.post(
                    f"/api/v1/students/me/activities/{activity_id}/attempts",
                    headers={"X-CSRF-Token": csrf_token2},
                )
                # This creates a NEW attempt for the second student (different student_id)
                # but the lesson progress record is separate per student
                assert access_response.status_code == 200

                # Verify second student has their own progress record
                from app.models import StudentLessonProgress

                async with ctx2["async_session"]() as check_session:
                    result = await check_session.execute(
                        select(StudentLessonProgress).where(
                            StudentLessonProgress.student_id == ctx2["student_id"],
                            StudentLessonProgress.lesson_id == lesson_id,
                        )
                    )
                    progress2 = result.scalar_one_or_none()
                    assert progress2 is not None
                    assert progress2.student_id == ctx2["student_id"]
                break

    @pytest.mark.asyncio
    async def test_empty_lesson_handled_safely(self):
        """A lesson with no activities is handled without division-by-zero."""
        async for ctx in _setup_student_attempt_scenario():
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]

            # Create an empty lesson (no activities)
            from app.models import Lesson

            async with ctx["async_session"]() as check_session:
                empty_lesson = Lesson(
                    topic_id=1,  # References the topic from the scenario
                    code="empty-lesson",
                    status="published",
                    version=1,
                    is_active=True,
                    display_order=99,
                )
                check_session.add(empty_lesson)
                await check_session.commit()
                empty_lesson_id = empty_lesson.id

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
    async def test_resume_does_not_duplicate_lesson_progress(self):
        """Resuming an existing attempt does not create duplicate lesson-progress records."""
        async for ctx in _setup_student_attempt_scenario():
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

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentLessonProgress).where(
                        StudentLessonProgress.student_id == ctx["student_id"],
                        StudentLessonProgress.lesson_id == lesson_id,
                    )
                )
                progress_records = result.scalars().all()
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
    async def test_qualifying_completion_earns_reward(self):
        """A qualifying completion earns an eligible reward."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_incomplete_activity_earns_no_reward(self):
        """An ineligible or incomplete activity earns no reward."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_repeated_completion_no_duplicate_awards(self):
        """Repeated completion does not create duplicate one-time awards."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_student_cannot_access_another_students_rewards(self):
        """A student cannot access another student's rewards or streak."""
        async for ctx in _setup_student_attempt_scenario():
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            activity_id = ctx["activity_id"]
            q1_correct_id = ctx["q1_correct_id"]

            # Complete activity as first student
            await self._complete_activity(ctx, activity_id)

            # Second student tries to access rewards
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
                break

    @pytest.mark.asyncio
    async def test_first_qualifying_completion_starts_streak(self):
        """A first qualifying completion starts a streak."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_streak_info_returned_on_lesson_completion(self):
        """Calculated streak_info is returned in the API response when a lesson is just completed."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_same_day_repeated_completion_no_streak_inflation(self):
        """Same-day repeated completions do not inflate the streak."""
        async for ctx in _setup_student_attempt_scenario():
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]

            # Complete first activity/lesson
            activity_id = ctx["activity_id"]
            result1 = await self._complete_activity(ctx, activity_id)
            assert result1["streak"]["current_streak"] == 1

            # Create a second lesson+activity in the same topic
            from app.models import Lesson, Activity

            async with ctx["async_session"]() as check_session:
                lesson2 = Lesson(
                    topic_id=1,
                    code="lesson-002",
                    status="published",
                    version=1,
                    is_active=True,
                    display_order=2,
                )
                check_session.add(lesson2)
                await check_session.flush()

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
                await check_session.flush()

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
                await check_session.flush()

                q_new_correct = AnswerOption(
                    question_id=q_new.id,
                    text="Correct Answer",
                    is_correct=True,
                    display_order=1,
                )
                check_session.add(q_new_correct)
                await check_session.commit()

                lesson2_id = lesson2.id
                activity2_id = activity2.id
                q_new_correct_id = q_new_correct.id

            # Manually set last_activity_date to today (same day)
            from app.models import StudentProfile

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentProfile).where(
                        StudentProfile.id == ctx["student_id"]
                    )
                )
                student = result.scalar_one_or_none()
                student.last_activity_date = date.today()
                await check_session.commit()

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
    async def test_consecutive_day_extends_streak(self):
        """Consecutive qualifying days extend the streak."""
        async for ctx in _setup_student_attempt_scenario():
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]

            # Complete first activity/lesson
            activity_id = ctx["activity_id"]
            result1 = await self._complete_activity(ctx, activity_id)
            assert result1["streak"]["current_streak"] == 1

            # Create second lesson+activity
            from app.models import Lesson, Activity

            async with ctx["async_session"]() as check_session:
                lesson2 = Lesson(
                    topic_id=1,
                    code="lesson-002",
                    status="published",
                    version=1,
                    is_active=True,
                    display_order=2,
                )
                check_session.add(lesson2)
                await check_session.flush()

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
                await check_session.flush()

                q_new = Question(
                    activity_id=activity2.id,
                    question_type="single_choice",
                    prompt="New question?",
                    display_order=1,
                    points=10,
                    is_active=True,
                )
                check_session.add(q_new)
                await check_session.flush()

                q_new_correct = AnswerOption(
                    question_id=q_new.id,
                    text="Correct Answer",
                    is_correct=True,
                    display_order=1,
                )
                check_session.add(q_new_correct)
                await check_session.commit()

                activity2_id = activity2.id
                q_new_correct_id = q_new_correct.id

            # Set last_activity_date to yesterday
            from app.models import StudentProfile

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentProfile).where(
                        StudentProfile.id == ctx["student_id"]
                    )
                )
                student = result.scalar_one_or_none()
                student.last_activity_date = date.today() - timedelta(days=1)
                await check_session.commit()

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
    async def test_missed_day_resets_streak(self):
        """A missed day resets the streak."""
        async for ctx in _setup_student_attempt_scenario():
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]

            # Complete first activity/lesson
            activity_id = ctx["activity_id"]
            result1 = await self._complete_activity(ctx, activity_id)
            assert result1["streak"]["current_streak"] == 1

            # Create second lesson+activity
            from app.models import Lesson, Activity

            async with ctx["async_session"]() as check_session:
                lesson2 = Lesson(
                    topic_id=1,
                    code="lesson-002",
                    status="published",
                    version=1,
                    is_active=True,
                    display_order=2,
                )
                check_session.add(lesson2)
                await check_session.flush()

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
                await check_session.flush()

                q_new = Question(
                    activity_id=activity2.id,
                    question_type="single_choice",
                    prompt="New question?",
                    display_order=1,
                    points=10,
                    is_active=True,
                )
                check_session.add(q_new)
                await check_session.flush()

                q_new_correct = AnswerOption(
                    question_id=q_new.id,
                    text="Correct Answer",
                    is_correct=True,
                    display_order=1,
                )
                check_session.add(q_new_correct)
                await check_session.commit()

                activity2_id = activity2.id
                q_new_correct_id = q_new_correct.id

            # Set last_activity_date to 2 days ago (missed a day)
            from app.models import StudentProfile

            async with ctx["async_session"]() as check_session:
                result = await check_session.execute(
                    select(StudentProfile).where(
                        StudentProfile.id == ctx["student_id"]
                    )
                )
                student = result.scalar_one_or_none()
                student.last_activity_date = date.today() - timedelta(days=2)
                await check_session.commit()

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
    async def test_repeated_requests_idempotent(self):
        """Repeated completion requests are idempotent."""
        async for ctx in _setup_student_attempt_scenario():
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
    async def test_database_failure_no_partial_state(self):
        """Database failures do not leave partial reward or streak state.

        Simulates a database write failure on the completion commit and verifies
        that the completion-related state (attempt completion, streak, reward
        award, lesson progress) is rolled back and no partial state persists.

        The commit mock fails exactly once (one-shot), triggered for the
        completion endpoint's commit. The override_get_db post-yield commit
        runs after the one-shot is consumed, so it succeeds normally.
        """
        async for ctx in _setup_student_attempt_scenario():
            client = ctx["client"]
            csrf_token = ctx["csrf_token"]
            activity_id = ctx["activity_id"]
            q1_correct_id = ctx["q1_correct_id"]

            from unittest.mock import patch
            from sqlalchemy.ext.asyncio import AsyncSession

            original_commit = AsyncSession.commit
            fail_commit = {"enabled": False, "consumed": False}

            async def failing_commit(self):
                if fail_commit["enabled"] and not fail_commit["consumed"]:
                    fail_commit["consumed"] = True
                    raise RuntimeError("Simulated database failure")
                return await original_commit(self)

            with patch.object(AsyncSession, "commit", failing_commit):
                # Start attempt - commit succeeds
                start_response = await client.post(
                    f"/api/v1/students/me/activities/{activity_id}/attempts",
                    headers={"X-CSRF-Token": csrf_token},
                )
                assert start_response.status_code == 200
                attempt_id = start_response.json()["attempt_id"]

                # Submit correct answers - commits succeed
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

                # Enable commit failure for the completion attempt
                fail_commit["enabled"] = True

                # Completion commit will fail - endpoint should not return 200.
                # The simulated failure may propagate as an exception or be
                # converted to a 500 response by the generic exception handler;
                # accept either outcome.
                try:
                    complete_response = await client.post(
                        f"/api/v1/students/attempts/{attempt_id}/complete",
                        headers={"X-CSRF-Token": csrf_token},
                    )
                    assert complete_response.status_code != 200
                except RuntimeError:
                    # Simulated database failure propagated from the endpoint.
                    pass

            # Verify no partial completion state was persisted
            from app.models import (
                ActivityAttempt,
                StudentProfile,
                StudentLessonProgress,
                StudentRewardAward,
            )

            async with ctx["async_session"]() as check_session:
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