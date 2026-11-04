"""Verify migrations on a uniquely named disposable MySQL schema, never existing data."""

import asyncio
import os
from pathlib import Path
import subprocess
import sys
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import text
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings


async def main():
    if settings.APP_ENV != "e2e":
        raise RuntimeError("Run this verifier only through the isolated E2E backend")
    schema = "hll_phase6_verify_" + uuid.uuid4().hex[:12]
    url = URL.create(
        "mysql+asyncmy",
        username="root",
        password=settings.MYSQL_ROOT_PASSWORD,
        host=settings.DB_HOST,
        port=settings.DB_PORT,
    )
    engine = create_async_engine(url, echo=False)
    created = False
    try:
        async with engine.begin() as db:
            await db.execute(
                text(f"CREATE DATABASE `{schema}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            )
            created = True
        env = dict(
            os.environ,
            DB_NAME=schema,
            DB_USER="root",
            DB_PASSWORD=settings.MYSQL_ROOT_PASSWORD,
            DB_HOST=settings.DB_HOST,
            DB_PORT=str(settings.DB_PORT),
            DEBUG="false",
        )
        env.pop("DATABASE_URL", None)
        commands = [
            ["alembic", "upgrade", "head"],
            ["python", "-m", "app.scripts.seed_phase6"],
            ["python", "-m", "app.scripts.seed_phase6"],
            ["alembic", "downgrade", "-1"],
            ["alembic", "upgrade", "head"],
        ]
        for command in commands:
            result = await asyncio.to_thread(
                subprocess.run, command, env=env, capture_output=True, text=True
            )
            if result.returncode:
                # Migration errors only; never emit environment or database URLs.
                print(result.stderr[-3000:])
                raise RuntimeError(f"Command failed: {command}")
            print("PASS:", " ".join(command))
        async with engine.connect() as db:
            count = (await db.execute(text(f"SELECT COUNT(*) FROM `{schema}`.activities"))).scalar()
            assert count == 60, count
            bad_domains = (
                await db.execute(
                    text(
                        f"SELECT COUNT(*) FROM `{schema}`.subjects s JOIN `{schema}`.learning_domains d ON s.domain_id=d.id WHERE s.stage_id<>d.stage_id"
                    )
                )
            ).scalar()
            assert bad_domains == 0
            revision = (
                await db.execute(text(f"SELECT version_num FROM `{schema}`.alembic_version"))
            ).scalar()
            assert revision == "phase6_scopes_20261104"
            print(
                "PASS: 4 stages, 60 activities; seeding is idempotent; hierarchy and migration head verified"
            )
    finally:
        if created:
            async with engine.begin() as db:
                await db.execute(text(f"DROP DATABASE `{schema}`"))
            print("Removed only the temporary verification schema")
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
