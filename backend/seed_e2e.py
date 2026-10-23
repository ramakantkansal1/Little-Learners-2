"""Seed the SQLite database for local E2E testing."""
import asyncio
import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./e2e_test.db")

from sqlalchemy import select
from app.core.database import async_session_factory
from app.models import User, StudentProfile, Role, UserRole
from app.core.security import get_password_hash


async def main():
    async with async_session_factory() as session:
        # Get or create student role
        result = await session.execute(select(Role).where(Role.name == "student"))
        role = result.scalar_one_or_none()
        if not role:
            role = Role(name="student", description="Student role", is_system=True)
            session.add(role)
            await session.flush()

        # Create parent user
        user = User(
            email="parent@example.com",
            password_hash=get_password_hash("password123"),
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.flush()

        # Assign student role
        session.add(UserRole(user_id=user.id, role_id=role.id))

        # Create student profile (matches E2E test credentials: aarav_1 / 1234)
        student = StudentProfile(
            user_id=user.id,
            display_name="Aarav",
            username="aarav_1",
            pin_hash=get_password_hash("1234"),
            is_active=True,
            avatar_type="elephant",
            preferred_language="en",
        )
        session.add(student)
        await session.commit()
        print("Seeded: user_id=%d, username=aarav_1, pin=1234" % user.id)


if __name__ == "__main__":
    asyncio.run(main())
