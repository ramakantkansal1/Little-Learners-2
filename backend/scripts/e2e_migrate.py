#!/usr/bin/env python3
"""
E2E Database Migration Runner

This script applies Alembic migrations to the dedicated E2E database.
It ensures the E2E database schema is up-to-date before running E2E tests.

Usage:
    python backend/scripts/e2e_migrate.py
    python backend/scripts/e2e_migrate.py --reset  # Drop and recreate E2E database
"""
import os
import sys
import argparse
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import asyncio

# Import settings after path setup
from app.core.config import Settings


async def create_e2e_database(mysql_root_password: str, db_host: str, db_port: int, db_charset: str, e2e_db_name: str) -> None:
    """Create the E2E database if it doesn't exist using root user."""
    # Connect to MySQL as root without specifying a database
    root_url = (
        f"mysql+asyncmy://root:{mysql_root_password}"
        f"@{db_host}:{db_port}"
        f"?charset={db_charset}"
    )
    
    engine = create_async_engine(root_url, echo=False)
    
    async with engine.connect() as conn:
        # Create E2E database
        await conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{e2e_db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        await conn.commit()
        print(f"✓ E2E database '{e2e_db_name}' created/verified")
    
    await engine.dispose()


async def drop_e2e_database(mysql_root_password: str, db_host: str, db_port: int, db_charset: str, e2e_db_name: str) -> None:
    """Drop the E2E database (use with caution!)."""
    root_url = (
        f"mysql+asyncmy://root:{mysql_root_password}"
        f"@{db_host}:{db_port}"
        f"?charset={db_charset}"
    )
    
    engine = create_async_engine(root_url, echo=False)
    
    async with engine.connect() as conn:
        await conn.execute(text(f"DROP DATABASE IF EXISTS `{e2e_db_name}`"))
        await conn.commit()
        print(f"✓ E2E database '{e2e_db_name}' dropped")
    
    await engine.dispose()


async def grant_e2e_permissions(mysql_root_password: str, db_host: str, db_port: int, db_charset: str, e2e_db_name: str, db_user: str) -> None:
    """Grant permissions on E2E database to the application user."""
    root_url = (
        f"mysql+asyncmy://root:{mysql_root_password}"
        f"@{db_host}:{db_port}"
        f"?charset={db_charset}"
    )
    
    engine = create_async_engine(root_url, echo=False)
    
    async with engine.connect() as conn:
        # Grant all privileges on the E2E database to the app user
        await conn.execute(text(f"GRANT ALL PRIVILEGES ON `{e2e_db_name}`.* TO '{db_user}'@'%'"))
        await conn.execute(text("FLUSH PRIVILEGES"))
        await conn.commit()
        print(f"✓ Granted permissions on '{e2e_db_name}' to '{db_user}'")
    
    await engine.dispose()


async def run_migrations(db_user: str, db_password: str, db_host: str, db_port: int, db_charset: str, e2e_db_name: str) -> None:
    """Run Alembic migrations on the E2E database."""
    import subprocess
    
    # Build E2E database URL
    e2e_database_url = (
        f"mysql+asyncmy://{db_user}:{db_password}"
        f"@{db_host}:{db_port}/{e2e_db_name}"
        f"?charset={db_charset}"
    )
    
    # Run migrations via subprocess to avoid event loop conflicts
    print(f"Running migrations on E2E database: {e2e_db_name}")
    env = os.environ.copy()
    env["DATABASE_URL"] = e2e_database_url
    
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=str(backend_dir),
        env=env,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"Migration failed: {result.stderr}")
        raise RuntimeError(f"Alembic migration failed: {result.stderr}")
    
    print("✓ Migrations applied successfully")
    if result.stdout:
        print(result.stdout)


async def verify_database_connection(db_user: str, db_password: str, db_host: str, db_port: int, db_charset: str, e2e_db_name: str) -> bool:
    """Verify connection to E2E database."""
    e2e_database_url = (
        f"mysql+asyncmy://{db_user}:{db_password}"
        f"@{db_host}:{db_port}/{e2e_db_name}"
        f"?charset={db_charset}"
    )
    
    engine = create_async_engine(e2e_database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            assert result.scalar() == 1
        print("✓ E2E database connection verified")
        return True
    except Exception as e:
        print(f"✗ E2E database connection failed: {e}")
        return False
    finally:
        await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description="E2E Database Migration Runner")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate E2E database before migrating")
    parser.add_argument("--verify-only", action="store_true", help="Only verify database connection")
    args = parser.parse_args()
    
    # Load settings
    settings = Settings()
    
    # Get E2E database name from environment or default
    e2e_db_name = os.environ.get('E2E_DB_NAME', 'happy_little_learners_e2e')
    
    print(f"E2E Database: {e2e_db_name}")
    print(f"Target Host: {settings.DB_HOST}:{settings.DB_PORT}")
    print(f"DB User: {settings.DB_USER}")
    
    # Get MySQL root password from settings
    mysql_root_password = settings.MYSQL_ROOT_PASSWORD
    
    if args.verify_only:
        success = await verify_database_connection(
            settings.DB_USER, settings.DB_PASSWORD, settings.DB_HOST, 
            settings.DB_PORT, settings.DB_CHARSET, e2e_db_name
        )
        sys.exit(0 if success else 1)
    
    if args.reset:
        print("⚠️  Resetting E2E database...")
        await drop_e2e_database(
            mysql_root_password, settings.DB_HOST, settings.DB_PORT, 
            settings.DB_CHARSET, e2e_db_name
        )
    
    # Create database (using root)
    await create_e2e_database(
        mysql_root_password, settings.DB_HOST, settings.DB_PORT, 
        settings.DB_CHARSET, e2e_db_name
    )
    
    # Grant permissions (using root)
    await grant_e2e_permissions(
        mysql_root_password, settings.DB_HOST, settings.DB_PORT, 
        settings.DB_CHARSET, e2e_db_name, settings.DB_USER
    )
    
    # Run migrations (using app user)
    await run_migrations(
        settings.DB_USER, settings.DB_PASSWORD, settings.DB_HOST, 
        settings.DB_PORT, settings.DB_CHARSET, e2e_db_name
    )
    
    # Verify (using app user)
    await verify_database_connection(
        settings.DB_USER, settings.DB_PASSWORD, settings.DB_HOST, 
        settings.DB_PORT, settings.DB_CHARSET, e2e_db_name
    )
    
    print("\n✅ E2E database is ready for testing!")


if __name__ == "__main__":
    asyncio.run(main())