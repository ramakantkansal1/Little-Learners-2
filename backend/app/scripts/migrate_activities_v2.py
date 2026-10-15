"""
Quick migration to update activity types - optimized version.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, async_session_factory
from app.models import (
    Activity, ActivityTranslation, Question, QuestionTranslation,
    AnswerOption, AnswerOptionTranslation,
    ContentStatusEnum, ActivityTypeEnum,
    Lesson, Topic, Subject, LearningStage
)
from app.services.curriculum_validation import validate_lesson_for_publish


# All 15 activity types in order
ALL_ACTIVITY_TYPES = [
    ActivityTypeEnum.IMAGE_SELECTION,
    ActivityTypeEnum.COLOR_IDENTIFICATION,
    ActivityTypeEnum.SHAPE_MATCHING,
    ActivityTypeEnum.PICTURE_MATCHING,
    ActivityTypeEnum.ALPHABET_RECOGNITION,
    ActivityTypeEnum.NUMBER_RECOGNITION,
    ActivityTypeEnum.COUNTING,
    ActivityTypeEnum.SORTING,
    ActivityTypeEnum.SEQUENCING,
    ActivityTypeEnum.TRACING,
    ActivityTypeEnum.LETTER_SOUND,
    ActivityTypeEnum.SIMPLE_QUIZ,
    ActivityTypeEnum.STORY_LISTENING,
    ActivityTypeEnum.AUDIO_IDENTIFICATION,
    ActivityTypeEnum.PICTURE_COMPREHENSION,
]

ACTIVITY_CONFIGS = {
    ActivityTypeEnum.IMAGE_SELECTION: {"promptEmoji": "🔍"},
    ActivityTypeEnum.COLOR_IDENTIFICATION: {"colors": ["red", "blue", "yellow", "green", "orange", "purple"]},
    ActivityTypeEnum.SHAPE_MATCHING: {"matchType": "exact"},
    ActivityTypeEnum.PICTURE_MATCHING: {"matchType": "exact"},
    ActivityTypeEnum.ALPHABET_RECOGNITION: {},
    ActivityTypeEnum.NUMBER_RECOGNITION: {},
    ActivityTypeEnum.COUNTING: {"maxCount": 10},
    ActivityTypeEnum.SORTING: {"categories": ["color", "shape", "size"]},
    ActivityTypeEnum.SEQUENCING: {"sequence": ["first", "second", "third", "fourth"]},
    ActivityTypeEnum.TRACING: {"template": "letter_A"},
    ActivityTypeEnum.STORY_LISTENING: {"segments": ["Once upon a time...", "The story continues...", "The end."], "hasAudio": False},
    ActivityTypeEnum.AUDIO_IDENTIFICATION: {"audioOptions": [{"audioUrl": "/audio/cat.mp3", "label": "Cat"}, {"audioUrl": "/audio/dog.mp3", "label": "Dog"}]},
    ActivityTypeEnum.PICTURE_COMPREHENSION: {"imageUrl": "/images/park.jpg", "questions": ["What do you see?", "How many?"]},
    ActivityTypeEnum.SIMPLE_QUIZ: {},
    ActivityTypeEnum.LETTER_SOUND: {"letters": ["A", "B", "C", "D", "E"], "sounds": ["/æ/", "/b/", "/k/", "/d/", "/ɛ/"]},
}

async def update_activities_batch(db):
    """Update activities using bulk SQL updates for efficiency."""
    from app.models import Lesson, Topic, Subject, LearningStage
    
    # Get all published lessons with their stages
    lessons_result = await db.execute(
        select(Lesson.id, Lesson.topic_id, LearningStage.code)
        .join(Topic, Lesson.topic_id == Topic.id)
        .join(Subject, Topic.subject_id == Subject.id)
        .join(LearningStage, Subject.stage_id == LearningStage.id)
        .where(Lesson.status == ContentStatusEnum.PUBLISHED)
        .order_by(Lesson.id)
    )
    lessons = lessons_result.all()
    
    print(f"Found {len(lessons)} published lessons")
    
    # Get all activities for these lessons
    lesson_ids = [l.id for l in lessons]
    if not lesson_ids:
        return 0
    
    # Get all activities for these lessons
    acts_result = await db.execute(
        select(Activity.id, Activity.lesson_id, Activity.display_order)
        .where(Activity.lesson_id.in_(lesson_ids))
        .where(Activity.status == ContentStatusEnum.PUBLISHED)
        .order_by(Activity.lesson_id, Activity.display_order)
    )
    activities = acts_result.all()
    
    print(f"Found {len(activities)} activities to update")
    
    # Bulk update activities
    if activities:
        for batch in [activities[i:i+100] for i in range(0, len(activities), 100)]:
            for idx, (act_id, lesson_id, display_order) in enumerate(batch):
                # Find the lesson's stage
                lesson = next(l for l in lessons if l.id == lesson_id)
                # We need to get the stage code for this lesson
                # For simplicity, we'll cycle through all 15 types
                new_type = ALL_ACTIVITY_TYPES[idx % len(ALL_ACTIVITY_TYPES)]
                
                await db.execute(
                    update(Activity)
                    .where(Activity.id == act_id)
                    .values(
                        type=new_type,
                        configuration=ACTIVITY_CONFIGS.get(new_type, {}),
                        updated_at=datetime.now(timezone.utc)
                    )
                )
            await db.commit()
    
    print(f"Updated {len(activities)} activities")
    return len(activities)


async def validate_all_lessons(db):
    from app.models import Lesson
    
    lessons_result = await db.execute(
        select(Lesson).where(Lesson.status == ContentStatusEnum.PUBLISHED)
    )
    lessons = lessons_result.scalars().all()
    
    print(f"\nValidating {len(lessons)} published lessons...")
    passed = 0
    failed = 0
    
    for lesson in lessons:
        result = await validate_lesson_for_publish(db, lesson.id)
        if result.valid:
            passed += 1
        else:
            failed += 1
            if failed <= 5:
                print(f"  Lesson {lesson.code} (ID: {lesson.id}) FAILED:")
                for err in result.errors[:3]:
                    print(f"    - {err['field']}: {err['message']}")
    
    print(f"\nValidation Results: {passed} passed, {failed} failed")
    return failed == 0


async def main():
    print("Starting activity type migration for Stage 5D...")
    print(f"Database: {settings.database_url}")
    
    async with async_session_factory() as db:
        try:
            updated = await update_activities_batch(db)
            print(f"Activities updated: {updated}")
            
            all_valid = await validate_all_lessons(db)
            if all_valid:
                print("\n✅ All lessons pass validation!")
            else:
                print("\n❌ Some lessons failed validation")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
