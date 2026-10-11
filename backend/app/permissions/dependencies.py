"""
FastAPI permission dependencies for RBAC.
"""
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthorizationException
from app.models import User, UserRole, Role
from app.permissions.roles import Permission, Role as RoleEnum, user_has_permission


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token in cookie."""
    from app.core.security import decode_token

    # Get access token from cookie
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise AuthorizationException("Not authenticated")

    token_data = decode_token(access_token)
    if not token_data or token_data.type != "access":
        raise AuthorizationException("Invalid or expired token")

    # Fetch user from database with roles eagerly loaded
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .where(User.id == int(token_data.sub))
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
    )
    user = result.scalar_one_or_none()

    if not user or user.is_deleted or not user.is_active:
        raise AuthorizationException("User not found or inactive")

    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None."""
    try:
        return await get_current_user(request, db)
    except AuthorizationException:
        return None


def get_user_roles(user: User) -> list[RoleEnum]:
    """Extract role enums from user's roles."""
    roles = []
    for user_role in user.user_roles:
        # Role model doesn't have soft delete, so no is_deleted check needed
        try:
            roles.append(RoleEnum(user_role.role.name))
        except ValueError:
            pass
    return roles


def require_permission(permission: Permission):
    """Dependency factory for requiring a specific permission."""

    async def permission_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_roles = get_user_roles(current_user)
        if not user_has_permission(user_roles, permission):
            raise AuthorizationException(f"Permission denied: {permission.value}")
        return current_user

    return permission_checker


def require_role(*roles: RoleEnum):
    """Dependency factory for requiring one of the specified roles."""

    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_roles = get_user_roles(current_user)
        if not any(r in user_roles for r in roles):
            raise AuthorizationException(f"Role required: {[r.value for r in roles]}")
        return current_user

    return role_checker


# Common permission dependencies
require_admin = require_role(RoleEnum.ADMIN)
require_parent = require_role(RoleEnum.PARENT, RoleEnum.ADMIN)
require_student = require_role(RoleEnum.STUDENT, RoleEnum.PARENT, RoleEnum.ADMIN)
require_authenticated = get_current_user

# Curriculum permissions
require_curriculum_read = require_permission(Permission.CURRICULUM_LESSON_READ)
require_curriculum_write = require_permission(Permission.CURRICULUM_LESSON_CREATE)
require_curriculum_publish = require_permission(Permission.CURRICULUM_LESSON_PUBLISH)

# Progress permissions
require_progress_read_own = require_permission(Permission.PROGRESS_READ_OWN)
require_progress_read_child = require_permission(Permission.PROGRESS_READ_CHILD)
require_progress_read_all = require_permission(Permission.PROGRESS_READ_ALL)

# Admin permissions
require_admin_dashboard = require_permission(Permission.ADMIN_DASHBOARD_READ)
require_admin_users = require_permission(Permission.ADMIN_USERS_MANAGE)
require_admin_audit = require_permission(Permission.ADMIN_AUDIT_LOGS_READ)