"""
Custom middleware for logging, rate limiting, and CSRF protection.
"""
import time
import uuid
from typing import Callable, Optional

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import structlog

from app.core.config import settings
from app.core.security import verify_csrf_token

logger = structlog.get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request/response logging with correlation IDs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))

        # Add correlation ID to request state
        request.state.correlation_id = correlation_id

        # Log request
        start_time = time.time()
        logger.info(
            "Request started",
            correlation_id=correlation_id,
            method=request.method,
            path=request.url.path,
            query_params=dict(request.query_params),
            client_ip=request.client.host if request.client else None,
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            process_time = time.time() - start_time
            logger.exception(
                "Request failed",
                correlation_id=correlation_id,
                method=request.method,
                path=request.url.path,
                process_time=process_time,
                error=str(exc),
            )
            raise

        process_time = time.time() - start_time

        # Log response
        logger.info(
            "Request completed",
            correlation_id=correlation_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            process_time=process_time,
        )

        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Process-Time"] = str(process_time)

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.requests: dict[str, list[float]] = {}

    def _get_client_key(self, request: Request) -> str:
        """Get rate limit key from X-Client-ID header, falling back to client IP."""
        client_id = request.headers.get("X-Client-ID")
        if client_id:
            return f"client:{client_id}"
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    def _get_cors_headers(self, request: Request) -> dict:
        """Get CORS headers for error responses based on request origin."""
        origin = request.headers.get("origin")
        allowed_origins = settings.CORS_ORIGINS
        
        if origin and origin in allowed_origins:
            return {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        return {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and CSRF token endpoint
        if request.url.path.startswith("/api/v1/health") or request.url.path == "/api/v1/auth/csrf-token":
            return await call_next(request)

        # Get client key (X-Client-ID header or IP)
        client_key = self._get_client_key(request)
        current_time = time.time()

        # Determine rate limit based on path
        if request.url.path.startswith("/api/v1/auth/"):
            max_requests = settings.RATE_LIMIT_LOGIN_ATTEMPTS
            window_seconds = settings.RATE_LIMIT_LOGIN_WINDOW_MINUTES * 60
        else:
            max_requests = settings.RATE_LIMIT_API_REQUESTS
            window_seconds = settings.RATE_LIMIT_API_WINDOW_MINUTES * 60

        # Clean old requests
        if client_key in self.requests:
            self.requests[client_key] = [
                req_time for req_time in self.requests[client_key]
                if current_time - req_time < window_seconds
            ]
        else:
            self.requests[client_key] = []

        # Check rate limit
        if len(self.requests[client_key]) >= max_requests:
            logger.warning(
                "Rate limit exceeded",
                client_key=client_key,
                path=request.url.path,
                limit=max_requests,
                window=window_seconds,
            )
            cors_headers = self._get_cors_headers(request)
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Limit: {max_requests} per {window_seconds // 60} minutes.",
                        "details": [],
                    }
                },
                headers={
                    "Retry-After": str(window_seconds),
                    **cors_headers,
                },
            )

        # Record request
        self.requests[client_key].append(current_time)

        return await call_next(request)


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection for state-changing operations."""

    # Methods that require CSRF protection
    PROTECTED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    # Paths exempt from CSRF protection
    EXEMPT_PATHS = {
        "/api/v1/auth/parent/login",
        "/api/v1/auth/parent/register",
        "/api/v1/auth/student/login",
        "/api/v1/auth/refresh",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
        "/api/v1/health",
    }

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip CSRF for exempt paths and safe methods
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        if request.method not in self.PROTECTED_METHODS:
            return await call_next(request)

        # Check for CSRF token in header or form data
        csrf_token = request.headers.get("X-CSRF-Token")

        # For form data, check in body (requires reading body)
        if not csrf_token and request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
            # Note: This would require body parsing, simplified for now
            pass

        # Get expected CSRF token from session/cookie
        expected_token = request.cookies.get("csrf_token")

        if not csrf_token or not expected_token or not verify_csrf_token(csrf_token, expected_token):
            logger.warning(
                "CSRF token validation failed",
                path=request.url.path,
                method=request.method,
                client_ip=request.client.host if request.client else None,
            )
            return JSONResponse(
                status_code=403,
                content={
                    "error": {
                        "code": "CSRF_ERROR",
                        "message": "Invalid or missing CSRF token",
                        "details": [],
                    }
                },
            )

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # CSP for API responses
        if request.url.path.startswith("/api/"):
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"

        # HSTS for HTTPS (only in production)
        if settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response