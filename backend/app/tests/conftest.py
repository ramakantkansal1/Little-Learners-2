"""Pytest configuration and fixtures."""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import create_app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models import LearningStage


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_engine():
    """Create a test database engine using SQLite in memory."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="function")
async def seeded_session(test_engine):
    """Create a test database session with seeded data."""
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        # Seed learning stages
        stages = [
            LearningStage(
                code="playgroup",
                name="Playgroup / Pre-Nursery",
                description="Play-based exploration for ages 2-3 years",
                min_age_months=24,
                max_age_months=36,
                display_order=1,
                icon="baby",
                color="#FFB3BA",
                is_active=True,
            ),
            LearningStage(
                code="nursery",
                name="Nursery",
                description="Colors, shapes, motor skills for ages 3-4 years",
                min_age_months=36,
                max_age_months=48,
                display_order=2,
                icon="blocks",
                color="#BAFFC9",
                is_active=True,
            ),
            LearningStage(
                code="lkg",
                name="Lower Kindergarten (LKG)",
                description="Pre-literacy, pre-numeracy for ages 4-5 years",
                min_age_months=48,
                max_age_months=60,
                display_order=3,
                icon="abc",
                color="#BAE1FF",
                is_active=True,
            ),
            LearningStage(
                code="ukg",
                name="Upper Kindergarten (UKG)",
                description="Reading readiness for ages 5-6 years",
                min_age_months=60,
                max_age_months=72,
                display_order=4,
                icon="book",
                color="#FFFFBA",
                is_active=True,
            ),
        ]
        for stage in stages:
            session.add(stage)
        await session.commit()
        yield session


@pytest.fixture(scope="function")
async def test_session(seeded_session):
    """Alias for seeded_session for backward compatibility."""
    yield seeded_session


@pytest.fixture(scope="function")
async def client(seeded_session):
    """Create a test client with overridden database dependency."""
    from app.main import create_app
    from app.core.database import get_db
    
    app = create_app()
    
    async def override_get_db():
        yield seeded_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    from httpx import AsyncClient, ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as ac:
        yield ac
    
    app.dependency_overrides.clear()