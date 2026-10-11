"""
Admin API endpoints.
"""
from datetime import datetime, timezone
from typing import List, Optional

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


@router.post("/lessons/{lesson_id}/publish")
async def admin_publish_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Publish a lesson."""
    await verify_admin(current_user)
    
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
    
    return {"message": "Lesson published"}


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