"""
Parent API endpoints.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException, ConflictException
from app.models import User, ParentProfile, StudentProfile, ParentStudentRelationship, UserPreference
from app.permissions.dependencies import get_current_user, require_permission
from app.permissions.roles import Permission

router = APIRouter(tags=["parents"])


# Request/Response Models
class ChildCreateRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: Optional[str] = None  # ISO format date
    gender: Optional[str] = None
    avatar_type: Optional[str] = Field(None, max_length=50)
    current_stage_id: Optional[int] = None
    preferred_language: str = Field("en", max_length=10)
    pin: Optional[str] = Field(None, min_length=4, max_length=6, pattern=r"^\d+$")


class ChildUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    avatar_type: Optional[str] = Field(None, max_length=50)
    current_stage_id: Optional[int] = None
    preferred_language: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None
    pin: Optional[str] = Field(None, min_length=4, max_length=6, pattern=r"^\d+$")


class ChildResponse(BaseModel):
    id: int
    display_name: str
    date_of_birth: Optional[str]
    gender: Optional[str]
    avatar_type: Optional[str]
    current_stage_id: Optional[int]
    current_stage_code: Optional[str]
    current_stage_name: Optional[str]
    preferred_language: str
    audio_enabled: bool
    reduced_motion: bool
    high_contrast: bool
    is_active: bool
    progress_percentage: int
    last_activity_at: Optional[str]

    class Config:
        from_attributes = True


class ParentProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone_number: Optional[str]
    phone_verified: bool
    children: List[ChildResponse]

    class Config:
        from_attributes = True


class ChildProgressResponse(BaseModel):
    child_id: int
    child_name: str
    stage_code: str
    stage_name: str
    total_lessons: int
    completed_lessons: int
    in_progress_lessons: int
    total_activities: int
    completed_activities: int
    total_time_spent_minutes: int
    average_score: Optional[float]
    rewards_earned: int
    recent_activity: List[dict]

    class Config:
        from_attributes = True


# Helper functions
async def get_parent_profile(db: AsyncSession, user_id: int) -> ParentProfile:
    """Get parent profile for current user."""
    result = await db.execute(
        select(ParentProfile)
        .where(ParentProfile.user_id == user_id)
        .options(selectinload(ParentProfile.student_relationships)
                 .selectinload(ParentStudentRelationship.student)
                 .selectinload(StudentProfile.current_stage))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundException("Parent profile not found")
    return profile


async def calculate_child_progress(student: StudentProfile, db: AsyncSession) -> int:
    """Calculate overall progress percentage for a child."""
    # Get all published lessons for child's stage
    if not student.current_stage_id:
        return 0
    
    from app.models import Lesson, StudentLessonProgress, Topic, Subject
    from sqlalchemy import select, func
    
    # Total published lessons in stage
    total_result = await db.execute(
        select(func.count(Lesson.id))
        .where(Lesson.topic.has(
            select(Topic.subject_id).where(Subject.stage_id == student.current_stage_id).exists()
        ))
        .where(Lesson.status == "published")
        .where(Lesson.is_active == True)
    )
    total_lessons = int(total_result.scalar() or 0)
    
    if total_lessons == 0:
        return 0
    
    # Completed lessons
    completed_result = await db.execute(
        select(func.count(StudentLessonProgress.id))
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.status == "completed")
    )
    completed = int(completed_result.scalar() or 0)
    
    # Ensure integer result
    if total_lessons > 0:
        progress = (completed / total_lessons) * 100
        result = int(progress)
        print(f"DEBUG: calculate_child_progress: completed={completed}, total_lessons={total_lessons}, progress={progress}, result={result}, type={type(result)}")
        return result
    return 0


# Endpoints
@router.get("/me", response_model=ParentProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current parent profile with children."""
    # Verify parent role
    parent_roles = [ur.role.name for ur in current_user.user_roles]
    if "parent" not in parent_roles and "admin" not in parent_roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    profile = await get_parent_profile(db, current_user.id)
    
    # Build children response with progress
    children_response = []
    for rel in profile.student_relationships:
        if not rel.student.is_deleted and rel.student.is_active:
            progress = await calculate_child_progress(rel.student, db)
            stage = rel.student.current_stage
            children_response.append(ChildResponse(
                id=rel.student.id,
                display_name=rel.student.display_name,
                date_of_birth=rel.student.date_of_birth.isoformat() if rel.student.date_of_birth else None,
                gender=rel.student.gender.value if rel.student.gender else None,
                avatar_type=rel.student.avatar_type,
                current_stage_id=rel.student.current_stage_id,
                current_stage_code=stage.code if stage else None,
                current_stage_name=stage.name if stage else None,
                preferred_language=rel.student.preferred_language,
                audio_enabled=rel.student.audio_enabled,
                reduced_motion=rel.student.reduced_motion,
                high_contrast=rel.student.high_contrast,
                is_active=rel.student.is_active,
                progress_percentage=progress,
                last_activity_at=rel.student.last_activity_at.isoformat() if rel.student.last_activity_at else None,
            ))
    
    return ParentProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.full_name,
        email=current_user.email,
        phone_number=profile.phone_number,
        phone_verified=profile.phone_verified,
        children=children_response,
    )


@router.get("/me/children", response_model=List[ChildResponse])
async def list_my_children(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all children for current parent."""
    profile = await get_parent_profile(db, current_user.id)
    
    children_response = []
    for rel in profile.student_relationships:
        if not rel.student.is_deleted:
            progress = await calculate_child_progress(rel.student, db)
            stage = rel.student.current_stage
            children_response.append(ChildResponse(
                id=rel.student.id,
                display_name=rel.student.display_name,
                date_of_birth=rel.student.date_of_birth.isoformat() if rel.student.date_of_birth else None,
                gender=rel.student.gender.value if rel.student.gender else None,
                avatar_type=rel.student.avatar_type,
                current_stage_id=rel.student.current_stage_id,
                current_stage_code=stage.code if stage else None,
                current_stage_name=stage.name if stage else None,
                preferred_language=rel.student.preferred_language,
                audio_enabled=rel.student.audio_enabled,
                reduced_motion=rel.student.reduced_motion,
                high_contrast=rel.student.high_contrast,
                is_active=rel.student.is_active,
                progress_percentage=progress,
                last_activity_at=rel.student.last_activity_at.isoformat() if rel.student.last_activity_at else None,
            ))
    
    return children_response


@router.post("/me/children", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
async def create_child(
    request: ChildCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new child profile."""
    profile = await get_parent_profile(db, current_user.id)
    
    # Validate stage if provided
    if request.current_stage_id:
        from app.models import LearningStage
        stage_result = await db.execute(
            select(LearningStage).where(LearningStage.id == request.current_stage_id)
        )
        stage = stage_result.scalar_one_or_none()
        if not stage or not stage.is_active:
            raise ValidationException("Invalid learning stage")
    
    # Hash PIN if provided
    from app.core.security import get_password_hash
    pin_hash = get_password_hash(request.pin) if request.pin else None
    
    # Parse date of birth
    dob = None
    if request.date_of_birth:
        try:
            from datetime import date
            dob = date.fromisoformat(request.date_of_birth)
        except ValueError:
            raise ValidationException("Invalid date format. Use YYYY-MM-DD")
    
    # Create student user
    student_user = User(
        email=f"student_{request.display_name.lower().replace(' ', '_')}_{profile.id}@hll.local",
        password_hash="",  # Students don't use password login
        is_active=True,
        is_verified=True,
    )
    db.add(student_user)
    await db.flush()
    
    # Create student profile
    from app.models import GenderEnum
    gender = None
    if request.gender:
        try:
            gender = GenderEnum(request.gender)
        except ValueError:
            pass
    
    student = StudentProfile(
        user_id=student_user.id,
        display_name=request.display_name,
        date_of_birth=dob,
        gender=gender,
        avatar_type=request.avatar_type or "elephant",
        pin_hash=pin_hash,
        current_stage_id=request.current_stage_id,
        preferred_language=request.preferred_language,
        audio_enabled=True,
    )
    db.add(student)
    await db.flush()
    
    # Create parent-student relationship
    relationship = ParentStudentRelationship(
        parent_id=profile.id,
        student_id=student.id,
        relationship_type="parent",
        is_primary=len(profile.student_relationships) == 0,  # First child is primary
        can_manage_profile=True,
        can_view_progress=True,
        can_manage_settings=True,
    )
    db.add(relationship)
    
    # Create consent records for the child
    from app.models import ConsentRecord
    consent_types = [
        ("data_collection", True, "1.0"),   # Required for app functionality
        ("analytics", True, "1.0"),         # Required for progress tracking
        ("marketing", False, "1.0"),        # Optional marketing communications
    ]
    for consent_type, consent_given, consent_version in consent_types:
        consent = ConsentRecord(
            parent_id=profile.id,
            student_id=student.id,
            consent_type=consent_type,
            consent_given=consent_given,
            consent_version=consent_version,
        )
        db.add(consent)
    
    # Create default preferences
    from app.models import UserPreference
    prefs = UserPreference(user_id=student_user.id)
    db.add(prefs)
    
    # Create enrollment if stage provided
    if request.current_stage_id:
        from app.models import StudentEnrollment, EnrollmentStatusEnum
        enrollment = StudentEnrollment(
            student_id=student.id,
            stage_id=request.current_stage_id,
            status=EnrollmentStatusEnum.ACTIVE,
        )
        db.add(enrollment)
    
    await db.commit()
    await db.refresh(student)
    
    stage = None
    if student.current_stage_id:
        from app.models import LearningStage
        stage_result = await db.execute(
            select(LearningStage).where(LearningStage.id == student.current_stage_id)
        )
        stage = stage_result.scalar_one_or_none()
    
    return ChildResponse(
        id=student.id,
        display_name=student.display_name,
        date_of_birth=student.date_of_birth.isoformat() if student.date_of_birth else None,
        gender=student.gender.value if student.gender else None,
        avatar_type=student.avatar_type,
        current_stage_id=student.current_stage_id,
        current_stage_code=stage.code if stage else None,
        current_stage_name=stage.name if stage else None,
        preferred_language=student.preferred_language,
        audio_enabled=student.audio_enabled,
        reduced_motion=student.reduced_motion,
        high_contrast=student.high_contrast,
        is_active=student.is_active,
        progress_percentage=0,
        last_activity_at=student.last_activity_at.isoformat() if student.last_activity_at else None,
    )


@router.get("/me/children/{child_id}", response_model=ChildResponse)
async def get_child(
    child_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get child profile with progress summary."""
    profile = await get_parent_profile(db, current_user.id)
    
    # Verify child belongs to this parent
    rel_result = await db.execute(
        select(ParentStudentRelationship)
        .where(ParentStudentRelationship.parent_id == profile.id)
        .where(ParentStudentRelationship.student_id == child_id)
    )
    relationship = rel_result.scalar_one_or_none()
    if not relationship:
        raise NotFoundException("Child not found")
    
    # Load student with stage
    from app.models import StudentProfile, LearningStage
    student_result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == child_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = student_result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Child not found")
    
    progress = calculate_child_progress(student, db)
    stage = student.current_stage
    
    return ChildResponse(
        id=student.id,
        display_name=student.display_name,
        date_of_birth=student.date_of_birth.isoformat() if student.date_of_birth else None,
        gender=student.gender.value if student.gender else None,
        avatar_type=student.avatar_type,
        current_stage_id=student.current_stage_id,
        current_stage_code=stage.code if stage else None,
        current_stage_name=stage.name if stage else None,
        preferred_language=student.preferred_language,
        audio_enabled=student.audio_enabled,
        reduced_motion=student.reduced_motion,
        high_contrast=student.high_contrast,
        is_active=student.is_active,
        progress_percentage=progress,
        last_activity_at=student.last_activity_at.isoformat() if student.last_activity_at else None,
    )


@router.patch("/me/children/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: int,
    request: ChildUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update child profile."""
    profile = await get_parent_profile(db, current_user.id)
    
    # Verify child belongs to this parent
    rel_result = await db.execute(
        select(ParentStudentRelationship)
        .where(ParentStudentRelationship.parent_id == profile.id)
        .where(ParentStudentRelationship.student_id == child_id)
        .where(ParentStudentRelationship.can_manage_profile == True)
    )
    relationship = rel_result.scalar_one_or_none()
    if not relationship:
        raise NotFoundException("Child not found or cannot manage")
    
    # Load student
    from app.models import StudentProfile, LearningStage, GenderEnum
    student_result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == child_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = student_result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Child not found")
    
    # Update fields
    if request.display_name is not None:
        student.display_name = request.display_name
    if request.date_of_birth is not None:
        try:
            from datetime import date
            student.date_of_birth = date.fromisoformat(request.date_of_birth)
        except ValueError:
            raise ValidationException("Invalid date format. Use YYYY-MM-DD")
    if request.gender is not None:
        try:
            student.gender = GenderEnum(request.gender)
        except ValueError:
            pass
    if request.avatar_type is not None:
        student.avatar_type = request.avatar_type
    if request.current_stage_id is not None:
        if request.current_stage_id > 0:
            stage_result = await db.execute(
                select(LearningStage).where(LearningStage.id == request.current_stage_id)
            )
            stage = stage_result.scalar_one_or_none()
            if not stage or not stage.is_active:
                raise ValidationException("Invalid learning stage")
            student.current_stage_id = request.current_stage_id
        else:
            student.current_stage_id = None
    if request.preferred_language is not None:
        student.preferred_language = request.preferred_language
    if request.is_active is not None:
        student.is_active = request.is_active
    if request.pin is not None:
        from app.core.security import get_password_hash
        student.pin_hash = get_password_hash(request.pin)
    
    await db.commit()
    await db.refresh(student)
    
    # Reload with stage
    stage = student.current_stage
    progress = await calculate_child_progress(student, db)
    
    return ChildResponse(
        id=student.id,
        display_name=student.display_name,
        date_of_birth=student.date_of_birth.isoformat() if student.date_of_birth else None,
        gender=student.gender.value if student.gender else None,
        avatar_type=student.avatar_type,
        current_stage_id=student.current_stage_id,
        current_stage_code=stage.code if stage else None,
        current_stage_name=stage.name if stage else None,
        preferred_language=student.preferred_language,
        audio_enabled=student.audio_enabled,
        reduced_motion=student.reduced_motion,
        high_contrast=student.high_contrast,
        is_active=student.is_active,
        progress_percentage=progress,
        last_activity_at=student.last_activity_at.isoformat() if student.last_activity_at else None,
    )


@router.delete("/me/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_child(
    child_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate (soft delete) a child profile."""
    profile = await get_parent_profile(db, current_user.id)
    
    # Verify child belongs to this parent
    rel_result = await db.execute(
        select(ParentStudentRelationship)
        .where(ParentStudentRelationship.parent_id == profile.id)
        .where(ParentStudentRelationship.student_id == child_id)
        .where(ParentStudentRelationship.can_manage_profile == True)
    )
    relationship = rel_result.scalar_one_or_none()
    if not relationship:
        raise NotFoundException("Child not found or cannot manage")
    
    # Load student
    from app.models import StudentProfile
    student_result = await db.execute(
        select(StudentProfile).where(StudentProfile.id == child_id)
    )
    student = student_result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Child not found")
    
    # Soft delete
    student.is_active = False
    student.deleted_at = func.now()
    
    # Also deactivate user
    from app.models import User
    user_result = await db.execute(select(User).where(User.id == student.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.is_active = False
        user.deleted_at = func.now()
    
    await db.commit()


@router.get("/me/children/{child_id}/progress", response_model=ChildProgressResponse)
async def get_child_progress(
    child_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed progress report for a child."""
    profile = await get_parent_profile(db, current_user.id)
    
    # Verify child belongs to this parent
    rel_result = await db.execute(
        select(ParentStudentRelationship)
        .where(ParentStudentRelationship.parent_id == profile.id)
        .where(ParentStudentRelationship.student_id == child_id)
        .where(ParentStudentRelationship.can_view_progress == True)
    )
    relationship = rel_result.scalar_one_or_none()
    if not relationship:
        raise NotFoundException("Child not found or cannot view progress")
    
    # Load student with stage
    from app.models import StudentProfile, LearningStage, Lesson, StudentLessonProgress, ActivityAttempt, Activity, Subject, Topic, StudentRewardAward
    
    student_result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == child_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = student_result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Child not found")
    
    stage = student.current_stage
    
    # Get lesson counts for stage
    if stage:
        total_lessons_result = await db.execute(
            select(func.count(Lesson.id))
            .join(Topic, Lesson.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .where(Subject.stage_id == stage.id)
            .where(Lesson.status == "published")
            .where(Lesson.is_active == True)
        )
        total_lessons = total_lessons_result.scalar() or 0
    else:
        total_lessons = 0
    
    # Get progress counts
    completed_result = await db.execute(
        select(func.count(StudentLessonProgress.id))
        .where(StudentLessonProgress.student_id == child_id)
        .where(StudentLessonProgress.status == "completed")
    )
    completed_lessons = completed_result.scalar() or 0
    
    in_progress_result = await db.execute(
        select(func.count(StudentLessonProgress.id))
        .where(StudentLessonProgress.student_id == child_id)
        .where(StudentLessonProgress.status == "in_progress")
    )
    in_progress_lessons = in_progress_result.scalar() or 0
    
    # Activity stats
    total_activities_result = await db.execute(
        select(func.count(ActivityAttempt.id))
        .where(ActivityAttempt.student_id == child_id)
    )
    total_activities = total_activities_result.scalar() or 0
    
    completed_activities_result = await db.execute(
        select(func.count(ActivityAttempt.id))
        .where(ActivityAttempt.student_id == child_id)
        .where(ActivityAttempt.status == "completed")
    )
    completed_activities = completed_activities_result.scalar() or 0
    
    time_result = await db.execute(
        select(func.sum(ActivityAttempt.time_spent_seconds))
        .where(ActivityAttempt.student_id == child_id)
        .where(ActivityAttempt.status == "completed")
    )
    total_time = time_result.scalar() or 0
    
    score_result = await db.execute(
        select(func.avg(ActivityAttempt.score))
        .where(ActivityAttempt.student_id == child_id)
        .where(ActivityAttempt.status == "completed")
        .where(ActivityAttempt.score.is_not(None))
    )
    avg_score = score_result.scalar()
    
    # Rewards earned
    rewards_earned_result = await db.execute(
        select(func.count(StudentRewardAward.id))
        .where(StudentRewardAward.student_id == child_id)
    )
    rewards_earned = rewards_earned_result.scalar() or 0
    
    # Recent activity
    recent_result = await db.execute(
        select(ActivityAttempt, Lesson, Activity)
        .join(Activity, ActivityAttempt.activity_id == Activity.id)
        .join(Lesson, Activity.lesson_id == Lesson.id)
        .where(ActivityAttempt.student_id == child_id)
        .where(ActivityAttempt.status == "completed")
        .order_by(ActivityAttempt.completed_at.desc())
        .limit(10)
    )
    recent = recent_result.all()
    
    recent_activity = [
        {
            "lesson": r.Lesson.title if hasattr(r.Lesson, 'title') else "Unknown",
            "activity": r.Activity.title if hasattr(r.Activity, 'title') else "Unknown",
            "completed_at": r.ActivityAttempt.completed_at.isoformat() if r.ActivityAttempt.completed_at else None,
            "score": r.ActivityAttempt.score,
            "time_spent": r.ActivityAttempt.time_spent_seconds,
        }
        for r in recent
    ]
    
    return ChildProgressResponse(
        child_id=student.id,
        child_name=student.display_name,
        stage_code=stage.code if stage else "",
        stage_name=stage.name if stage else "",
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        in_progress_lessons=in_progress_lessons,
        total_activities=total_activities,
        completed_activities=completed_activities,
        total_time_spent_minutes=total_time // 60,
        average_score=round(avg_score, 1) if avg_score else None,
        rewards_earned=rewards_earned,
        recent_activity=recent_activity,
    )


@router.get("/me/children/{child_id}/rewards")
async def get_child_rewards(
    child_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all rewards with earned status for a specific child (parent view)."""
    profile = await get_parent_profile(db, current_user.id)
    
    # Verify child belongs to this parent
    rel_result = await db.execute(
        select(ParentStudentRelationship)
        .where(ParentStudentRelationship.parent_id == profile.id)
        .where(ParentStudentRelationship.student_id == child_id)
        .where(ParentStudentRelationship.can_view_progress == True)
    )
    relationship = rel_result.scalar_one_or_none()
    if not relationship:
        raise NotFoundException("Child not found or cannot view progress")
    
    # Load student
    from app.models import StudentProfile, StudentReward, StudentRewardAward
    
    student_result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == child_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = student_result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Child not found")
    
    # Get all rewards with earned status
    rewards_result = await db.execute(
        select(StudentReward)
        .where(StudentReward.is_active == True)
        .order_by(StudentReward.display_order)
    )
    rewards = rewards_result.scalars().all()
    
    result = []
    for reward in rewards:
        award_result = await db.execute(
            select(StudentRewardAward)
            .where(StudentRewardAward.student_id == student.id)
            .where(StudentRewardAward.reward_id == reward.id)
        )
        award = award_result.scalar_one_or_none()
        
        result.append({
            "id": reward.id,
            "code": reward.code,
            "name": reward.name,
            "description": reward.description,
            "reward_type": reward.reward_type,
            "image_url": reward.image_url,
            "points_value": reward.points_value,
            "earned": award is not None,
            "earned_at": award.earned_at.isoformat() if award else None,
        })
    
    return {
        "child_id": student.id,
        "child_name": student.display_name,
        "rewards": result,
    }