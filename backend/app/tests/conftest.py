import pytest
import asyncio
import tempfile
import os
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine
from sqlalchemy import select

from app.main import create_app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    LearningStage, Subject, Topic, Lesson, Activity, ActivityTypeEnum,
    Question, AnswerOption, User, StudentProfile, Role, UserRole, StudentReward,
    ParentProfile,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def test_db_url():
    """Create a temporary database file and return its URL."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
    
    # Use async URL for async engines
    db_url = f"sqlite+aiosqlite:///{db_path}"
    
    # Create tables using sync engine (avoids greenlet issues)
    sync_engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(sync_engine)
    
    # Seed learning stages using sync engine
    from sqlalchemy.orm import sessionmaker
    SyncSession = sessionmaker(bind=sync_engine)
    with SyncSession() as session:
        from app.models import LearningStage
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
        session.commit()
    
    sync_engine.dispose()
    
    yield db_url
    
    # Clean up
    try:
        os.unlink(db_path)
    except:
        pass


@pytest.fixture(scope="function")
async def seeded_data(test_db_url):
    """
    Seed the database with test data using asynchronous SQLAlchemy.
    Returns a dictionary of seeded data IDs for tests to use.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import StaticPool
    
    engine = create_async_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Learning stages are already seeded by test_db_url fixture
        from sqlalchemy import select
        stages_result = await session.execute(
            select(LearningStage).where(
                LearningStage.code.in_(["playgroup", "nursery", "lkg", "ukg"])
            )
        )
        stages = list(stages_result.scalars().all())
        
        # Subject, topic, lesson, activity
        subject = Subject(
            stage_id=stages[0].id, domain_id=1, code="english", name="English",
            display_order=1, icon="abc", color="#FFB3BA", is_active=True,
        )
        session.add(subject)
        await session.flush()

        topic = Topic(
            subject_id=subject.id, code="letters", name="Letters",
            display_order=1, is_active=True,
        )
        session.add(topic)
        await session.flush()

        lesson = Lesson(
            topic_id=topic.id, code="lesson-001", status="published",
            version=1, is_active=True, display_order=1,
        )
        session.add(lesson)
        await session.flush()

        activity = Activity(
            lesson_id=lesson.id, type=ActivityTypeEnum.PICTURE_MATCHING,
            code="activity-001", status="published", version=1,
            display_order=1, is_active=True,
        )
        session.add(activity)
        await session.flush()

        # Two questions with options
        q1 = Question(
            activity_id=activity.id, question_type="single_choice",
            prompt="Which image matches A?", display_order=1, points=10,
            is_active=True,
        )
        session.add(q1)
        await session.flush()

        q1_correct = AnswerOption(
            question_id=q1.id, text="Correct Option 1", is_correct=True,
            display_order=1,
        )
        q1_wrong = AnswerOption(
            question_id=q1.id, text="Wrong Option 1", is_correct=False,
            display_order=2,
        )
        session.add(q1_correct)
        session.add(q1_wrong)

        q2 = Question(
            activity_id=activity.id, question_type="single_choice",
            prompt="Which image matches B?", display_order=2, points=10,
            is_active=True,
        )
        session.add(q2)
        await session.flush()

        q2_correct = AnswerOption(
            question_id=q2.id, text="Correct Option 2", is_correct=True,
            display_order=1,
        )
        session.add(q2_correct)
        await session.commit()

        # Seed rewards
        rewards_data = [
            {"code": "first_star", "name": "First Star", "description": "Earned your first star!", "reward_type": "star", "points_value": 1, "display_order": 1},
            {"code": "five_stars", "name": "Five Stars", "description": "Collected 5 stars!", "reward_type": "star", "points_value": 5, "display_order": 2},
            {"code": "ten_stars", "name": "Ten Stars", "description": "Collected 10 stars!", "reward_type": "star", "points_value": 10, "display_order": 3},
            {"code": "first_lesson", "name": "First Lesson", "description": "Completed your first lesson!", "reward_type": "badge", "points_value": 10, "display_order": 4},
            {"code": "five_lessons", "name": "Five Lessons", "description": "Completed 5 lessons!", "reward_type": "badge", "points_value": 25, "display_order": 5},
            {"code": "perfect_score", "name": "Perfect Score", "description": "Got 100% on an activity!", "reward_type": "sticker", "points_value": 5, "display_order": 6},
            {"code": "week_streak", "name": "Week Streak", "description": "Learned 7 days in a row!", "reward_type": "badge", "points_value": 50, "display_order": 7},
        ]
        for reward_data in rewards_data:
            reward = StudentReward(**reward_data, is_active=True)
            session.add(reward)
        await session.commit()

        # Create parent user
        parent_user = User(
            email="attemptparent@example.com",
            password_hash=get_password_hash("Test@123"),
            is_active=True, is_verified=True,
        )
        session.add(parent_user)
        await session.flush()

        # Get or create parent role
        from sqlalchemy import select
        from app.models import Role, UserRole
        role_result = await session.execute(select(Role).where(Role.name == "parent"))
        role = (await session.scalars(select(Role).where(Role.name == "parent"))).first()
        if not role:
            role = Role(name="parent", description="Parent role", is_system=True)
            session.add(role)
            await session.flush()

        session.add(
            UserRole(user_id=parent_user.id, role_id=role.id)
        )

        # Create student profile
        student = StudentProfile(
            user_id=parent_user.id, display_name="Attempt Test Student",
            username=f"attemptstudent_{parent_user.id}",
            pin_hash=get_password_hash("1234"),
            is_active=True, preferred_language="en",
            current_stage_id=stages[0].id,
        )
        session.add(student)
        
        # Create parent profile
        parent_profile = ParentProfile(
            user_id=parent_user.id,
            full_name="Attempt Test Parent",
            phone_number="+15551234567",
        )
        session.add(parent_profile)
        
        await session.commit()

        # Debug: verify parent exists after commit
        verify_result = await session.execute(select(User).where(User.email == "attemptparent@example.com"))
        verified_parent = verify_result.scalar_one_or_none()
        print(f"[seeded_data] Parent verified after commit: {verified_parent is not None}")

        # Return all IDs needed by tests
        result = {
            "student_id": student.id,
            "user_id": parent_user.id,
            "activity_id": activity.id,
            "lesson_id": lesson.id,
            "topic_id": topic.id,
            "q1_id": q1.id,
            "q2_id": q2.id,
            "q1_correct_id": q1_correct.id,
            "q1_wrong_id": q1_wrong.id,
            "q2_correct_id": q2_correct.id,
        }
    
    await engine.dispose()
    yield result


@pytest.fixture(scope="function")
async def seeded_session(test_db_url):
    """Create an async session with pre-seeded reference data for adaptive learning tests.
    Includes learning stages, domains, subjects, topics, lessons, and activities.
    Uses the same test_db_url as seeded_data to share data.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import StaticPool
    
    engine = create_async_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        # Seed minimal reference data for adaptive learning tests
        from app.models import LearningStage, LearningDomain, Subject, Topic, Lesson, Activity, ActivityTypeEnum, ContentStatusEnum
        from sqlalchemy import select
        
        # Get existing learning stages (already seeded by test_db_url)
        stages_result = await session.execute(
            select(LearningStage).where(
                LearningStage.code.in_(["playgroup", "nursery", "lkg", "ukg"])
            )
        )
        stages = list(stages_result.scalars().all())
        
        # Create learning domain
        domain = LearningDomain(stage_id=stages[0].id, code="language", name="Language", description="Language arts", display_order=1, icon="abc", color="#FFB3BA", is_active=True)
        session.add(domain)
        await session.flush()
        
        # Create subject
        subject = Subject(stage_id=stages[0].id, domain_id=domain.id, code="english", name="English", display_order=1, icon="abc", color="#FFB3BA", is_active=True)
        session.add(subject)
        await session.flush()
        
        # Create topic
        topic = Topic(subject_id=subject.id, code="letters", name="Letters", display_order=1, is_active=True)
        session.add(topic)
        await session.flush()
        
        # Create lesson
        lesson = Lesson(topic_id=topic.id, code="lesson-001", status="published", version=1, is_active=True, display_order=1)
        session.add(lesson)
        await session.flush()
        
        # Create activities
        activity_a = Activity(lesson_id=lesson.id, type=ActivityTypeEnum.PICTURE_MATCHING, code="activity-a", status="published", version=1, display_order=1, is_active=True)
        activity_b = Activity(lesson_id=lesson.id, type=ActivityTypeEnum.SIMPLE_QUIZ, code="activity-b", status="published", version=1, display_order=2, is_active=True)
        session.add(activity_a)
        session.add(activity_b)
        await session.flush()
        
        # Create questions
        q1 = Question(activity_id=activity_a.id, question_type="single_choice", prompt="Question 1", display_order=1, points=10, is_active=True)
        q2 = Question(activity_id=activity_a.id, question_type="single_choice", prompt="Question 2", display_order=2, points=10, is_active=True)
        q3 = Question(activity_id=activity_a.id, question_type="single_choice", prompt="Question 3", display_order=3, points=10, is_active=True)
        session.add(q1)
        session.add(q2)
        session.add(q3)
        await session.flush()
        
        # Create answer options
        for q in [q1, q2, q3]:
            opt_correct = AnswerOption(question_id=q.id, text="Correct", is_correct=True, display_order=1)
            opt_wrong = AnswerOption(question_id=q.id, text="Wrong", is_correct=False, display_order=2)
            session.add(opt_correct)
            session.add(opt_wrong)
        
        await session.commit()
        
        yield session
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def test_session(test_db_url):
    """Create a test session using the pre-seeded test database."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import StaticPool
    
    engine = create_async_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def async_engine(test_db_url):
    """Create an async engine for tests to use."""
    engine = create_async_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    yield engine
    await engine.dispose()


@pytest.fixture(scope="function")
async def async_session_factory(async_engine):
    """Create an async session factory for tests."""
    return async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="function")
async def client(test_db_url):
    """Create a test client with overridden database dependency."""
    from app.main import create_app
    from app.core.database import get_db
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    
    app = create_app()
    
    async def override_get_db():
        # Create a new async engine and session for each request
        # test_db_url is already in the format sqlite+aiosqlite:///...
        async_db_url = test_db_url
        request_engine = create_async_engine(
            async_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        request_session = async_sessionmaker(request_engine, class_=AsyncSession, expire_on_commit=False)
        async with request_session() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await request_engine.dispose()
    
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    
    from httpx import AsyncClient, ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as ac:
        yield ac
    
    app.dependency_overrides.clear()