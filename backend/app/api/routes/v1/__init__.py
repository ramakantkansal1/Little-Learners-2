"""
API v1 routes package initialization.
"""
from app.api.routes.v1 import health, auth

# Combine all routers
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

__all__ = ["api_router"]