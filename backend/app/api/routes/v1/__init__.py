"""
API v1 routes package initialization.
"""
from app.api.routes.v1 import health, auth, parents, students, curriculum, progress, admin, media

# Combine all routers
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(parents.router, prefix="/parents", tags=["parents"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(media.router, prefix="/media", tags=["media"])

__all__ = ["api_router"]