"""
Health check endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.permissions.dependencies import require_permission
from app.permissions.roles import Permission

router = APIRouter(prefix="", tags=["health"])


@router.get("", summary="Health check")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "environment": settings.APP_ENV,
    }


@router.get("/db", summary="Database health check")
async def database_health_check(
    db: AsyncSession = Depends(get_db),
):
    """Database connectivity health check."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unhealthy", "database": "disconnected", "error": str(e)},
        )


@router.get("/ready", summary="Readiness check")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
):
    """Readiness check for Kubernetes/load balancers."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not ready"},
        )