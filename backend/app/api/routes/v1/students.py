"""
Student API endpoints.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.models import (
    User,
    StudentProfile,
    LearningStage,
    Lesson,
    Activity,
    ActivityAttempt,
    ActivityResponse,
    Question,
    AnswerOption,
    StudentReward,
    StudentRewardAward,
    StudentLessonProgress,
    ActivityTypeEnum,
    Topic,
    Subject
)
from app.permissions.dependencies import get_current_user
from app.permissions.roles import Permission
from app.services.adaptive_learning import RecommendationService, RecommendationResult

router = APIRouter(tags=["students"])


# Request/Response Models for Stage 5D
class NextActivityRecommendationResponse(BaseModel):
    """Response model for next activity recommendation."""
    activity_id: Optional[int]
    reason: str
    confidence: str
    mastery_score: Optional[float]
    tier: Optional[str]
    has_evidence: bool
    activity: Optional[ActivityDetailResponse] = None

    class Config:
        from_attributes = True


# Request/Response Models
class StudentProfileResponse(BaseModel):
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
    audio_volume: float
    narration_speed: float
    reduced_motion: bool
    high_contrast: bool
    is_active: bool

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    continue_learning: List[dict]
    next_lessons: List[dict]
    rewards_preview: List[dict]
    stats: dict


class LessonListResponse(BaseModel):
    id: int
    code: str
    title: str
    description: Optional[str]
    subject_name: str
    subject_code: str
    stage_code: str
    status: str
    estimated_duration_minutes: Optional[int]
    thumbnail_url: Optional[str]
    display_order: int
    progress: Optional[dict] = None

    class Config:
        from_attributes = True


class ActivityDetailResponse(BaseModel):
    id: int
    code: str
    type: str
    title: str
    instructions: Optional[str]
    estimated_duration_minutes: Optional[int]
    configuration: Optional[dict]
    questions: List[dict]

    class Config:
        from_attributes = True


class AttemptStartResponse(BaseModel):
    attempt_id: int
    activity: ActivityDetailResponse
    questions: List[dict]
    saved_progress: Optional[dict] = None
    lesson_progress: Optional[dict] = None


class AnswerSubmitRequest(BaseModel):
    question_id: int
    selected_option_ids: List[int]


class AttemptCompleteResponse(BaseModel):
    score: int
    passed: bool
    rewards_earned: List[dict]
    next_activity_id: Optional[int]
    streak: Optional[dict] = None


class RewardResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]
    reward_type: str
    image_url: Optional[str]
    points_value: int
    earned: bool
    earned_at: Optional[str]

    class Config:
        from_attributes = True


class HistoryItemResponse(BaseModel):
    id: int
    lesson_id: int
    lesson_title: str
    activity_id: Optional[int]
    activity_title: Optional[str]
    status: str
    score: Optional[int]
    completed_at: Optional[str]
    time_spent_seconds: int

    class Config:
        from_attributes = True


# Helper functions
async def get_student_profile(db: AsyncSession, user_id: int) -> StudentProfile:
    """Get student profile for current user."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.user_id == user_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Student profile not found")
    return student


async def update_lesson_progress(
    db: AsyncSession,
    student: StudentProfile,
    lesson_id: int,
    activity_id: Optional[int] = None,
) -> StudentLessonProgress:
    """Create or update lesson progress for a student.

    Updates last_activity_at, current_activity_id (if provided), and
    recalculates completion_percentage based on completed activities.
    Marks the lesson completed when all published activities are done.
    """
    # Get or create lesson progress
    progress_result = await db.execute(
        select(StudentLessonProgress)
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.lesson_id == lesson_id)
    )
    progress = progress_result.scalar_one_or_none()
    if not progress:
        progress = StudentLessonProgress(
            student_id=student.id,
            lesson_id=lesson_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            last_activity_at=datetime.now(timezone.utc),  # Set last_activity_at on creation
        )
        db.add(progress)
        await db.flush()
    else:
        # Always refresh activity timestamp
        progress.last_activity_at = datetime.now(timezone.utc)

    # Track current activity if provided
    if activity_id is not None:
        progress.current_activity_id = activity_id

    # Count total published, active activities for this lesson
    total_result = await db.execute(
        select(func.count(Activity.id))
        .where(Activity.lesson_id == lesson_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
    )
    total_activities = total_result.scalar() or 0

    # Count distinct activities the student has completed
    completed_result = await db.execute(
        select(func.count(func.distinct(ActivityAttempt.activity_id)))
        .join(Activity, ActivityAttempt.activity_id == Activity.id)
        .where(ActivityAttempt.student_id == student.id)
        .where(ActivityAttempt.status == "completed")
        .where(Activity.lesson_id == lesson_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
    )
    completed_activities = completed_result.scalar() or 0

    # Recalculate completion percentage (guard against division by zero)
    if total_activities > 0:
        progress.completion_percentage = int(
            (completed_activities / total_activities) * 100
        )
    else:
        progress.completion_percentage = 0

    # Update status based on completion
    if total_activities > 0 and completed_activities >= total_activities:
        progress.status = "completed"
        if progress.completed_at is None:
            progress.completed_at = datetime.now(timezone.utc)
    else:
        if progress.status == "not_started":
            progress.status = "in_progress"
        # Keep completion_percentage as calculated; don't override status to completed

    return progress


async def calculate_streak(
    db: AsyncSession,
    student: StudentProfile,
    completion_date: date,
) -> tuple[int, int]:
    """Calculate and update streak based on lesson completion date.

    Streak rules:
    - First qualifying completion sets streak to 1
    - Same-day repeated completions do not increment streak
    - Consecutive calendar day extends streak by 1
    - Missed day(s) resets streak to 1
    - longest_streak is the maximum streak ever achieved

    Returns (current_streak, longest_streak).
    """
    # Reload student.last_activity_date from DB to get fresh value
    result = await db.execute(
        select(StudentProfile.last_activity_date).where(StudentProfile.id == student.id)
    )
    student.last_activity_date = result.scalar_one()
    today = completion_date

    if student.last_activity_date is None:
        # First qualifying completion
        student.current_streak = 1
        student.longest_streak = max(student.longest_streak, 1)
    elif student.last_activity_date == today:
        # Same day - do not increment
        pass
    elif student.last_activity_date == today - timedelta(days=1):
        # Consecutive calendar day
        student.current_streak += 1
        student.longest_streak = max(student.longest_streak, student.current_streak)
    else:
        # Missed day(s) - reset streak
        student.current_streak = 1
        student.longest_streak = max(student.longest_streak, 1)

    student.last_activity_date = today
    return student.current_streak, student.longest_streak


# Endpoints
@router.get("/me", response_model=StudentProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current student profile."""
    # Verify student role
    student_roles = [ur.role.name for ur in current_user.user_roles]
    if "student" not in student_roles:
        raise HTTPException(status_code=403, detail="Not authorized")

    student = await get_student_profile(db, current_user.id)
    stage = student.current_stage

    return StudentProfileResponse(
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
        audio_volume=0.8,  # TODO: from preferences
        narration_speed=1.0,  # TODO: from preferences
        reduced_motion=student.reduced_motion,
        high_contrast=student.high_contrast,
        is_active=student.is_active,
    )


@router.get("/me/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get student learning dashboard data."""
    student = await get_student_profile(db, current_user.id)

    from app.models import StudentLessonProgress, Lesson, StudentEnrollment, Activity, ActivityAttempt, StudentRewardAward, StudentReward, Topic, Subject
    from sqlalchemy import func, desc

    # Continue learning - lessons in progress
    continue_result = await db.execute(
        select(StudentLessonProgress, Lesson)
        .join(Lesson, StudentLessonProgress.lesson_id == Lesson.id)
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.status == "in_progress")
        .order_by(StudentLessonProgress.last_activity_at.desc())
        .limit(5)
    )
    continue_learning = []
    for progress, lesson in continue_result.all():
        # Get lesson translation
        from app.models import LessonTranslation
        trans_result = await db.execute(
            select(LessonTranslation).where(
                LessonTranslation.lesson_id == lesson.id,
                LessonTranslation.language == student.preferred_language
            )
        )
        trans = trans_result.scalar_one_or_none()

        continue_learning.append({
            "lesson_id": lesson.id,
            "title": trans.title if trans else lesson.code,
            "progress": progress.completion_percentage,
            "last_activity": progress.last_activity_at.isoformat() if progress.last_activity_at else None,
        })

    # Next lessons - enrolled but not started
    next_result = await db.execute(
        select(Lesson)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(Subject.stage_id == student.current_stage_id)
        .where(Lesson.status == "published")
        .where(Lesson.is_active == True)
        .where(~Lesson.id.in_(
            select(StudentLessonProgress.lesson_id).where(StudentLessonProgress.student_id == student.id)
        ))
        .order_by(Lesson.display_order)
        .limit(5)
    )
    next_lessons = []
    for lesson in next_result.scalars().all():
        from app.models import LessonTranslation
        trans_result = await db.execute(
            select(LessonTranslation).where(
                LessonTranslation.lesson_id == lesson.id,
                LessonTranslation.language == student.preferred_language
            )
        )
        trans = trans_result.scalar_one_or_none()

        next_lessons.append({
            "lesson_id": lesson.id,
            "title": trans.title if trans else lesson.code,
            "locked": False,
        })

    # Rewards preview
    rewards_result = await db.execute(
        select(StudentReward)
        .where(StudentReward.is_active == True)
        .order_by(StudentReward.display_order)
        .limit(5)
    )
    rewards_preview = []
    for reward in rewards_result.scalars().all():
        award_result = await db.execute(
            select(StudentRewardAward)
            .where(StudentRewardAward.student_id == student.id)
            .where(StudentRewardAward.reward_id == reward.id)
        )
        earned = award_result.scalar_one_or_none() is not None
        rewards_preview.append({
            "id": reward.id,
            "name": reward.name,
            "reward_type": reward.reward_type,
            "image_url": reward.image_url,
            "earned": earned,
        })

    # Stats
    lessons_completed_result = await db.execute(
        select(func.count(StudentLessonProgress.id))
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.status == "completed")
    )
    lessons_completed = lessons_completed_result.scalar() or 0

    rewards_earned_result = await db.execute(
        select(func.count(StudentRewardAward.id))
        .where(StudentRewardAward.student_id == student.id)
    )
    rewards_earned = rewards_earned_result.scalar() or 0

    time_result = await db.execute(
        select(func.sum(ActivityAttempt.time_spent_seconds))
        .where(ActivityAttempt.student_id == student.id)
        .where(ActivityAttempt.status == "completed")
    )
    total_time = time_result.scalar() or 0

    return DashboardResponse(
        continue_learning=continue_learning,
        next_lessons=next_lessons,
        rewards_preview=rewards_preview,
        stats={
            "lessons_completed": lessons_completed,
            "rewards_earned": rewards_earned,
            "time_this_week": f"{total_time // 3600}h {(total_time % 3600) // 60}m",
            "current_streak": student.current_streak,
        }
    )


@router.get("/me/lessons", response_model=List[LessonListResponse])
async def get_my_lessons(
    stage_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get lessons for student's current stage."""
    student = await get_student_profile(db, current_user.id)

    from app.models import Lesson, Topic, Subject, StudentLessonProgress, LessonTranslation

    target_stage_id = stage_id or student.current_stage_id
    if not target_stage_id:
        return []

    # Build query
    query = (
        select(Lesson, Topic, Subject, StudentLessonProgress)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .outerjoin(
            StudentLessonProgress,
            and_(
                StudentLessonProgress.lesson_id == Lesson.id,
                StudentLessonProgress.student_id == student.id
            )
        )
        .where(Subject.stage_id == target_stage_id)
        .where(Lesson.status == "published")
        .where(Lesson.is_active == True)
    )

    if subject_id:
        query = query.where(Subject.id == subject_id)

    query = query.order_by(Subject.display_order, Topic.display_order, Lesson.display_order)

    result = await db.execute(query)

    lessons = []
    for lesson, topic, subject, progress in result.all():
        trans_result = await db.execute(
            select(LessonTranslation).where(
                LessonTranslation.lesson_id == lesson.id,
                LessonTranslation.language == student.preferred_language
            )
        )
        trans = trans_result.scalar_one_or_none()

        progress_data = None
        if progress:
            progress_data = {
                "status": progress.status,
                "completion_percentage": progress.completion_percentage,
                "time_spent_seconds": progress.time_spent_seconds,
            }

        lessons.append(LessonListResponse(
            id=lesson.id,
            code=lesson.code,
            title=trans.title if trans else lesson.code,
            description=trans.description if trans else None,
            subject_name=subject.name,
            subject_code=subject.code,
            stage_code="",  # Would need stage join
            status=lesson.status,
            estimated_duration_minutes=lesson.estimated_duration_minutes,
            thumbnail_url=lesson.thumbnail_url,
            display_order=lesson.display_order,
            progress=progress_data,
        ))

    return lessons


@router.get("/me/learn/{lesson_id}")
async def get_lesson_content(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full lesson with activities for learning."""
    student = await get_student_profile(db, current_user.id)

    from app.models import Lesson, Activity, ActivityTranslation, Question, AnswerOption, StudentLessonProgress
    from app.models import LessonTranslation, Topic, Subject

    # Verify lesson exists, is published, and belongs to student's stage
    lesson_result = await db.execute(
        select(Lesson)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(Lesson.id == lesson_id)
        .where(Lesson.status == "published")
        .where(Lesson.is_active == True)
        .where(Subject.stage_id == student.current_stage_id)
    )
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")

    # Get or create lesson progress
    progress_result = await db.execute(
        select(StudentLessonProgress)
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.lesson_id == lesson_id)
    )
    progress = progress_result.scalar_one_or_none()
    if not progress:
        progress = StudentLessonProgress(
            student_id=student.id,
            lesson_id=lesson_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
        )
        db.add(progress)
        await db.flush()
    elif progress.status == "not_started":
        progress.status = "in_progress"
        progress.started_at = datetime.now(timezone.utc)

    # Get lesson translation
    trans_result = await db.execute(
        select(LessonTranslation).where(
            LessonTranslation.lesson_id == lesson_id,
            LessonTranslation.language == student.preferred_language
        )
    )
    trans = trans_result.scalar_one_or_none()

    # Get activities
    activities_result = await db.execute(
        select(Activity)
        .where(Activity.lesson_id == lesson_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
        .order_by(Activity.display_order)
    )
    activities = activities_result.scalars().all()

    activities_data = []
    for activity in activities:
        act_trans_result = await db.execute(
            select(ActivityTranslation).where(
                ActivityTranslation.activity_id == activity.id,
                ActivityTranslation.language == student.preferred_language
            )
        )
        act_trans = act_trans_result.scalar_one_or_none()

        # Get questions
        questions_result = await db.execute(
            select(Question)
            .where(Question.activity_id == activity.id)
            .where(Question.is_active == True)
            .order_by(Question.display_order)
        )
        questions = questions_result.scalars().all()

        questions_data = []
        for q in questions:
            options_result = await db.execute(
                select(AnswerOption)
                .where(AnswerOption.question_id == q.id)
                .order_by(AnswerOption.display_order)
            )
            options = options_result.scalars().all()

            questions_data.append({
                "id": q.id,
                "question_type": q.question_type,
                "prompt": q.prompt,
                "prompt_audio_url": q.prompt_audio_url,
                "display_order": q.display_order,
                "points": q.points,
                "configuration": q.configuration,
                "options": [
                    {
                        "id": opt.id,
                        "text": opt.text,
                        "text_audio_url": opt.text_audio_url,
                        "image_url": opt.image_url,
                        "display_order": opt.display_order,
                    }
                    for opt in options
                ],
            })

        activities_data.append({
            "id": activity.id,
            "type": activity.type.value,
            "code": activity.code,
            "title": act_trans.title if act_trans else activity.code,
            "instructions": act_trans.instructions if act_trans else activity.instructions,
            "estimated_duration_minutes": activity.estimated_duration_minutes,
            "configuration": activity.configuration,
            "questions": questions_data,
        })

    # Prepare progress info for response
    progress_data = {
        "status": progress.status,
        "completion_percentage": progress.completion_percentage,
    }

    return {
        "id": lesson.id,
        "title": trans.title if trans else lesson.code,
        "description": trans.description if trans else None,
        "instructions": trans.instructions if trans else lesson.instructions,
        "estimated_duration_minutes": lesson.estimated_duration_minutes,
        "activities": activities_data,
        "progress": progress_data,
    }


@router.post("/me/activities/{activity_id}/attempts", response_model=AttemptStartResponse)
async def start_activity_attempt(
    activity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new activity attempt."""
    student = await get_student_profile(db, current_user.id)

    from app.models import Activity, ActivityTranslation, Question, AnswerOption, ActivityAttempt, StudentLessonProgress

    # Verify activity exists
    activity_result = await db.execute(
        select(Activity)
        .where(Activity.id == activity_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
    )
    activity = activity_result.scalar_one_or_none()
    if not activity:
        raise NotFoundException("Activity not found")

    # Get lesson progress
    progress_result = await db.execute(
        select(StudentLessonProgress)
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.lesson_id == activity.lesson_id)
    )
    progress = progress_result.scalar_one_or_none()
    if not progress:
        progress = StudentLessonProgress(
            student_id=student.id,
            lesson_id=activity.lesson_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            last_activity_at=datetime.now(timezone.utc),
            current_activity_id=activity.id,
        )
        db.add(progress)
        await db.flush()
    elif progress.status == "not_started":
        progress.status = "in_progress"
        progress.started_at = datetime.now(timezone.utc)
        progress.last_activity_at = datetime.now(timezone.utc)
    progress.current_activity_id = activity.id

    # Create attempt
    attempt_count_result = await db.execute(
        select(func.count(ActivityAttempt.id))
        .where(ActivityAttempt.student_id == student.id)
        .where(ActivityAttempt.activity_id == activity_id)
    )
    attempt_count = attempt_count_result.scalar() or 0

    attempt = ActivityAttempt(
        student_id=student.id,
        activity_id=activity_id,
        lesson_progress_id=progress.id,
        attempt_number=attempt_count + 1,
        status="started",
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    await db.flush()
    await db.commit()

    # Get activity details with translations
    act_trans_result = await db.execute(
        select(ActivityTranslation).where(
            ActivityTranslation.activity_id == activity_id,
            ActivityTranslation.language == student.preferred_language
        )
    )
    act_trans = act_trans_result.scalar_one_or_none()

    # Get questions
    questions_result = await db.execute(
        select(Question)
        .where(Question.activity_id == activity_id)
        .where(Question.is_active == True)
        .order_by(Question.display_order)
    )
    questions = questions_result.scalars().all()

    questions_data = []
    for q in questions:
        options_result = await db.execute(
            select(AnswerOption)
            .where(AnswerOption.question_id == q.id)
            .order_by(AnswerOption.display_order)
        )
        options = options_result.scalars().all()

        questions_data.append({
            "id": q.id,
            "question_type": q.question_type,
            "prompt": q.prompt,
            "prompt_audio_url": q.prompt_audio_url,
            "display_order": q.display_order,
            "points": q.points,
            "configuration": q.configuration,
            "options": [
                {
                    "id": opt.id,
                    "text": opt.text,
                    "text_audio_url": opt.text_audio_url,
                    "image_url": opt.image_url,
                    "display_order": opt.display_order,
                }
                for opt in options
            ],
        })

    activity_detail = ActivityDetailResponse(
        id=activity.id,
        code=activity.code,
        type=activity.type.value,
        title=act_trans.title if act_trans else activity.code,
        instructions=act_trans.instructions if act_trans else activity.instructions,
        estimated_duration_minutes=activity.estimated_duration_minutes,
        configuration=activity.configuration,
        questions=questions_data,
    )

    # Return progress info for frontend
    saved_progress = None
    if attempt.metadata_json:
        saved_progress = {
            "current_question_index": attempt.metadata_json.get("current_question_index", 0),
            "accumulated_score": attempt.metadata_json.get("accumulated_score", 0),
            "answers_submitted": attempt.metadata_json.get("answers_submitted", 0),
        }

    lesson_progress = None
    if progress:
        lesson_progress = {
            "status": progress.status,
            "completion_percentage": progress.completion_percentage,
            "time_spent_seconds": progress.time_spent_seconds,
        }

    return AttemptStartResponse(
        attempt_id=attempt.id,
        activity=activity_detail,
        questions=questions_data,
        saved_progress=saved_progress,
        lesson_progress=lesson_progress,
    )


@router.get("/me/attempts/{attempt_id}", response_model=AttemptStartResponse)
async def get_activity_attempt(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get existing activity attempt details."""
    student = await get_student_profile(db, current_user.id)

    from app.models import Activity, ActivityTranslation, Question, AnswerOption, ActivityAttempt, StudentLessonProgress

    # Verify attempt belongs to student
    attempt_result = await db.execute(
        select(ActivityAttempt)
        .where(ActivityAttempt.id == attempt_id)
        .where(ActivityAttempt.student_id == student.id)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise NotFoundException("Attempt not found")

    # Get activity
    activity_result = await db.execute(
        select(Activity)
        .where(Activity.id == attempt.activity_id)
    )
    activity = activity_result.scalar_one_or_none()
    if not activity:
        raise NotFoundException("Activity not found")

    # Get lesson progress
    progress_result = await db.execute(
        select(StudentLessonProgress)
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.lesson_id == activity.lesson_id)
    )
    progress = progress_result.scalar_one_or_none()
    if not progress:
        progress = StudentLessonProgress(
            student_id=student.id,
            lesson_id=activity.lesson_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            last_activity_at=datetime.now(timezone.utc),
            current_activity_id=activity.id,
        )
        db.add(progress)
        await db.flush()
    elif progress.status == "not_started":
        progress.status = "in_progress"
        progress.started_at = datetime.now(timezone.utc)
        progress.last_activity_at = datetime.now(timezone.utc)
    progress.current_activity_id = activity.id

    # Get activity details with translations
    act_trans_result = await db.execute(
        select(ActivityTranslation).where(
            ActivityTranslation.activity_id == activity.id,
            ActivityTranslation.language == student.preferred_language
        )
    )
    act_trans = act_trans_result.scalar_one_or_none()

    # Get questions
    questions_result = await db.execute(
        select(Question)
        .where(Question.activity_id == activity.id)
        .where(Question.is_active == True)
        .order_by(Question.display_order)
    )
    questions = questions_result.scalars().all()

    questions_data = []
    for q in questions:
        options_result = await db.execute(
            select(AnswerOption)
            .where(AnswerOption.question_id == q.id)
            .order_by(AnswerOption.display_order)
        )
        options = options_result.scalars().all()

        questions_data.append({
            "id": q.id,
            "question_type": q.question_type,
            "prompt": q.prompt,
            "prompt_audio_url": q.prompt_audio_url,
            "display_order": q.display_order,
            "points": q.points,
            "configuration": q.configuration,
            "options": [
                {
                    "id": opt.id,
                    "text": opt.text,
                    "text_audio_url": opt.text_audio_url,
                    "image_url": opt.image_url,
                    "display_order": opt.display_order,
                }
                for opt in options
            ],
        })

    activity_detail = ActivityDetailResponse(
        id=activity.id,
        code=activity.code,
        type=activity.type.value,
        title=act_trans.title if act_trans else activity.code,
        instructions=act_trans.instructions if act_trans else activity.instructions,
        estimated_duration_minutes=activity.estimated_duration_minutes,
        configuration=activity.configuration,
        questions=questions_data,
    )

    # Return progress info for frontend
    saved_progress = None
    if attempt.metadata_json:
        saved_progress = {
            "current_question_index": attempt.metadata_json.get("current_question_index", 0),
            "accumulated_score": attempt.metadata_json.get("accumulated_score", 0),
            "answers_submitted": attempt.metadata_json.get("answers_submitted", 0),
        }

    lesson_progress = None
    if progress:
        lesson_progress = {
            "status": progress.status,
            "completion_percentage": progress.completion_percentage,
            "time_spent_seconds": progress.time_spent_seconds,
        }

    return AttemptStartResponse(
        attempt_id=attempt.id,
        activity=activity_detail,
        questions=questions_data,
        saved_progress=saved_progress,
        lesson_progress=lesson_progress,
    )


@router.post("/attempts/{attempt_id}/responses")
async def submit_answer(
    attempt_id: int,
    request: AnswerSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit answer for a question."""
    student = await get_student_profile(db, current_user.id)

    # Verify attempt belongs to student
    attempt_result = await db.execute(
        select(ActivityAttempt)
        .where(ActivityAttempt.id == attempt_id)
        .where(ActivityAttempt.student_id == student.id)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise NotFoundException("Attempt not found")

    if attempt.status != "started" and attempt.status != "in_progress":
        raise ValidationException("Attempt already completed")

    # Verify question belongs to activity
    question_result = await db.execute(
        select(Question)
        .where(Question.id == request.question_id)
        .where(Question.activity_id == attempt.activity_id)
    )
    question = question_result.scalar_one_or_none()
    if not question:
        raise NotFoundException("Question not found")

    # Verify options
    options_result = await db.execute(
        select(AnswerOption)
        .where(AnswerOption.id.in_(request.selected_option_ids))
        .where(AnswerOption.question_id == request.question_id)
    )
    selected_options = options_result.scalars().all()

    # Check correctness
    correct_option_ids = {opt.id for opt in selected_options if opt.is_correct}
    all_correct_ids = {opt.id for opt in selected_options if opt.is_correct}
    is_correct = correct_option_ids == all_correct_ids and len(selected_options) > 0

    points = question.points if is_correct else 0

    # Check if response already exists (upsert behavior)
    existing_response_result = await db.execute(
        select(ActivityResponse)
        .where(ActivityResponse.attempt_id == attempt_id)
        .where(ActivityResponse.question_id == request.question_id)
    )
    existing_response = existing_response_result.scalar_one_or_none()

    if existing_response:
        # Update existing response
        existing_response.selected_option_ids = request.selected_option_ids
        existing_response.is_correct = is_correct
        existing_response.points_earned = points
        existing_response.time_spent_seconds = 0  # TODO: track time
        response = existing_response
    else:
        # Record new response
        response = ActivityResponse(
            attempt_id=attempt_id,
            question_id=request.question_id,
            selected_option_ids=request.selected_option_ids,
            is_correct=is_correct,
            points_earned=points,
            time_spent_seconds=0,  # TODO: track time
        )
        db.add(response)

    # Update attempt status
    attempt.status = "in_progress"

    # Update attempt metadata to track progress (store in attempt.metadata_json)
    if attempt.metadata_json is None:
        attempt.metadata_json = {}
    # current_question_index is 0-indexed (0 for first question)
    # answers_submitted is 1-indexed (1 for first answer)
    attempt.metadata_json["current_question_index"] = attempt.metadata_json.get("current_question_index", 0)
    attempt.metadata_json["accumulated_score"] = attempt.metadata_json.get("accumulated_score", 0) + points
    attempt.metadata_json["answers_submitted"] = attempt.metadata_json.get("answers_submitted", 0) + 1

    await db.commit()

    # Return progress info for frontend
    saved_progress = None
    if attempt.metadata_json:
        saved_progress = {
            "current_question_index": attempt.metadata_json.get("current_question_index", 0),
            "accumulated_score": attempt.metadata_json.get("accumulated_score", 0),
            "answers_submitted": attempt.metadata_json.get("answers_submitted", 0),
        }

    return {
        "is_correct": is_correct,
        "points_earned": points,
        "correct_options": [opt.id for opt in selected_options if opt.is_correct],
        "saved_progress": saved_progress,
        "lesson_progress": None,  # Could add lesson progress here if needed
    }


@router.post("/attempts/{attempt_id}/complete", response_model=AttemptCompleteResponse)
async def complete_activity_attempt(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Complete activity attempt and calculate rewards."""
    student = await get_student_profile(db, current_user.id)

    from app.models import ActivityAttempt, ActivityResponse, StudentReward, StudentRewardAward, StudentLessonProgress, Activity
    from sqlalchemy.orm import selectinload

    attempt_result = await db.execute(
        select(ActivityAttempt)
        .options(selectinload(ActivityAttempt.activity))
        .where(ActivityAttempt.id == attempt_id)
        .where(ActivityAttempt.student_id == student.id)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise NotFoundException("Attempt not found")

    if attempt.status == "completed":
        raise ValidationException("Attempt already completed")

    # Get all responses
    responses_result = await db.execute(
        select(ActivityResponse)
        .where(ActivityResponse.attempt_id == attempt_id)
    )
    responses = responses_result.scalars().all()

    total_points = sum(r.points_earned for r in responses)
    max_points = sum(q.points for q in (
        await db.execute(select(Question).where(Question.activity_id == attempt.activity_id))
    ).scalars().all())

    score = int((total_points / max_points) * 100) if max_points > 0 else 0
    passed = score >= 70  # 70% pass threshold

    # Update attempt
    attempt.status = "completed"
    attempt.completed_at = datetime.now(timezone.utc)
    attempt.score = score
    attempt.max_score = max_points
    attempt.passed = passed

    # Update lesson progress
    if attempt.lesson_progress_id:
        progress_result = await db.execute(
            select(StudentLessonProgress)
            .where(StudentLessonProgress.id == attempt.lesson_progress_id)
        )
        progress = progress_result.scalar_one_or_none()
        if progress:
            # Calculate overall lesson progress
            total_activities_result = await db.execute(
                select(func.count(Activity.id))
                .where(Activity.lesson_id == progress.lesson_id)
                .where(Activity.status == "published")
                .where(Activity.is_active == True)
            )
            total_activities = total_activities_result.scalar() or 1

            completed_activities_result = await db.execute(
                select(func.count(ActivityAttempt.id))
                .where(ActivityAttempt.student_id == student.id)
                .where(ActivityAttempt.activity.has(Activity.lesson_id == progress.lesson_id))
                .where(ActivityAttempt.status == "completed")
            )
            completed_activities = completed_activities_result.scalar() or 0

            progress.completion_percentage = int((completed_activities / total_activities) * 100)
            if completed_activities >= total_activities:
                progress.status = "completed"
                progress.completed_at = datetime.now(timezone.utc)

    # Award rewards
    rewards_earned = []
    if passed:
        # Perfect score reward
        if score == 100:
            perfect_reward_result = await db.execute(
                select(StudentReward).where(StudentReward.code == "perfect_score")
            )
            perfect_reward = perfect_reward_result.scalar_one_or_none()
            if perfect_reward:
                existing = await db.execute(
                    select(StudentRewardAward)
                    .where(StudentRewardAward.student_id == student.id)
                    .where(StudentRewardAward.reward_id == perfect_reward.id)
                )
                if not existing.scalar_one_or_none():
                    award = StudentRewardAward(
                        student_id=student.id,
                        reward_id=perfect_reward.id,
                        attempt_id=attempt_id,
                    )
                    db.add(award)
                    rewards_earned.append({
                        "name": perfect_reward.name,
                        "type": perfect_reward.reward_type,
                        "image_url": perfect_reward.image_url,
                    })

    # First activity reward (only for passed attempts)
    if passed:
        first_activity_result = await db.execute(
            select(func.count(ActivityAttempt.id))
            .where(ActivityAttempt.student_id == student.id)
            .where(ActivityAttempt.status == "completed")
        )
        if first_activity_result.scalar() == 1:
            first_reward_result = await db.execute(
                select(StudentReward).where(StudentReward.code == "first_star")
            )
            first_reward = first_reward_result.scalar_one_or_none()
            if first_reward:
                existing = await db.execute(
                    select(StudentRewardAward)
                    .where(StudentRewardAward.student_id == student.id)
                    .where(StudentRewardAward.reward_id == first_reward.id)
                )
                if not existing.scalar_one_or_none():
                    award = StudentRewardAward(
                        student_id=student.id,
                        reward_id=first_reward.id,
                        attempt_id=attempt_id,
                    )
                    db.add(award)
                    rewards_earned.append({
                        "name": first_reward.name,
                        "type": first_reward.reward_type,
                        "image_url": first_reward.image_url,
                    })

    # Find next activity
    next_activity_id = None
    activity_result = await db.execute(
        select(Activity)
        .where(Activity.lesson_id == attempt.activity.lesson_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
        .where(Activity.display_order > attempt.activity.display_order)
        .order_by(Activity.display_order)
        .limit(1)
    )
    next_activity = activity_result.scalar_one_or_none()
    if next_activity:
        next_activity_id = next_activity.id

    # Update lesson progress with streak calculation
    if attempt.lesson_progress_id:
        progress_result = await db.execute(
            select(StudentLessonProgress)
            .where(StudentLessonProgress.id == attempt.lesson_progress_id)
        )
        progress = progress_result.scalar_one_or_none()
        if progress:
            # Calculate streak
            current_streak, longest_streak = await calculate_streak(
                db, student, datetime.now(timezone.utc).date()
            )
            progress.current_streak = current_streak
            progress.longest_streak = longest_streak

    # Calculate streak if passed
    streak_info = None
    if passed:
        current_streak, longest_streak = await calculate_streak(
            db, student, datetime.now(timezone.utc).date()
        )
        streak_info = {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_activity_date": datetime.now(timezone.utc).date().isoformat(),
        }

    await db.commit()

    return AttemptCompleteResponse(
        score=score,
        passed=passed,
        rewards_earned=rewards_earned,
        next_activity_id=next_activity_id,
        streak=streak_info,
    )


@router.get("/me/rewards", response_model=List[RewardResponse])
async def get_my_rewards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all rewards with earned status."""
    student = await get_student_profile(db, current_user.id)

    from app.models import StudentReward, StudentRewardAward

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

        result.append(RewardResponse(
            id=reward.id,
            code=reward.code,
            name=reward.name,
            description=reward.description,
            reward_type=reward.reward_type,
            image_url=reward.image_url,
            points_value=reward.points_value,
            earned=award is not None,
            earned_at=award.earned_at.isoformat() if award else None,
        ))

    return result


@router.get("/me/history", response_model=List[HistoryItemResponse])
async def get_my_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get learning history."""
    student = await get_student_profile(db, current_user.id)

    from app.models import ActivityAttempt, Activity, Lesson

    result = await db.execute(
        select(ActivityAttempt, Activity, Lesson)
        .join(Activity, ActivityAttempt.activity_id == Activity.id)
        .join(Lesson, Activity.lesson_id == Lesson.id)
        .where(ActivityAttempt.student_id == student.id)
        .where(ActivityAttempt.status == "completed")
        .order_by(ActivityAttempt.completed_at.desc())
        .limit(50)
    )

    history = []
    for attempt, activity, lesson in result.all():
        history.append(HistoryItemResponse(
            id=attempt.id,
            lesson_id=lesson.id,
            lesson_title=lesson.code,  # Would need translation
            activity_id=activity.id,
            activity_title=activity.code,
            status=attempt.status,
            score=attempt.score,
            completed_at=attempt.completed_at.isoformat() if attempt.completed_at else None,
            time_spent_seconds=attempt.time_spent_seconds,
        ))

    return history


@router.patch("/me/preferences")
async def update_preferences(
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update student preferences."""
    student = await get_student_profile(db, current_user.id)

    from app.models import UserPreference

    # Update student profile preferences
    if "preferred_language" in request:
        student.preferred_language = request["preferred_language"]
    if "audio_enabled" in request:
        student.audio_enabled = request["audio_enabled"]
    if "reduced_motion" in request:
        student.reduced_motion = request["reduced_motion"]
    if "high_contrast" in request:
        student.high_contrast = request["high_contrast"]

    # Update user preferences table
    prefs_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == student.user_id)
    )
    prefs = prefs_result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreference(user_id=student.user_id)
        db.add(prefs)

    if "audio_volume" in request:
        prefs.audio_volume = request["audio_volume"]
    if "narration_speed" in request:
        prefs.narration_speed = request["narration_speed"]
    if "font_size" in request:
        prefs.font_size = request["font_size"]
    if "screen_reader_optimized" in request:
        prefs.screen_reader_optimized = request["screen_reader_optimized"]

    await db.commit()

    return {"message": "Preferences updated"}


# Stage 5D: Next Activity Recommendation Endpoint

@router.get("/me/next-activity", response_model=NextActivityRecommendationResponse)
async def get_next_activity_recommendation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the next recommended activity for the current student.

    Uses the adaptive learning recommendation engine to determine the next
    activity based on the student's mastery level, review schedule, and
    curriculum progression.

    Returns:
    - activity_id: ID of the recommended activity (null if no eligible activity)
    - reason: Reason for the recommendation (e.g., "cold_start_sequence", "review_overdue", "remediate_repeat", "maintain_practice", "advance_next", "curriculum_sequence", "no_more_activities", "attempt_not_found", "activity_not_found", "lesson_not_found")
    - confidence: Confidence level ("low", "medium", "high")
    - mastery_score: Overall accuracy score (0-1) if sufficient evidence exists
    - tier: Mastery tier ("cold_start", "remediate", "maintain", "advance")
    - has_evidence: Whether there's sufficient attempt history for reliable recommendations
    - activity: Full activity details if activity_id is present
    """
    student = await get_student_profile(db, current_user.id)

    recommendation_service = RecommendationService(db)

    # Strategy: Use the most recently completed attempt's activity as the anchor.
    # If no completed attempts, we'll need to find a starting point.

    from app.models import ActivityAttempt

    # Find the most recent completed attempt
    latest_attempt_result = await db.execute(
        select(ActivityAttempt)
        .where(ActivityAttempt.student_id == student.id)
        .where(ActivityAttempt.status == "completed")
        .order_by(ActivityAttempt.completed_at.desc().nullslast())
        .limit(1)
    )
    latest_attempt = latest_attempt_result.scalar_one_or_none()

    if not latest_attempt:
        # Cold start: no completed attempts yet
        # Find the first activity in the student's current stage
        recommendation_result = await _get_cold_start_recommendation(db, student, recommendation_service)
        return await _build_recommendation_response(recommendation_result, db)

    # Use the latest completed activity as the anchor for recommendation
    recommendation_result = await recommendation_service.recommend_next_activity(
        student_id=student.id,
        activity_id=latest_attempt.activity_id,
    )

    return await _build_recommendation_response(recommendation_result, db)


async def _get_cold_start_recommendation(
    db: AsyncSession,
    student: StudentProfile,
    recommendation_service: RecommendationService,
) -> RecommendationResult:
    """Get a cold start recommendation for a student with no completed attempts."""
    # Find the first activity in the student's current stage
    from app.models import Activity, Lesson, Topic, Subject

    if not student.current_stage_id:
        return RecommendationResult(
            activity_id=None,
            reason="no_stage_assigned",
            confidence="low",
            mastery_score=None,
            tier="cold_start",
            has_evidence=False,
        )

    result = await db.execute(
        select(Activity)
        .join(Lesson, Activity.lesson_id == Lesson.id)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .where(Subject.stage_id == student.current_stage_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
        .order_by(Subject.display_order, Lesson.display_order, Activity.display_order)
    )
    activities = result.scalars().all()

    if not activities:
        return RecommendationResult(
            activity_id=None,
            reason="no_activities_in_stage",
            confidence="low",
            mastery_score=None,
            tier="cold_start",
            has_evidence=False,
        )

    # Return the first activity as cold start recommendation
    first_activity = activities[0]
    return RecommendationResult(
        activity_id=first_activity.id,
        reason="cold_start_sequence",
        confidence="medium",
        mastery_score=None,
        tier="cold_start",
        has_evidence=False,
    )


async def _build_recommendation_response(result: RecommendationResult, db: AsyncSession) -> NextActivityRecommendationResponse:
    """Build the API response from a RecommendationResult."""
    response = NextActivityRecommendationResponse(
        activity_id=result.activity_id,
        reason=result.reason,
        confidence=result.confidence,
        mastery_score=result.mastery_score,
        tier=result.tier,
        has_evidence=result.has_evidence,
    )

    # If we have an activity_id, fetch the full activity details
    if result.activity_id:
        from app.models import Activity, Lesson

        activity_result = await db.execute(
            select(Activity)
            .options(selectinload(Activity.lesson).selectinload(Lesson.topic).selectinload(Topic.subject))
            .where(Activity.id == result.activity_id)
        )
        activity = activity_result.scalar_one_or_none()

        if activity:
            # Build activity detail response
            # Get questions for this activity
            from app.models import Question, AnswerOption

            questions_result = await db.execute(
                select(Question)
                .where(Question.activity_id == activity.id)
                .where(Question.is_active == True)
                .order_by(Question.display_order)
            )
            questions = questions_result.scalars().all()

            questions_data = []
            for q in questions:
                options_result = await db.execute(
                    select(AnswerOption)
                    .where(AnswerOption.question_id == q.id)
                    .order_by(AnswerOption.display_order)
                )
                options = options_result.scalars().all()

                options_data = []
                for opt in options:
                    options_data.append({
                        "id": opt.id,
                        "text": opt.text,
                        "image_url": opt.image_url,
                        "is_correct": opt.is_correct,
                        "display_order": opt.display_order,
                    })

                questions_data.append({
                    "id": q.id,
                    "question_type": q.question_type,
                    "prompt": q.prompt,
                    "points": q.points,
                    "display_order": q.display_order,
                    "options": options_data,
                })

            # Get activity translation
            from app.models import ActivityTranslation

            trans_result = await db.execute(
                select(ActivityTranslation).where(
                    ActivityTranslation.activity_id == activity.id,
                    ActivityTranslation.language == "en"
                )
            )
            act_trans = trans_result.scalar_one_or_none()

            activity_detail = ActivityDetailResponse(
                id=activity.id,
                code=activity.code,
                type=activity.type.value,
                title=act_trans.title if act_trans else activity.code,
                instructions=act_trans.instructions if act_trans else None,
                estimated_duration_minutes=activity.estimated_duration_minutes,
                configuration=activity.configuration,
                questions=questions_data,
            )
            response.activity = activity_detail

    return response


# Helper functions (preserved from current working version)
async def get_student_profile(db: AsyncSession, user_id: int) -> StudentProfile:
    """Get student profile for current user."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.user_id == user_id)
        .options(selectinload(StudentProfile.current_stage))
    )
    student = result.scalar_one_or_none()
    if not student or student.is_deleted:
        raise NotFoundException("Student profile not found")
    return student


async def update_lesson_progress(
    db: AsyncSession,
    student: StudentProfile,
    lesson_id: int,
    activity_id: Optional[int] = None,
) -> StudentLessonProgress:
    """Create or update lesson progress for a student.

    Updates last_activity_at, current_activity_id (if provided), and
    recalculates completion_percentage based on completed activities.
    Marks the lesson completed when all published activities are done.
    """
    # Get or create lesson progress
    progress_result = await db.execute(
        select(StudentLessonProgress)
        .where(StudentLessonProgress.student_id == student.id)
        .where(StudentLessonProgress.lesson_id == lesson_id)
    )
    progress = progress_result.scalar_one_or_none()
    if not progress:
        progress = StudentLessonProgress(
            student_id=student.id,
            lesson_id=lesson_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            last_activity_at=datetime.now(timezone.utc),  # Set last_activity_at on creation
        )
        db.add(progress)
        await db.flush()
    else:
        # Always refresh activity timestamp
        progress.last_activity_at = datetime.now(timezone.utc)

    # Track current activity if provided
    if activity_id is not None:
        progress.current_activity_id = activity_id

    # Count total published, active activities for this lesson
    total_result = await db.execute(
        select(func.count(Activity.id))
        .where(Activity.lesson_id == lesson_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
    )
    total_activities = total_result.scalar() or 0

    # Count distinct activities the student has completed
    completed_result = await db.execute(
        select(func.count(func.distinct(ActivityAttempt.activity_id)))
        .join(Activity, ActivityAttempt.activity_id == Activity.id)
        .where(ActivityAttempt.student_id == student.id)
        .where(ActivityAttempt.status == "completed")
        .where(Activity.lesson_id == lesson_id)
        .where(Activity.status == "published")
        .where(Activity.is_active == True)
    )
    completed_activities = completed_result.scalar() or 0

    # Recalculate completion percentage (guard against division by zero)
    if total_activities > 0:
        progress.completion_percentage = int(
            (completed_activities / total_activities) * 100
        )
    else:
        progress.completion_percentage = 0

    # Update status based on completion
    if total_activities > 0 and completed_activities >= total_activities:
        progress.status = "completed"
        if progress.completed_at is None:
            progress.completed_at = datetime.now(timezone.utc)
    else:
        if progress.status == "not_started":
            progress.status = "in_progress"
        # Keep completion_percentage as calculated; don't override status to completed

    return progress


async def calculate_streak(
    db: AsyncSession,
    student: StudentProfile,
    completion_date: date,
) -> tuple[int, int]:
    """Calculate and update streak based on lesson completion date.

    Streak rules:
    - First qualifying completion sets streak to 1
    - Same-day repeated completions do not increment streak
    - Consecutive calendar day extends streak by 1
    - Missed day(s) resets streak to 1
    - longest_streak is the maximum streak ever achieved

    Returns (current_streak, longest_streak).
    """
    # Reload student.last_activity_date from DB to get fresh value
    result = await db.execute(
        select(StudentProfile.last_activity_date).where(StudentProfile.id == student.id)
    )
    student.last_activity_date = result.scalar_one()
    today = completion_date

    if student.last_activity_date is None:
        # First qualifying completion
        student.current_streak = 1
        student.longest_streak = max(student.longest_streak, 1)
    elif student.last_activity_date == today:
        # Same day - do not increment
        pass
    elif student.last_activity_date == today - timedelta(days=1):
        # Consecutive calendar day
        student.current_streak += 1
        student.longest_streak = max(student.longest_streak, student.current_streak)
    else:
        # Missed day(s) - reset streak
        student.current_streak = 1
        student.longest_streak = max(student.longest_streak, 1)

    student.last_activity_date = today
    return student.current_streak, student.longest_streak
