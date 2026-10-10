"""
API routes package initialization.
"""
from app.api.routes.v1 import health, auth

__all__ = ["health", "auth"]