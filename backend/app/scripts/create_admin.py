"""
Script to create initial admin user.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, async_session_factory
from app.core.security import get_password_hash
from app.models import User, Role, UserRole, ParentProfile, UserPreference
from app.permissions.roles import Role as RoleEnum


async def create_admin_user(
    email: str = "admin@happylittlelearners.in",
    password: str = "Admin@123",
    full_name: str = "System Administrator",
) -> User:
    """Create the initial admin user."""
    async with async_session_factory() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Admin user already exists: {email}")
            return existing

        # Create admin role if not exists
        result = await db.execute(select(Role).where(Role.name == RoleEnum.ADMIN.value))
        admin_role = result.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name=RoleEnum.ADMIN.value, description="System administrator", is_system=True)
            db.add(admin_role)
            await db.flush()

        # Create parent role if not exists
        result = await db.execute(select(Role).where(Role.name == RoleEnum.PARENT.value))
        parent_role = result.scalar_one_or_none()
        if not parent_role:
            parent_role = Role(name=RoleEnum.PARENT.value, description="Parent/guardian", is_system=True)
            db.add(parent_role)
            await db.flush()

        # Create student role if not exists
        result = await db.execute(select(Role).where(Role.name == RoleEnum.STUDENT.value))
        student_role = result.scalar_one_or_none()
        if not student_role:
            student_role = Role(name=RoleEnum.STUDENT.value, description="Student/child", is_system=True)
            db.add(student_role)
            await db.flush()

        # Create admin user
        password_hash = get_password_hash(password)
        admin_user = User(
            email=email,
            password_hash=password_hash,
            is_active=True,
            is_verified=True,
        )
        db.add(admin_user)
        await db.flush()

        # Assign admin role
        user_role = UserRole(user_id=admin_user.id, role_id=admin_role.id, assigned_by=admin_user.id)
        db.add(user_role)

        # Also assign parent role (for convenience)
        user_role2 = UserRole(user_id=admin_user.id, role_id=parent_role.id, assigned_by=admin_user.id)
        db.add(user_role2)

        # Create parent profile
        parent_profile = ParentProfile(
            user_id=admin_user.id,
            full_name=full_name,
            phone_number=None,
            phone_verified=True,
        )
        db.add(parent_profile)

        # Create user preferences
        preferences = UserPreference(user_id=admin_user.id)
        db.add(preferences)

        await db.commit()
        await db.refresh(admin_user)

        print(f"Admin user created successfully: {email}")
        print(f"User ID: {admin_user.id}")
        return admin_user


async def main():
    """Main function."""
    print("Creating admin user...")
    print(f"Database: {settings.database_url}")

    try:
        await create_admin_user()
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())