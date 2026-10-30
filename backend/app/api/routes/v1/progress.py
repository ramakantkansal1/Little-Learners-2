"""
Progress API endpoints.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.models import (
    StudentProfile, StudentEnrollment, StudentLessonProgress,
    ActivityAttempt, ActivityResponse, StudentReward, StudentRewardAward,
    Lesson, Activity, LearningStage, Subject, Topic,
    EnrollmentStatusEnum, LessonProgressStatusEnum, AttemptStatusEnum
)
from app.permissions.dependencies import get_current_user, require_permission
from app.permissions.roles import Permission

router = APIRouter(tags=["progress"])


# Response Models
class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    stage_id: int
    stage_code: Optional[str]
    stage_name: Optional[str]
    subject_id: Optional[int]
    subject_name: Optional[str]
    status: str
    enrolled_at: str
    completed_at: Optional[str]

    class Config:
        from_attributes = True


class LessonProgressResponse(BaseModel):
    id: int
    student_id: int
    lesson_id: int
    lesson_title: Optional[str]
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    last_activity_at: Optional[str]
    time_spent_seconds: int
    completion_percentage: int

    class Config:
        from_attributes = True


class ActivityAttemptResponse(BaseModel):
    id: int
    student_id: int
    activity_id: int
    activity_title: Optional[str]
    lesson_id: int
    lesson_title: Optional[str]
    attempt_number: int
    status: str
    started_at: str
    completed_at: Optional[str]
    time_spent_seconds: int
    score: Optional[int]
    max_score: int
    passed: Optional[bool]

    class Config:
        from_attributes = True


class ProgressSummaryResponse(BaseModel):
    student_id: int
    student_name: str
    stage_code: str
    stage_name: str
    total_lessons: int
    completed_lessons: int
    in_progress_lessons: int
    not_started_lessons: int
    completion_rate: float
    total_activities: int
    completed_activities: int
    average_score: Optional[float]
    total_time_minutes: int
    recent_activity: List[dict]

    class Config:
        from_attributes = True


# Helper functions
async def get_student_for_parent(db: AsyncSession, parent_user_id: int, child_id: int):
    """Verify child belongs to parent and return student."""
    from app.models import ParentProfile, ParentStudentRelationship

    parent_result = await db.execute(
        select(ParentProfile).where(ParentProfile.user_id == parent_user_id)
    )
    parent = parent_result.scalar_one_or_none()
    if not parent:
        raise NotFoundException("Parent profile not found")

    rel_result = await db.execute(
        select(ParentStudentRelationship)
        .where(ParentStudentRelationship.parent_id == parent.id)
        .where(ParentStudentRelationship.student_id == child_id)
        .where(ParentStudentRelationship.can_view_progress == True)
    )
    relationship = rel_result.scalar_one_or_none()
    if not relationship:
        raise NotFoundException("Child not found or cannot view progress")

    from app.models import StudentProfile
    student_result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == child_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = student_result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Child not found")

    return student


# Endpoints
@router.get("/students/{student_id}/enrollments", response_model=List[EnrollmentResponse])
async def get_student_enrollments(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get enrollments for a student."""
    # Check permissions - parent can view own children, student can view self, admin can view all
    user_roles = [ur.role.name for ur in current_user.user_roles]

    if "parent" in user_roles:
        await get_student_for_parent(db, current_user.id, student_id)
    elif "student" in user_roles:
        # Students can only view their own
        student_result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if not student or student.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models import StudentEnrollment, LearningStage, Subject
    result = await db.execute(
        select(StudentEnrollment, LearningStage, Subject)
        .join(LearningStage, StudentEnrollment.stage_id == LearningStage.id)
        .outerjoin(Subject, StudentEnrollment.subject_id == Subject.id)
        .where(StudentEnrollment.student_id == student_id)
        .order_by(StudentEnrollment.enrolled_at.desc())
    )

    enrollments = []
    for enrollment, stage, subject in result.all():
        enrollments.append(EnrollmentResponse(
            id=enrollment.id,
            student_id=enrollment.student_id,
            stage_id=enrollment.stage_id,
            stage_code=stage.code,
            stage_name=stage.name,
            subject_id=enrollment.subject_id,
            subject_name=subject.name if subject else None,
            status=enrollment.status,
            enrolled_at=enrollment.enrolled_at.isoformat(),
            completed_at=enrollment.completed_at.isoformat() if enrollment.completed_at else None,
        ))

    return enrollments


@router.post("/students/{student_id}/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def create_enrollment(
    student_id: int,
    stage_id: int = Query(...),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Enroll a student in a stage/subject."""
    user_roles = [ur.role.name for ur in current_user.user_roles]

    if "parent" in user_roles:
        await get_student_for_parent(db, current_user.id, student_id)
    elif "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify stage
    from app.models import LearningStage, Subject, StudentEnrollment
    stage_result = await db.execute(
        select(LearningStage).where(LearningStage.id == stage_id).where(LearningStage.is_active == True)
    )
    stage = stage_result.scalar_one_or_none()
    if not stage:
        raise ValidationException("Invalid stage")

    if subject_id:
        subject_result = await db.execute(
            select(Subject).where(Subject.id == subject_id).where(Subject.is_active == True)
        )
        subject = subject_result.scalar_one_or_none()
        if not subject or subject.stage_id != stage_id:
            raise ValidationException("Invalid subject for this stage")

    # Check existing enrollment
    existing_result = await db.execute(
        select(StudentEnrollment)
        .where(StudentEnrollment.student_id == student_id)
        .where(StudentEnrollment.stage_id == stage_id)
        .where(StudentEnrollment.subject_id == subject_id)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise ValidationException("Enrollment already exists")

    enrollment = StudentEnrollment(
        student_id=student_id,
        stage_id=stage_id,
        subject_id=subject_id,
        status=EnrollmentStatusEnum.ACTIVE,
        enrolled_at=datetime.now(timezone.utc),
        assigned_by=current_user.id,
    )
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)

    return EnrollmentResponse(
        id=enrollment.id,
        student_id=enrollment.student_id,
        stage_id=enrollment.stage_id,
        stage_code=stage.code,
        stage_name=stage.name,
        subject_id=enrollment.subject_id,
        subject_name=None,
        status=enrollment.status,
        enrolled_at=enrollment.enrolled_at.isoformat(),
        completed_at=None,
    )


@router.get("/students/{student_id}/lessons", response_model=List[LessonProgressResponse])
async def get_student_lesson_progress(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get lesson progress for a student."""
    user_roles = [ur.role.name for ur in current_user.user_roles]

    if "parent" in user_roles:
        await get_student_for_parent(db, current_user.id, student_id)
    elif "student" in user_roles:
        student_result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if not student or student.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models import StudentLessonProgress, Lesson, LessonTranslation
    result = await db.execute(
        select(StudentLessonProgress, Lesson)
        .join(Lesson, StudentLessonProgress.lesson_id == Lesson.id)
        .where(StudentLessonProgress.student_id == student_id)
        .order_by(StudentLessonProgress.created_at.desc())
    )

    progress_list = []
    for progress, lesson in result.all():
        # Get lesson translation for title
        trans_result = await db.execute(
            select(LessonTranslation)
            .where(LessonTranslation.lesson_id == lesson.id)
            .where(LessonTranslation.language == 'en')  # Default to English
        )
        trans = trans_result.scalar_one_or_none()

        progress_list.append(LessonProgressResponse(
            id=progress.id,
            student_id=progress.student_id,
            lesson_id=progress.lesson_id,
            lesson_title=trans.title if trans else lesson.code,
            status=progress.status,
            started_at=progress.started_at.isoformat() if progress.started_at else None,
            completed_at=progress.completed_at.isoformat() if progress.completed_at else None,
            last_activity_at=progress.last_activity_at.isoformat() if progress.last_activity_at else None,
            time_spent_seconds=progress.time_spent_seconds,
            completion_percentage=progress.completion_percentage,
        ))

    return progress_list


@router.get("/students/{student_id}/activities", response_model=List[ActivityAttemptResponse])
async def get_student_activity_attempts(
    student_id: int,
    lesson_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get activity attempts for a student."""
    user_roles = [ur.role.name for ur in current_user.user_roles]

    if "parent" in user_roles:
        await get_student_for_parent(db, current_user.id, student_id)
    elif "student" in user_roles:
        student_result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if not student or student.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.models import ActivityAttempt, Activity, Lesson, ActivityTranslation
    query = (
        select(ActivityAttempt, Activity, Lesson)
        .join(Activity, ActivityAttempt.activity_id == Activity.id)
        .join(Lesson, Activity.lesson_id == Lesson.id)
        .where(ActivityAttempt.student_id == student_id)
    )

    if lesson_id:
        query = query.where(Activity.lesson_id == lesson_id)

    query = query.order_by(ActivityAttempt.started_at.desc())
    result = await db.execute(query)

    attempts = []
    for attempt, activity, lesson in result.all():
        trans_result = await db.execute(
            select(ActivityTranslation)
            .where(ActivityTranslation.activity_id == activity.id)
            .where(ActivityTranslation.language == 'en')
        )
        trans = trans_result.scalar_one_or_none()

        lesson_trans_result = await db.execute(
            select(LessonTranslation)
            .where(LessonTranslation.lesson_id == lesson.id)
            .where(LessonTranslation.language == 'en')
        )
        lesson_trans = lesson_trans_result.scalar_one_or_none()

        attempts.append(ActivityAttemptResponse(
            id=attempt.id,
            student_id=attempt.student_id,
            activity_id=attempt.activity_id,
            activity_title=trans.title if trans else activity.code,
            lesson_id=attempt.activity.lesson_id,
            lesson_title=lesson_trans.title if lesson_trans else lesson.code,
            attempt_number=attempt.attempt_number,
            status=attempt.status,
            started_at=attempt.started_at.isoformat(),
            completed_at=attempt.completed_at.isoformat() if attempt.completed_at else None,
            time_spent_seconds=attempt.time_spent_seconds,
            score=attempt.score,
            max_score=attempt.max_score,
            passed=attempt.passed,
        ))

    return attempts


@router.get("/parents/me/children/{child_id}/summary", response_model=ProgressSummaryResponse)
async def get_child_progress_summary(
    child_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get comprehensive progress summary for a child (parent view)."""
    await get_student_for_parent(db, current_user.id, child_id)

    from app.models import StudentProfile, Lesson, StudentLessonProgress, ActivityAttempt, LearningStage, Subject, Topic
    from app.models import LessonTranslation

    student_result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == child_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise NotFoundException("Child not found")

    stage = student.current_stage

    # Total lessons in stage
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

    # Progress counts
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

    not_started = total_lessons - completed_lessons - in_progress_lessons
    completion_rate = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0

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

    score_result = await db.execute(
        select(func.avg(ActivityAttempt.score))
        .where(ActivityAttempt.student_id == child_id)
        .where(ActivityAttempt.status == "completed")
        .where(ActivityAttempt.score.is_not(None))
    )
    avg_score = score_result.scalar()

    time_result = await db.execute(
        select(func.sum(ActivityAttempt.time_spent_seconds))
        .where(ActivityAttempt.student_id == child_id)
        .where(ActivityAttempt.status == "completed")
    )
    total_time = time_result.scalar() or 0

    # Recent activity
    recent_result = await db.execute(
        select(ActivityAttempt, Activity, Lesson)
        .join(Activity, ActivityAttempt.activity_id == Activity.id)
        .join(Lesson, Activity.lesson_id == Lesson.id)
        .where(ActivityAttempt.student_id == child_id)
        .where(ActivityAttempt.status == "completed")
        .order_by(ActivityAttempt.completed_at.desc())
        .limit(10)
    )
    recent = recent_result.all()

    recent_activity = []
    for attempt, activity, lesson in recent:
        act_trans_result = await db.execute(
            select(ActivityTranslation)
            .where(ActivityTranslation.activity_id == activity.id)
            .where(ActivityTranslation.language == 'en')
        )
        act_trans = act_trans_result.scalar_one_or_none()

        lesson_trans_result = await db.execute(
            select(LessonTranslation)
            .where(LessonTranslation.lesson_id == lesson.id)
            .where(LessonTranslation.language == 'en')
        )
        lesson_trans = lesson_trans_result.scalar_one_or_none()

        recent_activity.append({
            "lesson": lesson_trans.title if lesson_trans else lesson.code,
            "activity": act_trans.title if act_trans else activity.code,
            "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
            "score": attempt.score,
            "time_spent": attempt.time_spent_seconds,
        })

    return ProgressSummaryResponse(
        student_id=student.id,
        student_name=student.display_name,
        stage_code=stage.code if stage else "",
        stage_name=stage.name if stage else "",
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        in_progress_lessons=in_progress_lessons,
        not_started_lessons=not_started,
        completion_rate=round(completion_rate, 1),
        total_activities=total_activities,
        completed_activities=completed_activities,
        average_score=round(avg_score, 1) if avg_score else None,
        total_time_minutes=total_time // 60,
        recent_activity=recent_activity,
    )