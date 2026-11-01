#!/usr/bin/env python3
"""
E2E Database Seed Script

Seeds the E2E database with required test data:
- Admin user
- Basic curriculum data (if not already present from migrations)
- Test users (optional, tests create their own)

Run after migrations: python backend/scripts/e2e_seed.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import Settings
from app.models import User, Role, UserRole, StudentProfile, ParentProfile, LearningStage
from app.core.security import get_password_hash


async def seed_e2e_database():
    """Seed the E2E database with essential test data."""
    settings = Settings()
    
    # Override DB_NAME with E2E_DB_NAME for this session
    e2e_db_name = getattr(settings, 'E2E_DB_NAME', os.environ.get('E2E_DB_NAME', 'happy_little_learners_e2e'))
    
    database_url = (
        f"mysql+asyncmy://{settings.DB_USER}:{settings.DB_PASSWORD}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{e2e_db_name}"
        f"?charset={settings.DB_CHARSET}"
    )
    
    engine = create_async_engine(database_url, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print(f"Seeding E2E database: {e2e_db_name}")
        
        # 1. Ensure roles exist
        roles_to_create = [
            ("student", "Student role"),
            ("parent", "Parent role"),
            ("admin", "Admin role"),
        ]
        
        for role_name, role_desc in roles_to_create:
            result = await session.execute(select(Role).where(Role.name == role_name))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(name=role_name, description=role_desc, is_system=True)
                session.add(role)
                await session.flush()
                print(f"  ✓ Created role: {role_name}")
            else:
                print(f"  ✓ Role exists: {role_name}")
        
        # 2. Create admin user
        admin_email = os.environ.get('E2E_ADMIN_EMAIL', 'admin@example.com')
        admin_password = os.environ.get('E2E_ADMIN_PASSWORD', 'Admin@123')
        
        result = await session.execute(select(User).where(User.email == admin_email))
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                is_active=True,
                is_verified=True,
            )
            session.add(admin_user)
            await session.flush()
            
            # Assign admin role
            admin_role_result = await session.execute(select(Role).where(Role.name == "admin"))
            admin_role = admin_role_result.scalar_one()
            session.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
            
            print(f"  ✓ Created admin user: {admin_email}")
        else:
            print(f"  ✓ Admin user exists: {admin_email}")
        
        # 3. Verify learning stages exist (from migrations)
        stages_result = await session.execute(select(LearningStage))
        stages = list(stages_result.scalars().all())
        if stages:
            print(f"  ✓ Learning stages found: {[s.code for s in stages]}")
        else:
            print("  ⚠ No learning stages found - run migrations first!")
        
        await session.commit()
    
    await engine.dispose()
    print("✅ E2E database seeding completed")


if __name__ == "__main__":
    asyncio.run(seed_e2e_database())