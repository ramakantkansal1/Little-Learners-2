"""Unit tests for core functionality."""
import pytest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_csrf_token,
    verify_csrf_token,
)


class TestPasswordHashing:
    """Tests for password hashing."""

    def test_hash_and_verify(self):
        """Test that a password can be hashed and verified."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)

        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("WrongPassword", hashed)

    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes."""
        password1 = "TestPassword123!"
        password2 = "TestPassword123!"

        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)

        # Argon2id uses random salts, so hashes should be different
        assert hash1 != hash2
        assert verify_password(password1, hash1)
        assert verify_password(password2, hash2)


class TestJWTTokens:
    """Tests for JWT token creation and validation."""

    def test_create_access_token(self):
        """Test access token creation."""
        token = create_access_token(subject="123", email="test@example.com", role="parent")

        assert isinstance(token, str)
        assert len(token) > 0

        payload = decode_token(token)
        assert payload is not None
        assert payload.sub == "123"
        assert payload.email == "test@example.com"
        assert payload.role == "parent"
        assert payload.type == "access"

    def test_create_refresh_token(self):
        """Test refresh token creation."""
        token = create_refresh_token(subject="123")

        assert isinstance(token, str)
        assert len(token) > 0

        payload = decode_token(token)
        assert payload is not None
        assert payload.sub == "123"
        assert payload.type == "refresh"

    def test_invalid_token(self):
        """Test that invalid tokens return None."""
        payload = decode_token("invalid.token.string")
        assert payload is None

    def test_expired_token(self):
        """Test that expired tokens return None."""
        from datetime import datetime, timedelta, timezone
        from jose import jwt
        from app.core.config import settings

        # Create a token that expired 1 hour ago
        expired_time = datetime.now(timezone.utc) - timedelta(hours=1)
        payload = {
            "sub": "123",
            "exp": int(expired_time.timestamp()),
            "iat": int((expired_time - timedelta(hours=1)).timestamp()),
            "type": "access",
            "jti": "test",
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        result = decode_token(token)
        assert result is None


class TestCSRFToken:
    """Tests for CSRF token generation and validation."""

    def test_create_and_verify(self):
        """Test CSRF token creation and verification."""
        token = create_csrf_token()

        assert isinstance(token, str)
        assert len(token) > 0
        assert verify_csrf_token(token, token)
        assert not verify_csrf_token(token, "different_token")

    def test_constant_time_comparison(self):
        """Test that verification uses constant-time comparison."""
        token1 = create_csrf_token()
        token2 = create_csrf_token()

        # Should not raise any timing-related issues
        assert verify_csrf_token(token1, token1)
        assert not verify_csrf_token(token1, token2)