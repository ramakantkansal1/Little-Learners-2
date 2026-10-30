"""
Admin API endpoints.
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.models import (
    User, Role, UserRole, ParentProfile, StudentProfile,
    LearningStage, LearningDomain, Subject, Topic, LearningObjective,
    Lesson, Activity, Question, AnswerOption, StudentReward,
    ParentStudentRelationship, ParentNotification, AuditLog,
    ContentStatusEnum, ActivityTypeEnum, EnrollmentStatusEnum
)
from app.permissions.dependencies import get_current_user, require_permission
from app.permissions.roles import Permission, Role as RoleEnum
from app.core.security import get_password_hash
from app.services.curriculum_validation import (
    validate_lesson_for_publish,
    validate_activity_for_publish,
    LessonValidationResult
)

router = APIRouter(tags=["admin"])


# Response Models
class DashboardMetricsResponse(BaseModel):
    total_parents: int
    total_children: int
    active_accounts: int
    published_lessons: int
    total_activities: int
    activities_completed: int
    content_pending_review: int
    recent_registrations: int


class UserListResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: str
    last_login_at: Optional[str]
    parent_name: Optional[str] = None
    children_count: int = 0

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


class AdminStageResponse(BaseModel):
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


class AdminStageCreateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    min_age_months: int
    max_age_months: int
    display_order: int = 0
    icon: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)
    is_active: bool = True


class AdminStageUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    min_age_months: Optional[int] = None
    max_age_months: Optional[int] = None
    display_order: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)
    is_active: Optional[bool] = None


class AdminLessonListResponse(BaseModel):
    id: int
    code: str
    title: str
    subject_name: str
    stage_code: str
    status: str
    estimated_duration_minutes: Optional[int]
    display_order: int
    published_at: Optional[str]

    class Config:
        from_attributes = True


class AdminSubjectResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]
    stage_id: int
    domain_id: int
    display_order: int
    icon: Optional[str]
    color: Optional[str]
    is_active: bool
    stage_name: Optional[str] = None
    domain_name: Optional[str] = None

    class Config:
        from_attributes = True


class AdminSubjectCreateRequest(BaseModel):
    stage_id: int
    domain_id: int
    code: str = Field(..., min_length=1, max_length=30)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    display_order: int = 0
    icon: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)
    is_active: bool = True


class AdminSubjectUpdateRequest(BaseModel):
    stage_id: Optional[int] = None
    domain_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    display_order: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)
    is_active: Optional[bool] = None


class LessonTranslationRequest(BaseModel):
    language: str = Field(..., min_length=2, max_length=5)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    instructions: Optional[str] = None
    audio_url: Optional[str] = None


class AdminLessonCreateRequest(BaseModel):
    topic_id: int
    code: str = Field(..., min_length=1, max_length=50)
    status: str = Field(default="draft")
    version: int = 1
    estimated_duration_minutes: Optional[int] = None
    thumbnail_url: Optional[str] = None
    instructions: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    translations: Optional[List[LessonTranslationRequest]] = None


class AdminLessonUpdateRequest(BaseModel):
    topic_id: Optional[int] = None
    status: Optional[str] = None
    version: Optional[int] = None
    estimated_duration_minutes: Optional[int] = None
    thumbnail_url: Optional[str] = None
    instructions: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    translations: Optional[List[LessonTranslationRequest]] = None


class ActivityTranslationRequest(BaseModel):
    language: str = Field(..., min_length=2, max_length=5)
    title: str = Field(..., min_length=1, max_length=200)
    instructions: Optional[str] = None
    audio_url: Optional[str] = None


class AdminActivityCreateRequest(BaseModel):
    lesson_id: int
    type: str
    code: str = Field(..., min_length=1, max_length=50)
    status: str = Field(default="draft")
    version: int = 1
    display_order: int = 0
    estimated_duration_minutes: Optional[int] = None
    instructions: Optional[str] = None
    configuration: Optional[dict] = None
    is_active: bool = True
    translations: Optional[List[ActivityTranslationRequest]] = None


class AdminActivityUpdateRequest(BaseModel):
    lesson_id: Optional[int] = None
    type: Optional[str] = None
    status: Optional[str] = None
    version: Optional[int] = None
    display_order: Optional[int] = None
    estimated_duration_minutes: Optional[int] = None
    instructions: Optional[str] = None
    configuration: Optional[dict] = None
    is_active: Optional[bool] = None
    translations: Optional[List[ActivityTranslationRequest]] = None


class AdminActivityListResponse(BaseModel):
    id: int
    code: str
    type: str
    title: str
    lesson_title: str
    status: str
    display_order: int

    class Config:
        from_attributes = True


# Validation response models
class ValidationErrorDetail(BaseModel):
    field: str
    message: str
    code: str


class ValidationResultResponse(BaseModel):
    valid: bool
    errors: List[ValidationErrorDetail]
    warnings: List[ValidationErrorDetail]


class AnalyticsResponse(BaseModel):
    registrations_by_day: List[dict]
    lessons_completed_by_day: List[dict]
    active_users_by_day: List[dict]
    popular_activities: List[dict]
    average_session_time: float
    completion_rates_by_stage: List[dict]


# Helper
async def verify_admin(current_user):
    """Verify user has admin role."""
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if RoleEnum.ADMIN.value not in user_roles:
        raise HTTPException(status_code=403, detail="Admin access required")


# Endpoints
@router.get("/dashboard", response_model=DashboardMetricsResponse)
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get admin dashboard metrics."""
    await verify_admin(current_user)

    # Total parents
    parents_result = await db.execute(
        select(func.count(User.id))
        .join(UserRole, User.id == UserRole.user_id)
        .join(Role, UserRole.role_id == Role.id)
        .where(Role.name == "parent")
        .where(User.is_deleted == False)
    )
    total_parents = parents_result.scalar() or 0

    # Total children
    children_result = await db.execute(
        select(func.count(StudentProfile.id))
        .where(StudentProfile.is_deleted == False)
    )
    total_children = children_result.scalar() or 0

    # Active accounts
    active_result = await db.execute(
        select(func.count(User.id))
        .where(User.is_active == True)
        .where(User.is_deleted == False)
    )
    active_accounts = active_result.scalar() or 0

    # Published lessons
    lessons_result = await db.execute(
        select(func.count(Lesson.id))
        .where(Lesson.status == "published")
        .where(Lesson.is_active == True)
        .where(Lesson.deleted_at.is_(None))
    )
    published_lessons = lessons_result.scalar() or 0

    # Total activities
    activities_result = await db.execute(
        select(func.count(Activity.id))
        .where(Activity.is_active == True)
        .where(Activity.deleted_at.is_(None))
    )
    total_activities = activities_result.scalar() or 0

    # Activities completed
    completed_result = await db.execute(
        select(func.count(ActivityAttempt.id))
        .where(ActivityAttempt.status == "completed")
    )
    activities_completed = completed_result.scalar() or 0

    # Content pending review
    pending_result = await db.execute(
        select(func.count(Lesson.id))
        .where(Lesson.status == "review")
        .where(Lesson.is_active == True)
        .where(Lesson.deleted_at.is_(None))
    )
    content_pending_review = pending_result.scalar() or 0

    # Recent registrations (last 7 days)
    from datetime import timedelta
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_result = await db.execute(
        select(func.count(User.id))
        .where(User.created_at >= week_ago)
        .where(User.is_deleted == False)
    )
    recent_registrations = recent_result.scalar() or 0

    return DashboardMetricsResponse(
        total_parents=total_parents,
        total_children=total_children,
        active_accounts=active_accounts,
        published_lessons=published_lessons,
        total_activities=total_activities,
        activities_completed=activities_completed,
        content_pending_review=content_pending_review,
        recent_registrations=recent_registrations,
    )


@router.get("/users", response_model=List[UserListResponse])
async def list_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """List all users with optional filters."""
    await verify_admin(current_user)

    query = (
        select(User, Role)
        .join(UserRole, User.id == UserRole.user_id)
        .join(Role, UserRole.role_id == Role.id)
        .where(User.is_deleted == False)
        .order_by(User.created_at.desc())
    )

    if role:
        query = query.where(Role.name == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        query = query.where(User.email.ilike(f"%{search}%"))

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)

    users = []
    for user, role in result.all():
        # Get parent name if parent
        parent_name = None
        children_count = 0
        if role.name == "parent":
            parent_result = await db.execute(
                select(ParentProfile).where(ParentProfile.user_id == user.id)
            )
            parent = parent_result.scalar_one_or_none()
            if parent:
                parent_name = parent.full_name
                children_count = len([r for r in parent.student_relationships if not r.student.is_deleted])

        users.append(UserListResponse(
            id=user.id,
            email=user.email,
            role=role.name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at.isoformat(),
            last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
            parent_name=parent_name,
            children_count=children_count,
        ))

    return users


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update user status or role."""
    await verify_admin(current_user)

    user_result = await db.execute(
        select(User).where(User.id == user_id).where(User.is_deleted == False)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    if request.is_active is not None:
        user.is_active = request.is_active
        if not request.is_active:
            user.deleted_at = datetime.now(timezone.utc)

    if request.role is not None:
        # Remove existing roles
        await db.execute(
            UserRole.__table__.delete().where(UserRole.user_id == user_id)
        )

        # Add new role
        role_result = await db.execute(
            select(Role).where(Role.name == request.role)
        )
        role = role_result.scalar_one_or_none()
        if not role:
            raise ValidationException("Invalid role")

        user_role = UserRole(user_id=user_id, role_id=role.id)
        db.add(user_role)

    await db.commit()

    return {"message": "User updated successfully"}


@router.get("/stages", response_model=List[AdminStageResponse])
async def admin_list_stages(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """List all stages for admin management."""
    await verify_admin(current_user)

    result = await db.execute(
        select(LearningStage)
        .order_by(LearningStage.display_order)
    )
    return result.scalars().all()


@router.post("/stages", response_model=AdminStageResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_stage(
    request: AdminStageCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a new learning stage."""
    await verify_admin(current_user)

    # Check code uniqueness
    existing = await db.execute(
        select(LearningStage).where(LearningStage.code == request.code)
    )
    if existing.scalar_one_or_none():
        raise ValidationException("Stage code already exists")

    stage = LearningStage(
        code=request.code,
        name=request.name,
        description=request.description,
        min_age_months=request.min_age_months,
        max_age_months=request.max_age_months,
        display_order=request.display_order,
        icon=request.icon,
        color=request.color,
        is_active=request.is_active,
    )
    db.add(stage)
    await db.commit()
    await db.refresh(stage)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="learning_stage",
        resource_id=str(stage.id),
        resource_name=stage.name,
        new_values={"code": stage.code, "name": stage.name},
        success=True,
    )
    db.add(audit)
    await db.commit()

    return stage


@router.patch("/stages/{stage_id}", response_model=AdminStageResponse)
async def admin_update_stage(
    stage_id: int,
    request: AdminStageUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update a learning stage."""
    await verify_admin(current_user)

    result = await db.execute(
        select(LearningStage).where(LearningStage.id == stage_id)
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise NotFoundException("Stage not found")

    # Store old values for audit
    old_values = {
        "name": stage.name,
        "description": stage.description,
        "min_age_months": stage.min_age_months,
        "max_age_months": stage.max_age_months,
        "display_order": stage.display_order,
        "icon": stage.icon,
        "color": stage.color,
        "is_active": stage.is_active,
    }

    if request.name is not None:
        stage.name = request.name
    if request.description is not None:
        stage.description = request.description
    if request.min_age_months is not None:
        stage.min_age_months = request.min_age_months
    if request.max_age_months is not None:
        stage.max_age_months = request.max_age_months
    if request.display_order is not None:
        stage.display_order = request.display_order
    if request.icon is not None:
        stage.icon = request.icon
    if request.color is not None:
        stage.color = request.color
    if request.is_active is not None:
        stage.is_active = request.is_active

    await db.commit()
    await db.refresh(stage)

    # Audit log
    new_values = {
        "name": stage.name,
        "description": stage.description,
        "min_age_months": stage.min_age_months,
        "max_age_months": stage.max_age_months,
        "display_order": stage.display_order,
        "icon": stage.icon,
        "color": stage.color,
        "is_active": stage.is_active,
    }
    audit = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="learning_stage",
        resource_id=str(stage.id),
        resource_name=stage.name,
        old_values=old_values,
        new_values=new_values,
        success=True,
    )
    db.add(audit)
    await db.commit()

    return stage


@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_stage(
    stage_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Soft delete a learning stage."""
    await verify_admin(current_user)

    result = await db.execute(
        select(LearningStage).where(LearningStage.id == stage_id)
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise NotFoundException("Stage not found")

    stage.is_active = False
    stage.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="learning_stage",
        resource_id=str(stage.id),
        resource_name=stage.name,
        success=True,
    )
    db.add(audit)
    await db.commit()


@router.get("/lessons", response_model=List[AdminLessonListResponse])
async def admin_list_lessons(
    stage_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """List lessons for admin management."""
    await verify_admin(current_user)

    from app.models import LessonTranslation, Topic, Subject

    query = (
        select(Lesson, Topic, Subject, LessonTranslation)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .outerjoin(
            LessonTranslation,
            and_(
                LessonTranslation.lesson_id == Lesson.id,
                LessonTranslation.language == 'en'
            )
        )
        .where(Lesson.deleted_at.is_(None))
        .order_by(Subject.display_order, Topic.display_order, Lesson.display_order)
    )

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
        lessons.append(AdminLessonListResponse(
            id=lesson.id,
            code=lesson.code,
            title=translation.title if translation else lesson.code,
            subject_name=subject.name,
            stage_code=subject.stage.code if hasattr(subject, 'stage') else "",
            status=lesson.status,
            estimated_duration_minutes=lesson.estimated_duration_minutes,
            display_order=lesson.display_order,
            published_at=lesson.published_at.isoformat() if lesson.published_at else None,
        ))

    return lessons


@router.post("/lessons/{lesson_id}/publish", response_model=ValidationResultResponse)
async def admin_publish_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Publish a lesson after validation."""
    await verify_admin(current_user)

    # Validate lesson before publishing
    validation_result = await validate_lesson_for_publish(db, lesson_id)

    if not validation_result.valid:
        # Log failed publish attempt
        audit = AuditLog(
            user_id=current_user.id,
            action="content_publish_failed",
            resource_type="lesson",
            resource_id=str(lesson_id),
            resource_name="",
            success=False,
            error_message=f"Validation failed: {len(validation_result.errors)} errors",
        )
        db.add(audit)
        await db.commit()

        raise ValidationException("Lesson validation failed", details=validation_result.errors)

    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")

    lesson.status = ContentStatusEnum.PUBLISHED
    lesson.published_at = datetime.now(timezone.utc)
    lesson.published_by = current_user.id
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="content_publish",
        resource_type="lesson",
        resource_id=str(lesson.id),
        resource_name=lesson.code,
        success=True,
    )
    db.add(audit)
    await db.commit()

    return validation_result.to_dict()


@router.get("/lessons/{lesson_id}/validate", response_model=ValidationResultResponse)
async def admin_validate_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Validate a lesson without publishing."""
    await verify_admin(current_user)

    validation_result = await validate_lesson_for_publish(db, lesson_id)
    return validation_result.to_dict()


@router.post("/lessons/{lesson_id}/unpublish")
async def admin_unpublish_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Unpublish a lesson."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")

    lesson.status = ContentStatusEnum.DRAFT
    lesson.published_at = None
    lesson.published_by = None
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="content_unpublish",
        resource_type="lesson",
        resource_id=str(lesson.id),
        resource_name=lesson.code,
        success=True,
    )
    db.add(audit)
    await db.commit()

    return {"message": "Lesson unpublished"}


@router.post("/lessons/{lesson_id}/archive")
async def admin_archive_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Archive a lesson (soft delete with history preservation)."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")

    # Only allow archiving published or draft lessons
    if lesson.status == ContentStatusEnum.ARCHIVED:
        raise ValidationException("Lesson is already archived")

    lesson.status = ContentStatusEnum.ARCHIVED
    lesson.is_active = False
    lesson.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="content_archive",
        resource_type="lesson",
        resource_id=str(lesson.id),
        resource_name=lesson.code,
        success=True,
    )
    db.add(audit)
    await db.commit()

    return {"message": "Lesson archived"}


@router.post("/activities/{activity_id}/validate", response_model=ValidationResultResponse)
async def admin_validate_activity(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Validate an activity without publishing."""
    await verify_admin(current_user)

    validation_result = await validate_activity_for_publish(db, activity_id)
    return validation_result.to_dict()


# ===========================================
# Subject CRUD Endpoints
# ===========================================

@router.get("/subjects", response_model=List[AdminSubjectResponse])
async def admin_list_subjects(
    stage_id: Optional[int] = Query(None),
    domain_id: Optional[int] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """List subjects for admin management."""
    await verify_admin(current_user)

    from app.models import LearningDomain, LearningStage

    query = (
        select(Subject, LearningDomain, LearningStage)
        .join(LearningDomain, Subject.domain_id == LearningDomain.id)
        .join(LearningStage, Subject.stage_id == LearningStage.id)
        .where(Subject.deleted_at.is_(None))
        .order_by(LearningStage.display_order, LearningDomain.display_order, Subject.display_order)
    )

    if stage_id:
        query = query.where(Subject.stage_id == stage_id)
    if domain_id:
        query = query.where(Subject.domain_id == domain_id)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)

    subjects = []
    for subject, domain, stage in result.all():
        subjects.append(AdminSubjectResponse(
            id=subject.id,
            code=subject.code,
            name=subject.name,
            description=subject.description,
            stage_id=subject.stage_id,
            domain_id=subject.domain_id,
            display_order=subject.display_order,
            icon=subject.icon,
            color=subject.color,
            is_active=subject.is_active,
            stage_name=stage.name,
            domain_name=domain.name,
        ))

    return subjects


@router.post("/subjects", response_model=AdminSubjectResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_subject(
    request: AdminSubjectCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a new subject."""
    await verify_admin(current_user)

    # Check code uniqueness within stage and domain
    existing = await db.execute(
        select(Subject).where(
            Subject.stage_id == request.stage_id,
            Subject.domain_id == request.domain_id,
            Subject.code == request.code
        )
    )
    if existing.scalar_one_or_none():
        raise ValidationException("Subject code already exists in this stage and domain")

    subject = Subject(
        stage_id=request.stage_id,
        domain_id=request.domain_id,
        code=request.code,
        name=request.name,
        description=request.description,
        display_order=request.display_order,
        icon=request.icon,
        color=request.color,
        is_active=request.is_active,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="subject",
        resource_id=str(subject.id),
        resource_name=subject.name,
        new_values={"code": subject.code, "name": subject.name},
        success=True,
    )
    db.add(audit)
    await db.commit()

    return subject


@router.patch("/subjects/{subject_id}", response_model=AdminSubjectResponse)
async def admin_update_subject(
    subject_id: int,
    request: AdminSubjectUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update a subject."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        raise NotFoundException("Subject not found")

    # Store old values for audit
    old_values = {
        "name": subject.name,
        "description": subject.description,
        "stage_id": subject.stage_id,
        "domain_id": subject.domain_id,
        "display_order": subject.display_order,
        "icon": subject.icon,
        "color": subject.color,
        "is_active": subject.is_active,
    }

    if request.name is not None:
        subject.name = request.name
    if request.description is not None:
        subject.description = request.description
    if request.stage_id is not None:
        subject.stage_id = request.stage_id
    if request.domain_id is not None:
        subject.domain_id = request.domain_id
    if request.display_order is not None:
        subject.display_order = request.display_order
    if request.icon is not None:
        subject.icon = request.icon
    if request.color is not None:
        subject.color = request.color
    if request.is_active is not None:
        subject.is_active = request.is_active

    await db.commit()
    await db.refresh(subject)

    # Audit log
    new_values = {
        "name": subject.name,
        "description": subject.description,
        "stage_id": subject.stage_id,
        "domain_id": subject.domain_id,
        "display_order": subject.display_order,
        "icon": subject.icon,
        "color": subject.color,
        "is_active": subject.is_active,
    }
    audit = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="subject",
        resource_id=str(subject.id),
        resource_name=subject.name,
        old_values=old_values,
        new_values=new_values,
        success=True,
    )
    db.add(audit)
    await db.commit()

    return subject


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_subject(
    subject_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Soft delete a subject."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Subject).where(Subject.id == subject_id)
    )
    subject = result.scalar_one_or_none()
    if not subject:
        raise NotFoundException("Subject not found")

    subject.is_active = False
    subject.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="subject",
        resource_id=str(subject.id),
        resource_name=subject.name,
        success=True,
    )
    db.add(audit)
    await db.commit()


# ===========================================
# Lesson CRUD Endpoints
# ===========================================

@router.post("/lessons", response_model=AdminLessonListResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_lesson(
    request: AdminLessonCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a new lesson."""
    await verify_admin(current_user)

    # Check topic exists
    from app.models import Topic
    topic_result = await db.execute(
        select(Topic).where(Topic.id == request.topic_id)
    )
    topic = topic_result.scalar_one_or_none()
    if not topic:
        raise ValidationException("Topic not found")

    # Check code uniqueness within topic
    existing = await db.execute(
        select(Lesson).where(
            Lesson.topic_id == request.topic_id,
            Lesson.code == request.code
        )
    )
    if existing.scalar_one_or_none():
        raise ValidationException("Lesson code already exists in this topic")

    lesson = Lesson(
        topic_id=request.topic_id,
        code=request.code,
        status=request.status,
        version=request.version,
        estimated_duration_minutes=request.estimated_duration_minutes,
        thumbnail_url=request.thumbnail_url,
        instructions=request.instructions,
        display_order=request.display_order,
        is_active=request.is_active,
    )
    db.add(lesson)
    await db.flush()  # Get lesson.id before committing

    # Handle translations
    if request.translations:
        from app.models import LessonTranslation
        for trans in request.translations:
            lesson_translation = LessonTranslation(
                lesson_id=lesson.id,
                language=trans.language,
                title=trans.title,
                description=trans.description,
                instructions=trans.instructions,
                audio_url=trans.audio_url,
            )
            db.add(lesson_translation)

    await db.commit()
    await db.refresh(lesson)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="lesson",
        resource_id=str(lesson.id),
        resource_name=lesson.code,
        new_values={"code": lesson.code, "topic_id": lesson.topic_id},
        success=True,
    )
    db.add(audit)
    await db.commit()

    # Return with enriched data
    from app.models import LessonTranslation, Subject
    trans_result = await db.execute(
        select(LessonTranslation).where(
            LessonTranslation.lesson_id == lesson.id,
            LessonTranslation.language == 'en'
        )
    )
    translation = trans_result.scalar_one_or_none()

    return AdminLessonListResponse(
        id=lesson.id,
        code=lesson.code,
        title=translation.title if translation else lesson.code,
        subject_name=topic.subject.name if hasattr(topic, 'subject') else "",
        stage_code=topic.subject.stage.code if hasattr(topic, 'subject') and hasattr(topic.subject, 'stage') else "",
        status=lesson.status,
        estimated_duration_minutes=lesson.estimated_duration_minutes,
        display_order=lesson.display_order,
        published_at=lesson.published_at.isoformat() if lesson.published_at else None,
    )


@router.patch("/lessons/{lesson_id}", response_model=AdminLessonListResponse)
async def admin_update_lesson(
    lesson_id: int,
    request: AdminLessonUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update a lesson."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")

    # Store old values for audit
    old_values = {
        "status": lesson.status,
        "version": lesson.version,
        "estimated_duration_minutes": lesson.estimated_duration_minutes,
        "thumbnail_url": lesson.thumbnail_url,
        "instructions": lesson.instructions,
        "display_order": lesson.display_order,
        "is_active": lesson.is_active,
    }

    if request.topic_id is not None:
        # Verify topic exists
        from app.models import Topic
        topic_result = await db.execute(
            select(Topic).where(Topic.id == request.topic_id)
        )
        topic = topic_result.scalar_one_or_none()
        if not topic:
            raise ValidationException("Topic not found")
        lesson.topic_id = request.topic_id
    if request.status is not None:
        lesson.status = request.status
    if request.version is not None:
        lesson.version = request.version
    if request.estimated_duration_minutes is not None:
        lesson.estimated_duration_minutes = request.estimated_duration_minutes
    if request.thumbnail_url is not None:
        lesson.thumbnail_url = request.thumbnail_url
    if request.instructions is not None:
        lesson.instructions = request.instructions
    if request.display_order is not None:
        lesson.display_order = request.display_order
    if request.is_active is not None:
        lesson.is_active = request.is_active

    # Handle translations
    if request.translations is not None:
        from app.models import LessonTranslation
        # Delete existing translations and create new ones
        await db.execute(
            LessonTranslation.__table__.delete().where(LessonTranslation.lesson_id == lesson_id)
        )
        for trans in request.translations:
            lesson_translation = LessonTranslation(
                lesson_id=lesson.id,
                language=trans.language,
                title=trans.title,
                description=trans.description,
                instructions=trans.instructions,
                audio_url=trans.audio_url,
            )
            db.add(lesson_translation)

    await db.commit()
    await db.refresh(lesson)

    # Audit log
    new_values = {
        "status": lesson.status,
        "version": lesson.version,
        "estimated_duration_minutes": lesson.estimated_duration_minutes,
        "thumbnail_url": lesson.thumbnail_url,
        "instructions": lesson.instructions,
        "display_order": lesson.display_order,
        "is_active": lesson.is_active,
    }
    audit = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="lesson",
        resource_id=str(lesson.id),
        resource_name=lesson.code,
        old_values=old_values,
        new_values=new_values,
        success=True,
    )
    db.add(audit)
    await db.commit()

    # Return with enriched data
    from app.models import LessonTranslation, Topic, Subject
    trans_result = await db.execute(
        select(LessonTranslation).where(
            LessonTranslation.lesson_id == lesson.id,
            LessonTranslation.language == 'en'
        )
    )
    translation = trans_result.scalar_one_or_none()
    topic_result = await db.execute(
        select(Topic).where(Topic.id == lesson.topic_id)
    )
    topic = topic_result.scalar_one_or_none()

    return AdminLessonListResponse(
        id=lesson.id,
        code=lesson.code,
        title=translation.title if translation else lesson.code,
        subject_name=topic.subject.name if topic and hasattr(topic, 'subject') else "",
        stage_code=topic.subject.stage.code if topic and hasattr(topic, 'subject') and hasattr(topic.subject, 'stage') else "",
        status=lesson.status,
        estimated_duration_minutes=lesson.estimated_duration_minutes,
        display_order=lesson.display_order,
        published_at=lesson.published_at.isoformat() if lesson.published_at else None,
    )


# ===========================================
# Activity CRUD Endpoints
# ===========================================

@router.post("/activities", response_model=AdminActivityListResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_activity(
    request: AdminActivityCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Create a new activity."""
    await verify_admin(current_user)

    # Check lesson exists
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == request.lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise ValidationException("Lesson not found")

    # Validate activity type
    try:
        ActivityTypeEnum(request.type)
    except ValueError:
        raise ValidationException(f"Invalid activity type: {request.type}")

    # Check code uniqueness within lesson
    existing = await db.execute(
        select(Activity).where(
            Activity.lesson_id == request.lesson_id,
            Activity.code == request.code
        )
    )
    if existing.scalar_one_or_none():
        raise ValidationException("Activity code already exists in this lesson")

    activity = Activity(
        lesson_id=request.lesson_id,
        type=ActivityTypeEnum(request.type),
        code=request.code,
        status=ContentStatusEnum(request.status),
        version=request.version,
        display_order=request.display_order,
        estimated_duration_minutes=request.estimated_duration_minutes,
        instructions=request.instructions,
        configuration=request.configuration,
        is_active=request.is_active,
    )
    db.add(activity)
    await db.flush()  # Get activity.id before committing

    # Handle translations
    if request.translations:
        from app.models import ActivityTranslation
        for trans in request.translations:
            activity_translation = ActivityTranslation(
                activity_id=activity.id,
                language=trans.language,
                title=trans.title,
                instructions=trans.instructions,
                audio_url=trans.audio_url,
            )
            db.add(activity_translation)

    await db.commit()
    await db.refresh(activity)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create",
        resource_type="activity",
        resource_id=str(activity.id),
        resource_name=activity.code,
        new_values={"code": activity.code, "type": activity.type.value, "lesson_id": activity.lesson_id},
        success=True,
    )
    db.add(audit)
    await db.commit()

    # Return with enriched data
    from app.models import ActivityTranslation
    trans_result = await db.execute(
        select(ActivityTranslation).where(
            ActivityTranslation.activity_id == activity.id,
            ActivityTranslation.language == 'en'
        )
    )
    translation = trans_result.scalar_one_or_none()

    return AdminActivityListResponse(
        id=activity.id,
        code=activity.code,
        type=activity.type.value,
        title=translation.title if translation else activity.code,
        lesson_title=lesson.code,
        status=activity.status,
        display_order=activity.display_order,
    )


@router.patch("/activities/{activity_id}", response_model=AdminActivityListResponse)
async def admin_update_activity(
    activity_id: int,
    request: AdminActivityUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update an activity."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Activity).where(Activity.id == activity_id)
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundException("Activity not found")

    # Store old values for audit
    old_values = {
        "lesson_id": activity.lesson_id,
        "type": activity.type.value,
        "status": activity.status,
        "version": activity.version,
        "display_order": activity.display_order,
        "estimated_duration_minutes": activity.estimated_duration_minutes,
        "instructions": activity.instructions,
        "configuration": activity.configuration,
        "is_active": activity.is_active,
    }

    if request.lesson_id is not None:
        lesson_result = await db.execute(
            select(Lesson).where(Lesson.id == request.lesson_id)
        )
        lesson = lesson_result.scalar_one_or_none()
        if not lesson:
            raise ValidationException("Lesson not found")
        activity.lesson_id = request.lesson_id
    if request.type is not None:
        try:
            activity.type = ActivityTypeEnum(request.type)
        except ValueError:
            raise ValidationException(f"Invalid activity type: {request.type}")
    if request.status is not None:
        activity.status = ContentStatusEnum(request.status)
    if request.version is not None:
        activity.version = request.version
    if request.display_order is not None:
        activity.display_order = request.display_order
    if request.estimated_duration_minutes is not None:
        activity.estimated_duration_minutes = request.estimated_duration_minutes
    if request.instructions is not None:
        activity.instructions = request.instructions
    if request.configuration is not None:
        activity.configuration = request.configuration
    if request.is_active is not None:
        activity.is_active = request.is_active

    # Handle translations
    if request.translations is not None:
        from app.models import ActivityTranslation
        # Delete existing translations and create new ones
        await db.execute(
            ActivityTranslation.__table__.delete().where(ActivityTranslation.activity_id == activity_id)
        )
        for trans in request.translations:
            activity_translation = ActivityTranslation(
                activity_id=activity.id,
                language=trans.language,
                title=trans.title,
                instructions=trans.instructions,
                audio_url=trans.audio_url,
            )
            db.add(activity_translation)

    await db.commit()
    await db.refresh(activity)

    # Audit log
    new_values = {
        "lesson_id": activity.lesson_id,
        "type": activity.type.value,
        "status": activity.status,
        "version": activity.version,
        "display_order": activity.display_order,
        "estimated_duration_minutes": activity.estimated_duration_minutes,
        "instructions": activity.instructions,
        "configuration": activity.configuration,
        "is_active": activity.is_active,
    }
    audit = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="activity",
        resource_id=str(activity.id),
        resource_name=activity.code,
        old_values=old_values,
        new_values=new_values,
        success=True,
    )
    db.add(audit)
    await db.commit()

    # Return with enriched data
    from app.models import ActivityTranslation, Lesson
    trans_result = await db.execute(
        select(ActivityTranslation).where(
            ActivityTranslation.activity_id == activity.id,
            ActivityTranslation.language == 'en'
        )
    )
    translation = trans_result.scalar_one_or_none()
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == activity.lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()

    return AdminActivityListResponse(
        id=activity.id,
        code=activity.code,
        type=activity.type.value,
        title=translation.title if translation else activity.code,
        lesson_title=lesson.code if lesson else "",
        status=activity.status,
        display_order=activity.display_order,
    )


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_activity(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Soft delete an activity."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Activity).where(Activity.id == activity_id)
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundException("Activity not found")

    activity.is_active = False
    activity.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="delete",
        resource_type="activity",
        resource_id=str(activity.id),
        resource_name=activity.code,
        success=True,
    )
    db.add(audit)
    await db.commit()


@router.get("/activities", response_model=List[AdminActivityListResponse])
async def admin_list_activities(
    lesson_id: Optional[int] = Query(None),
    activity_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """List activities for admin management."""
    await verify_admin(current_user)

    from app.models import ActivityTranslation, Lesson

    query = (
        select(Activity, Lesson, ActivityTranslation)
        .join(Lesson, Activity.lesson_id == Lesson.id)
        .outerjoin(
            ActivityTranslation,
            and_(
                ActivityTranslation.activity_id == Activity.id,
                ActivityTranslation.language == 'en'
            )
        )
        .where(Activity.deleted_at.is_(None))
        .order_by(Lesson.display_order, Activity.display_order)
    )

    if status:
        query = query.where(Activity.status == status)
    if lesson_id:
        query = query.where(Activity.lesson_id == lesson_id)
    if activity_type:
        query = query.where(Activity.type == activity_type)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)

    activities = []
    for activity, lesson, translation in result.all():
        activities.append(AdminActivityListResponse(
            id=activity.id,
            code=activity.code,
            type=activity.type.value,
            title=translation.title if translation else activity.code,
            lesson_title=lesson.code,
            status=activity.status,
            display_order=activity.display_order,
        ))

    return activities


# ===========================================
# Activity Difficulty Tier Endpoints
# ===========================================

class ActivityDifficultyTierResponse(BaseModel):
    """Response model for activity difficulty tier."""
    activity_id: int
    difficulty_tier: Optional[int] = None  # 1=Easy, 2=Medium, 3=Hard, null=unset


class ActivityDifficultyTierUpdateRequest(BaseModel):
    """Request model for updating activity difficulty tier."""
    difficulty_tier: Optional[int] = Field(None, ge=1, le=3, description="Difficulty tier: 1=Easy, 2=Medium, 3=Hard, null to clear")


@router.get("/activities/{activity_id}/difficulty-tier", response_model=ActivityDifficultyTierResponse)
async def admin_get_activity_difficulty_tier(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get the difficulty tier for an activity."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Activity).where(Activity.id == activity_id)
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundException("Activity not found")

    difficulty_tier = None
    if activity.configuration and isinstance(activity.configuration, dict):
        difficulty_tier = activity.configuration.get("difficulty_tier")
        if difficulty_tier is not None:
            difficulty_tier = int(difficulty_tier)

    return ActivityDifficultyTierResponse(
        activity_id=activity.id,
        difficulty_tier=difficulty_tier,
    )


from sqlalchemy.orm.attributes import flag_modified

@router.patch("/activities/{activity_id}/difficulty-tier", response_model=ActivityDifficultyTierResponse)
async def admin_update_activity_difficulty_tier(
    activity_id: int,
    request: ActivityDifficultyTierUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Set or clear the difficulty tier for an activity."""
    await verify_admin(current_user)

    result = await db.execute(
        select(Activity).where(Activity.id == activity_id)
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundException("Activity not found")

    # Store old configuration for audit
    old_configuration = activity.configuration.copy() if activity.configuration else {}

    # Update configuration with difficulty tier (create new dict to ensure SQLAlchemy tracks changes)
    if activity.configuration is None:
        new_configuration = {}
    else:
        new_configuration = dict(activity.configuration)

    if request.difficulty_tier is None:
        # Clear the difficulty tier
        if "difficulty_tier" in new_configuration:
            del new_configuration["difficulty_tier"]
        # If configuration is now empty, set to None
        if not new_configuration:
            new_configuration = None
    else:
        # Set the difficulty tier
        new_configuration["difficulty_tier"] = request.difficulty_tier

    activity.configuration = new_configuration
    flag_modified(activity, "configuration")

    await db.commit()
    await db.refresh(activity)

    # Audit log
    new_configuration_for_audit = activity.configuration.copy() if activity.configuration else {}
    audit = AuditLog(
        user_id=current_user.id,
        action="update",
        resource_type="activity_difficulty_tier",
        resource_id=str(activity.id),
        resource_name=activity.code,
        old_values={"configuration": old_configuration},
        new_values={"configuration": new_configuration_for_audit},
        success=True,
    )
    db.add(audit)
    await db.commit()

    # Return updated tier
    difficulty_tier = None
    if activity.configuration and isinstance(activity.configuration, dict):
        difficulty_tier = activity.configuration.get("difficulty_tier")
        if difficulty_tier is not None:
            difficulty_tier = int(difficulty_tier)

    return ActivityDifficultyTierResponse(
        activity_id=activity.id,
        difficulty_tier=difficulty_tier,
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def admin_get_analytics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get platform analytics."""
    await verify_admin(current_user)

    from datetime import timedelta
    from_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Registrations by day
    reg_result = await db.execute(
        select(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        )
        .where(User.created_at >= from_date)
        .where(User.is_deleted == False)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )
    registrations_by_day = [
        {"date": row.date.isoformat(), "count": row.count}
        for row in reg_result.all()
    ]

    # Lessons completed by day
    lesson_result = await db.execute(
        select(
            func.date(StudentLessonProgress.completed_at).label('date'),
            func.count(StudentLessonProgress.id).label('count')
        )
        .where(StudentLessonProgress.completed_at >= from_date)
        .where(StudentLessonProgress.status == "completed")
        .group_by(func.date(StudentLessonProgress.completed_at))
        .order_by(func.date(StudentLessonProgress.completed_at))
    )
    lessons_completed_by_day = [
        {"date": row.date.isoformat(), "count": row.count}
        for row in lesson_result.all()
    ]

    # Active users by day (users with activity attempts)
    active_result = await db.execute(
        select(
            func.date(ActivityAttempt.started_at).label('date'),
            func.count(func.distinct(ActivityAttempt.student_id)).label('count')
        )
        .where(ActivityAttempt.started_at >= from_date)
        .group_by(func.date(ActivityAttempt.started_at))
        .order_by(func.date(ActivityAttempt.started_at))
    )
    active_users_by_day = [
        {"date": row.date.isoformat(), "count": row.count}
        for row in active_result.all()
    ]

    # Popular activities
    popular_result = await db.execute(
        select(
            Activity.code,
            Activity.type,
            func.count(ActivityAttempt.id).label('attempts')
        )
        .join(ActivityAttempt, Activity.id == ActivityAttempt.activity_id)
        .where(ActivityAttempt.started_at >= from_date)
        .group_by(Activity.id, Activity.code, Activity.type)
        .order_by(func.count(ActivityAttempt.id).desc())
        .limit(10)
    )
    popular_activities = [
        {"activity_code": row.code, "type": row.type.value, "attempts": row.attempts}
        for row in popular_result.all()
    ]

    # Average session time
    time_result = await db.execute(
        select(func.avg(ActivityAttempt.time_spent_seconds))
        .where(ActivityAttempt.started_at >= from_date)
        .where(ActivityAttempt.status == "completed")
    )
    avg_time = time_result.scalar() or 0

    # Completion rates by stage
    completion_result = await db.execute(
        select(
            LearningStage.code,
            LearningStage.name,
            func.count(StudentLessonProgress.id).filter(StudentLessonProgress.status == "completed").label('completed'),
            func.count(StudentLessonProgress.id).label('total')
        )
        .join(Subject, Subject.stage_id == LearningStage.id)
        .join(Topic, Topic.subject_id == Subject.id)
        .join(Lesson, Lesson.topic_id == Topic.id)
        .join(StudentLessonProgress, StudentLessonProgress.lesson_id == Lesson.id)
        .where(StudentLessonProgress.deleted_at.is_(None))
        .group_by(LearningStage.id, LearningStage.code, LearningStage.name)
    )
    completion_rates_by_stage = [
        {
            "stage_code": row.code,
            "stage_name": row.name,
            "completed": row.completed,
            "total": row.total,
            "rate": round(row.completed / row.total * 100, 1) if row.total > 0 else 0
        }
        for row in completion_result.all()
    ]

    return AnalyticsResponse(
        registrations_by_day=registrations_by_day,
        lessons_completed_by_day=lessons_completed_by_day,
        active_users_by_day=active_users_by_day,
        popular_activities=popular_activities,
        average_session_time=round(avg_time / 60, 1),  # minutes
        completion_rates_by_stage=completion_rates_by_stage,
    )


@router.get("/audit-logs")
async def admin_get_audit_logs(
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get audit logs with filters."""
    await verify_admin(current_user)

    query = (
        select(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
    )

    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.where(AuditLog.created_at >= start)
        except ValueError:
            raise ValidationException("Invalid start_date format")
    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.where(AuditLog.created_at <= end)
        except ValueError:
            raise ValidationException("Invalid end_date format")

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)

    logs = []
    for log, user in result.all():
        logs.append({
            "id": log.id,
            "created_at": log.created_at.isoformat(),
            "user_id": log.user_id,
            "user_email": user.email if user else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "resource_name": log.resource_name,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "success": log.success,
            "error_message": log.error_message,
        })

    return {"logs": logs}