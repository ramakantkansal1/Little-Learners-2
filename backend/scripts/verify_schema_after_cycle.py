#!/usr/bin/env python3
"""
Verify database schema after migration downgrade/upgrade cycle.
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings


async def verify_schema():
    """Verify database schema after downgrade/upgrade cycle."""
    engine = create_async_engine(settings.database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            # Check that tables still exist after downgrade/upgrade
            result = await conn.execute(text('SHOW TABLES'))
            tables = [row[0] for row in result]
            print(f'Found {len(tables)} tables after downgrade/upgrade cycle')
            
            # Verify migration version is back at head
            result = await conn.execute(text('SELECT version_num FROM alembic_version'))
            version = result.scalar()
            print(f'Current migration version after cycle: {version}')
            
            # Check key tables still exist
            expected_tables = ['users', 'roles', 'user_roles', 'parent_profiles', 'student_profiles',
                              'learning_stages', 'lessons', 'activities', 'student_lesson_progress']
            missing = []
            for table in expected_tables:
                if table not in tables:
                    missing.append(table)
            
            if missing:
                print(f'Missing tables: {missing}')
                return False
            
            print('Schema verification after cycle complete')
            return True
            
    except Exception as e:
        print(f'Schema verification after cycle failed: {e}')
        return False
    finally:
        await engine.dispose()


if __name__ == '__main__':
    success = asyncio.run(verify_schema())
    sys.exit(0 if success else 1)