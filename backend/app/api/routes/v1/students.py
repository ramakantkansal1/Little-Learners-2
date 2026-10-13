"""
Student API endpoints.
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
    User, StudentProfile, LearningStage, Lesson, Activity,
    StudentLessonProgress, ActivityAttempt, ActivityResponse,
    Question, AnswerOption, StudentRewardAward, StudentReward,
    ContentStatusEnum, ActivityTypeEnum
)
from app.permissions.dependencies import get_current_user
from app.permissions.roles import Permission

router = APIRouter(tags=["students"])


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


class AnswerSubmitRequest(BaseModel):
    question_id: int
    selected_option_ids: List[int]


class AttemptCompleteResponse(BaseModel):
    score: int
    passed: bool
    rewards_earned: List[dict]
    next_activity_id: Optional[int]


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


def get_lesson_translations(db, lesson_id: int, language: str):
    """Get lesson translations for a language."""
    from app.models import LessonTranslation
    result = db.execute(
        select(LessonTranslation)
        .where(LessonTranslation.lesson_id == lesson_id)
        .where(LessonTranslation.language == language)
    )
    return result.scalar_one_or_none()


def get_activity_translations(db, activity_id: int, language: str):
    """Get activity translations for a language."""
    from app.models import ActivityTranslation
    result = db.execute(
        select(ActivityTranslation)
        .where(ActivityTranslation.activity_id == activity_id)
        .where(ActivityTranslation.language == language)
    )
    return result.scalar_one_or_none()


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
            "current_streak": 0,  # TODO: implement streak
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
    
    # Verify lesson exists and is published
    lesson_result = await db.execute(
        select(Lesson)
        .where(Lesson.id == lesson_id)
        .where(Lesson.status == "published")
        .where(Lesson.is_active == True)
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
        await db.commit()
    
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
                        "feedback_correct": opt.feedback_correct,
                        "feedback_incorrect": opt.feedback_incorrect,
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
    
    return {
        "id": lesson.id,
        "title": trans.title if trans else lesson.code,
        "description": trans.description if trans else None,
        "instructions": trans.instructions if trans else lesson.instructions,
        "estimated_duration_minutes": lesson.estimated_duration_minutes,
        "activities": activities_data,
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
        )
        db.add(progress)
        await db.flush()
    elif progress.status == "not_started":
        progress.status = "in_progress"
        progress.started_at = datetime.now(timezone.utc)
    
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
    
    return AttemptStartResponse(
        attempt_id=attempt.id,
        activity=activity_detail,
        questions=questions_data,
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
        )
        db.add(progress)
        await db.flush()
    elif progress.status == "not_started":
        progress.status = "in_progress"
        progress.started_at = datetime.now(timezone.utc)
    
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
    
    return AttemptStartResponse(
        attempt_id=attempt.id,
        activity=activity_detail,
        questions=questions_data,
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
    
    from app.models import ActivityAttempt, ActivityResponse, Question, AnswerOption
    
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
    
    # Record response
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
    
    await db.commit()
    
    return {
        "is_correct": is_correct,
        "points_earned": points,
        "correct_options": [opt.id for opt in selected_options if opt.is_correct],
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
    
    attempt_result = await db.execute(
        select(ActivityAttempt)
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
    
    # First activity reward
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
    
    await db.commit()
    
    return AttemptCompleteResponse(
        score=score,
        passed=passed,
        rewards_earned=rewards_earned,
        next_activity_id=next_activity_id,
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