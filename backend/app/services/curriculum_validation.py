"""
Curriculum validation service for Stage 5C.
Validates lesson completeness before publishing.
"""
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Lesson, Activity, Question, AnswerOption, LessonTranslation,
    ActivityTranslation, ContentStatusEnum, ActivityTypeEnum
)


class ValidationError(Exception):
    """Validation error with field-specific details."""
    def __init__(self, message: str, field: str = "", code: str = "VALIDATION_ERROR"):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(message)


class LessonValidationResult:
    """Result of lesson validation."""
    def __init__(self):
        self.valid: bool = True
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
    
    def add_error(self, field: str, message: str, code: str = "VALIDATION_ERROR"):
        self.valid = False
        self.errors.append({"field": field, "message": message, "code": code})
    
    def add_warning(self, field: str, message: str, code: str = "VALIDATION_WARNING"):
        self.warnings.append({"field": field, "message": message, "code": code})
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "errors": self.errors,
            "warnings": self.warnings
        }


async def validate_lesson_for_publish(
    db: AsyncSession,
    lesson_id: int,
    required_languages: List[str] = None
) -> LessonValidationResult:
    """
    Validate a lesson for publishing.
    
    Checks:
    - Lesson has required fields (code, topic_id, etc.)
    - Lesson has at least one translation for required languages
    - Lesson has at least one activity
    - All activities have valid configuration
    - All activities have at least one question
    - All questions have at least one correct answer
    - All questions have valid options
    - Activity-specific configuration is valid
    
    Args:
        db: Database session
        lesson_id: Lesson to validate
        required_languages: List of language codes that must have translations (default: ['en'])
    
    Returns:
        LessonValidationResult with errors and warnings
    """
    if required_languages is None:
        required_languages = ['en']
    
    result = LessonValidationResult()
    
    # Load lesson with all relationships
    lesson_result = await db.execute(
        select(Lesson)
        .options(
            selectinload(Lesson.translations),
            selectinload(Lesson.activities)
            .selectinload(Activity.translations),
            selectinload(Lesson.activities)
            .selectinload(Activity.questions)
            .selectinload(Question.answer_options),
            selectinload(Lesson.activities)
            .selectinload(Activity.translations)
        )
        .where(Lesson.id == lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()
    
    if not lesson:
        result.add_error("lesson", "Lesson not found", "NOT_FOUND")
        return result
    
    # 1. Validate lesson required fields
    if not lesson.code or not lesson.code.strip():
        result.add_error("lesson.code", "Lesson code is required")
    
    if not lesson.topic_id:
        result.add_error("lesson.topic_id", "Lesson must belong to a topic")
    
    if lesson.estimated_duration_minutes is not None and lesson.estimated_duration_minutes < 1:
        result.add_warning("lesson.estimated_duration_minutes", "Duration should be at least 1 minute")
    
    # 2. Validate translations for required languages
    lesson_translations = {t.language: t for t in lesson.translations}
    for lang in required_languages:
        trans = lesson_translations.get(lang)
        if not trans:
            result.add_error(f"lesson.translations.{lang}", f"Missing translation for language '{lang}'")
        else:
            if not trans.title or not trans.title.strip():
                result.add_error(f"lesson.translations.{lang}.title", f"Title is required for language '{lang}'")
    
    # 3. Validate at least one activity
    if not lesson.activities:
        result.add_error("lesson.activities", "Lesson must have at least one activity")
    else:
        active_activities = [a for a in lesson.activities if a.is_active and a.deleted_at is None]
        if not active_activities:
            result.add_error("lesson.activities", "Lesson must have at least one active activity")
        else:
            # Validate each activity
            for idx, activity in enumerate(active_activities):
                await _validate_activity(db, activity, result, idx)
    
    return result


async def _validate_activity(
    db: AsyncSession,
    activity: Activity,
    result: LessonValidationResult,
    activity_index: int
) -> None:
    """Validate a single activity."""
    prefix = f"activities[{activity_index}]"
    
    # Required fields
    if not activity.code or not activity.code.strip():
        result.add_error(f"{prefix}.code", "Activity code is required")
    
    if not activity.type:
        result.add_error(f"{prefix}.type", "Activity type is required")
    
    if activity.estimated_duration_minutes is not None and activity.estimated_duration_minutes < 1:
        result.add_warning(f"{prefix}.estimated_duration_minutes", "Duration should be at least 1 minute")
    
    # Validate activity translations
    activity_translations = {t.language: t for t in activity.translations}
    if 'en' not in activity_translations:
        result.add_error(f"{prefix}.translations.en", "English translation is required for activity")
    else:
        trans = activity_translations['en']
        if not trans.title or not trans.title.strip():
            result.add_error(f"{prefix}.translations.en.title", "English title is required for activity")
    
    # Validate activity configuration using registry
    config_errors = _validate_activity_configuration(activity.type, activity.configuration)
    for err in config_errors:
        result.add_error(f"{prefix}.configuration", err)
    
    # Validate questions
    active_questions = [q for q in activity.questions if q.is_active and q.deleted_at is None]
    if not active_questions:
        result.add_error(f"{prefix}.questions", "Activity must have at least one question")
    else:
        for q_idx, question in enumerate(active_questions):
            await _validate_question(question, result, f"{prefix}.questions[{q_idx}]")


def _validate_activity_configuration(
    activity_type: ActivityTypeEnum,
    configuration: Optional[Dict[str, Any]]
) -> List[str]:
    """Validate activity type-specific configuration."""
    errors = []
    
    if configuration is None:
        return errors
    
    # Type-specific validation matching frontend registry
    if activity_type == ActivityTypeEnum.COUNTING:
        max_count = configuration.get('maxCount')
        if max_count is not None and (not isinstance(max_count, int) or max_count < 1):
            errors.append("counting activity requires maxCount number >= 1")
    
    elif activity_type == ActivityTypeEnum.SEQUENCING:
        sequence = configuration.get('sequence')
        if sequence is not None and (not isinstance(sequence, list) or len(sequence) < 2):
            errors.append("sequencing activity requires sequence array with at least 2 items")
    
    elif activity_type == ActivityTypeEnum.SORTING:
        categories = configuration.get('categories')
        if categories is not None and (not isinstance(categories, list) or len(categories) < 2):
            errors.append("sorting activity requires categories array with at least 2 items")
    
    elif activity_type == ActivityTypeEnum.TRACING:
        # Tracing needs template or stroke data
        if not configuration.get('template') and not configuration.get('strokes'):
            errors.append("tracing activity requires template or strokes configuration")
    
    elif activity_type == ActivityTypeEnum.STORY_LISTENING:
        # Story listening needs audio or text segments
        segments = configuration.get('segments')
        audio_url = configuration.get('audioUrl')
        if (not isinstance(segments, list) or len(segments) == 0) and not audio_url:
            errors.append("story_listening activity requires non-empty segments array or audioUrl")
    
    elif activity_type == ActivityTypeEnum.AUDIO_IDENTIFICATION:
        # Audio identification needs audio options
        audio_options = configuration.get('audioOptions')
        if not isinstance(audio_options, list) or len(audio_options) < 2:
            errors.append("audio_identification activity requires audioOptions array with at least 2 items")
    
    return errors


async def _validate_question(
    question: Question,
    result: LessonValidationResult,
    prefix: str
) -> None:
    """Validate a single question."""
    # Required fields
    if not question.prompt or not question.prompt.strip():
        result.add_error(f"{prefix}.prompt", "Question prompt is required")
    
    if question.points is not None and question.points < 1:
        result.add_warning(f"{prefix}.points", "Points should be at least 1")
    
    # Validate answer options
    options = [opt for opt in question.answer_options if opt is not None]
    if not options:
        result.add_error(f"{prefix}.options", "Question must have at least one answer option")
        return
    
    correct_options = [opt for opt in options if opt.is_correct]
    
    # Question type specific validation
    if question.question_type in ('single_choice', 'multiple_choice'):
        if len(options) < 2:
            result.add_error(f"{prefix}.options", f"{question.question_type} requires at least 2 options")
        if not correct_options:
            result.add_error(f"{prefix}.options", "At least one correct answer is required")
        
        if question.question_type == 'single_choice' and len(correct_options) > 1:
            result.add_error(f"{prefix}.options", "Single choice question must have exactly one correct answer")
    
    elif question.question_type == 'true_false':
        if len(options) != 2:
            result.add_error(f"{prefix}.options", "True/false question must have exactly 2 options")
        if len(correct_options) != 1:
            result.add_error(f"{prefix}.options", "True/false question must have exactly one correct answer")
    
    elif question.question_type in ('drag_drop', 'matching'):
        if len(options) < 2:
            result.add_error(f"{prefix}.options", f"{question.question_type} requires at least 2 options")
        if not correct_options:
            result.add_error(f"{prefix}.options", "At least one correct answer is required")
    
    # Validate each option
    for opt_idx, option in enumerate(options):
        if not option.text or not option.text.strip():
            result.add_error(f"{prefix}.options[{opt_idx}].text", "Option text is required")
        
        # For image-based activities, image might be required
        if question.question_type in ('image_selection', 'picture_matching') and not option.image_url:
            result.add_warning(f"{prefix}.options[{opt_idx}].image_url", "Image recommended for this question type")


async def validate_activity_for_publish(
    db: AsyncSession,
    activity_id: int
) -> LessonValidationResult:
    """Validate a single activity for publishing."""
    result = LessonValidationResult()
    
    activity_result = await db.execute(
        select(Activity)
        .options(
            selectinload(Activity.translations),
            selectinload(Activity.questions)
            .selectinload(Question.answer_options),
            selectinload(Activity.translations)
        )
        .where(Activity.id == activity_id)
    )
    activity = activity_result.scalar_one_or_none()
    
    if not activity:
        result.add_error("activity", "Activity not found", "NOT_FOUND")
        return result
    
    await _validate_activity(db, activity, result, 0)
    return result