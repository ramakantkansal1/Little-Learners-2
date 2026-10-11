"""
Curriculum API endpoints.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.models import (
    LearningStage, LearningDomain, Subject, Topic, LearningObjective,
    Lesson, LessonTranslation, Activity, ActivityTranslation,
    Question, QuestionTranslation, AnswerOption, AnswerOptionTranslation,
    ContentStatusEnum
)
from app.permissions.dependencies import get_current_user, require_permission
from app.permissions.roles import Permission

router = APIRouter(tags=["curriculum"])


# Response Models
class StageResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]
    min_age_months: int
    max_age_months: int
    display_order: int
    icon: Optional[str]
    color: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class DomainResponse(BaseModel):
    id: int
    stage_id: int
    code: str
    name: str
    description: Optional[str]
    display_order: int
    icon: Optional[str]
    color: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class SubjectResponse(BaseModel):
    id: int
    stage_id: int
    domain_id: int
    code: str
    name: str
    description: Optional[str]
    display_order: int
    icon: Optional[str]
    color: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class TopicResponse(BaseModel):
    id: int
    subject_id: int
    code: str
    name: str
    description: Optional[str]
    display_order: int
    estimated_duration_minutes: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


class ObjectiveResponse(BaseModel):
    id: int
    topic_id: int
    code: str
    description: str
    display_order: int
    is_assessable: bool
    is_active: bool

    class Config:
        from_attributes = True


class LessonResponse(BaseModel):
    id: int
    topic_id: int
    code: str
    status: str
    version: int
    estimated_duration_minutes: Optional[int]
    thumbnail_url: Optional[str]
    instructions: Optional[str]
    display_order: int
    published_at: Optional[str]
    is_active: bool
    title: Optional[str] = None
    description: Optional[str] = None
    translated_instructions: Optional[str] = None

    class Config:
        from_attributes = True


class ActivityResponse(BaseModel):
    id: int
    lesson_id: int
    type: str
    code: str
    status: str
    version: int
    display_order: int
    estimated_duration_minutes: Optional[int]
    instructions: Optional[str]
    configuration: Optional[dict]
    is_active: bool
    title: Optional[str] = None
    translated_instructions: Optional[str] = None

    class Config:
        from_attributes = True


# Helper to get translation
async def get_lesson_translation(db: AsyncSession, lesson_id: int, language: str):
    from app.models import LessonTranslation
    result = await db.execute(
        select(LessonTranslation)
        .where(LessonTranslation.lesson_id == lesson_id)
        .where(LessonTranslation.language == language)
    )
    return result.scalar_one_or_none()


async def get_activity_translation(db: AsyncSession, activity_id: int, language: str):
    from app.models import ActivityTranslation
    result = await db.execute(
        select(ActivityTranslation)
        .where(ActivityTranslation.activity_id == activity_id)
        .where(ActivityTranslation.language == language)
    )
    return result.scalar_one_or_none()


# Endpoints
@router.get("/stages", response_model=List[StageResponse])
async def list_stages(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List all learning stages."""
    query = select(LearningStage).order_by(LearningStage.display_order)
    if active_only:
        query = query.where(LearningStage.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stages/{stage_id}", response_model=StageResponse)
async def get_stage(
    stage_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific learning stage."""
    result = await db.execute(
        select(LearningStage).where(LearningStage.id == stage_id)
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise NotFoundException("Stage not found")
    return stage


@router.get("/stages/{stage_id}/domains", response_model=List[DomainResponse])
async def list_domains_for_stage(
    stage_id: int,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List domains for a stage."""
    query = select(LearningDomain).where(LearningDomain.stage_id == stage_id).order_by(LearningDomain.display_order)
    if active_only:
        query = query.where(LearningDomain.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/domains", response_model=List[DomainResponse])
async def list_domains(
    stage_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List domains with optional stage filter."""
    query = select(LearningDomain).order_by(LearningDomain.stage_id, LearningDomain.display_order)
    if active_only:
        query = query.where(LearningDomain.is_active == True)
    if stage_id:
        query = query.where(LearningDomain.stage_id == stage_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/subjects", response_model=List[SubjectResponse])
async def list_subjects(
    stage_id: Optional[int] = Query(None),
    domain_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List subjects with optional filters."""
    query = select(Subject).order_by(Subject.stage_id, Subject.domain_id, Subject.display_order)
    if active_only:
        query = query.where(Subject.is_active == True)
    if stage_id:
        query = query.where(Subject.stage_id == stage_id)
    if domain_id:
        query = query.where(Subject.domain_id == domain_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/topics", response_model=List[TopicResponse])
async def list_topics(
    subject_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List topics with optional subject filter."""
    query = select(Topic).order_by(Topic.subject_id, Topic.display_order)
    if active_only:
        query = query.where(Topic.is_active == True)
    if subject_id:
        query = query.where(Topic.subject_id == subject_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/objectives", response_model=List[ObjectiveResponse])
async def list_objectives(
    topic_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List learning objectives with optional topic filter."""
    query = select(LearningObjective).order_by(LearningObjective.topic_id, LearningObjective.display_order)
    if active_only:
        query = query.where(LearningObjective.is_active == True)
    if topic_id:
        query = query.where(LearningObjective.topic_id == topic_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/lessons", response_model=List[LessonResponse])
async def list_lessons(
    stage_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    topic_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    language: str = Query("en"),
    active_only: bool = Query(True),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List lessons with filters and translations."""
    from app.models import LessonTranslation, Topic, Subject
    
    query = (
        select(Lesson, Topic, Subject, LessonTranslation)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .outerjoin(
            LessonTranslation,
            and_(
                LessonTranslation.lesson_id == Lesson.id,
                LessonTranslation.language == language
            )
        )
        .order_by(Subject.display_order, Topic.display_order, Lesson.display_order)
    )
    
    if active_only:
        query = query.where(Lesson.is_active == True)
    if status:
        query = query.where(Lesson.status == status)
    if topic_id:
        query = query.where(Lesson.topic_id == topic_id)
    elif subject_id:
        query = query.where(Topic.subject_id == subject_id)
    elif stage_id:
        query = query.where(Subject.stage_id == stage_id)
    
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    
    lessons = []
    for lesson, topic, subject, translation in result.all():
        lessons.append(LessonResponse(
            id=lesson.id,
            topic_id=lesson.topic_id,
            code=lesson.code,
            status=lesson.status,
            version=lesson.version,
            estimated_duration_minutes=lesson.estimated_duration_minutes,
            thumbnail_url=lesson.thumbnail_url,
            instructions=lesson.instructions,
            display_order=lesson.display_order,
            published_at=lesson.published_at.isoformat() if lesson.published_at else None,
            is_active=lesson.is_active,
            title=translation.title if translation else lesson.code,
            description=translation.description if translation else None,
            translated_instructions=translation.instructions if translation else lesson.instructions,
        ))
    
    return lessons


@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: int,
    language: str = Query("en"),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific lesson with translation."""
    from app.models import LessonTranslation, Topic, Subject
    
    result = await db.execute(
        select(Lesson, Topic, Subject, LessonTranslation)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .outerjoin(
            LessonTranslation,
            and_(
                LessonTranslation.lesson_id == Lesson.id,
                LessonTranslation.language == language
            )
        )
        .where(Lesson.id == lesson_id)
    )
    row = result.first()
    if not row:
        raise NotFoundException("Lesson not found")
    
    lesson, topic, subject, translation = row
    return LessonResponse(
        id=lesson.id,
        topic_id=lesson.topic_id,
        code=lesson.code,
        status=lesson.status,
        version=lesson.version,
        estimated_duration_minutes=lesson.estimated_duration_minutes,
        thumbnail_url=lesson.thumbnail_url,
        instructions=lesson.instructions,
        display_order=lesson.display_order,
        published_at=lesson.published_at.isoformat() if lesson.published_at else None,
        is_active=lesson.is_active,
        title=translation.title if translation else lesson.code,
        description=translation.description if translation else None,
        translated_instructions=translation.instructions if translation else lesson.instructions,
    )


@router.get("/lessons/{lesson_id}/activities", response_model=List[ActivityResponse])
async def list_lesson_activities(
    lesson_id: int,
    language: str = Query("en"),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List activities for a lesson with translations."""
    from app.models import ActivityTranslation
    
    # Verify lesson exists
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")
    
    query = (
        select(Activity, ActivityTranslation)
        .outerjoin(
            ActivityTranslation,
            and_(
                ActivityTranslation.activity_id == Activity.id,
                ActivityTranslation.language == language
            )
        )
        .where(Activity.lesson_id == lesson_id)
        .order_by(Activity.display_order)
    )
    
    if active_only:
        query = query.where(Activity.is_active == True)
    
    result = await db.execute(query)
    
    activities = []
    for activity, translation in result.all():
        activities.append(ActivityResponse(
            id=activity.id,
            lesson_id=activity.lesson_id,
            type=activity.type.value,
            code=activity.code,
            status=activity.status,
            version=activity.version,
            display_order=activity.display_order,
            estimated_duration_minutes=activity.estimated_duration_minutes,
            instructions=activity.instructions,
            configuration=activity.configuration,
            is_active=activity.is_active,
            title=translation.title if translation else activity.code,
            translated_instructions=translation.instructions if translation else activity.instructions,
        ))
    
    return activities


@router.get("/activities", response_model=List[ActivityResponse])
async def list_activities(
    lesson_id: Optional[int] = Query(None),
    activity_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    language: str = Query("en"),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """List activities with filters."""
    from app.models import ActivityTranslation
    
    query = (
        select(Activity, ActivityTranslation)
        .outerjoin(
            ActivityTranslation,
            and_(
                ActivityTranslation.activity_id == Activity.id,
                ActivityTranslation.language == language
            )
        )
        .order_by(Activity.lesson_id, Activity.display_order)
    )
    
    if active_only:
        query = query.where(Activity.is_active == True)
    if lesson_id:
        query = query.where(Activity.lesson_id == lesson_id)
    if activity_type:
        query = query.where(Activity.type == activity_type)
    if status:
        query = query.where(Activity.status == status)
    
    result = await db.execute(query)
    
    activities = []
    for activity, translation in result.all():
        activities.append(ActivityResponse(
            id=activity.id,
            lesson_id=activity.lesson_id,
            type=activity.type.value,
            code=activity.code,
            status=activity.status,
            version=activity.version,
            display_order=activity.display_order,
            estimated_duration_minutes=activity.estimated_duration_minutes,
            instructions=activity.instructions,
            configuration=activity.configuration,
            is_active=activity.is_active,
            title=translation.title if translation else activity.code,
            translated_instructions=translation.instructions if translation else activity.instructions,
        ))
    
    return activities


@router.get("/activities/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: int,
    language: str = Query("en"),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific activity with translation."""
    from app.models import ActivityTranslation
    
    result = await db.execute(
        select(Activity, ActivityTranslation)
        .outerjoin(
            ActivityTranslation,
            and_(
                ActivityTranslation.activity_id == Activity.id,
                ActivityTranslation.language == language
            )
        )
        .where(Activity.id == activity_id)
    )
    row = result.first()
    if not row:
        raise NotFoundException("Activity not found")
    
    activity, translation = row
    return ActivityResponse(
        id=activity.id,
        lesson_id=activity.lesson_id,
        type=activity.type.value,
        code=activity.code,
        status=activity.status,
        version=activity.version,
        display_order=activity.display_order,
        estimated_duration_minutes=activity.estimated_duration_minutes,
        instructions=activity.instructions,
        configuration=activity.configuration,
        is_active=activity.is_active,
        title=translation.title if translation else activity.code,
        translated_instructions=translation.instructions if translation else activity.instructions,
    )