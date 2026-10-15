"""
Migration script to update existing activities to use all 15 activity types
with proper configurations for Stage 5D.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
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


# Activity type configurations matching the frontend registry
ACTIVITY_TYPE_CONFIGS = {
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

# Stage-appropriate activity type distribution
STAGE_ACTIVITY_TYPES = {
    "playgroup": [
        ActivityTypeEnum.IMAGE_SELECTION,
        ActivityTypeEnum.COLOR_IDENTIFICATION,
        ActivityTypeEnum.SHAPE_MATCHING,
        ActivityTypeEnum.PICTURE_MATCHING,
        ActivityTypeEnum.SIMPLE_QUIZ,
        ActivityTypeEnum.STORY_LISTENING,
    ],
    "nursery": [
        ActivityTypeEnum.IMAGE_SELECTION,
        ActivityTypeEnum.COLOR_IDENTIFICATION,
        ActivityTypeEnum.SHAPE_MATCHING,
        ActivityTypeEnum.PICTURE_MATCHING,
        ActivityTypeEnum.ALPHABET_RECOGNITION,
        ActivityTypeEnum.NUMBER_RECOGNITION,
        ActivityTypeEnum.COUNTING,
        ActivityTypeEnum.SORTING,
        ActivityTypeEnum.SEQUENCING,
        ActivityTypeEnum.SIMPLE_QUIZ,
    ],
    "lkg": [
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
        ActivityTypeEnum.PICTURE_COMPREHENSION,
    ],
    "ukg": [
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
    ],
}

async def update_activities(db: AsyncSession):
    """Update existing activities to use all 15 activity types."""
    
    # Get all published lessons with their stages
    lessons_result = await db.execute(
        select(Lesson)
        .where(Lesson.status == ContentStatusEnum.PUBLISHED)
        .order_by(Lesson.id)
    )
    lessons = lessons_result.scalars().all()
    
    print(f"Found {len(lessons)} published lessons")
    
    # Get stage for each lesson
    from app.models import Topic, Subject, LearningStage
    
    updated_count = 0
    for lesson in lessons:
        # Get stage code
        topic_result = await db.execute(select(Topic).where(Topic.id == lesson.topic_id))
        topic = topic_result.scalar_one_or_none()
        if not topic:
            continue
            
        subject_result = await db.execute(select(Subject).where(Subject.id == topic.subject_id))
        subject = subject_result.scalar_one_or_none()
        if not subject:
            continue
            
        stage_result = await db.execute(select(LearningStage).where(LearningStage.id == subject.stage_id))
        stage = stage_result.scalar_one_or_none()
        if not stage:
            continue
        
        stage_code = stage.code
        
        # Get activities for this lesson
        acts_result = await db.execute(
            select(Activity)
            .where(Activity.lesson_id == lesson.id)
            .where(Activity.status == ContentStatusEnum.PUBLISHED)
            .order_by(Activity.display_order)
        )
        activities = acts_result.scalars().all()
        
        if not activities:
            continue
        
        # Get appropriate activity types for this stage
        stage_types = STAGE_ACTIVITY_TYPES.get(stage_code, [
            ActivityTypeEnum.IMAGE_SELECTION,
            ActivityTypeEnum.PICTURE_MATCHING,
            ActivityTypeEnum.SIMPLE_QUIZ,
        ])
        
        # Assign activity types cyclically to ensure diversity
        for idx, activity in enumerate(activities):
            new_type = stage_types[idx % len(stage_types)]
            config = ACTIVITY_TYPE_CONFIGS.get(new_type, {})
            
            # Update activity type and configuration
            activity.type = new_type
            activity.configuration = config
            activity.updated_at = datetime.now(timezone.utc)
            
            # Update activity translations
            act_trans_result = await db.execute(
                select(ActivityTranslation).where(ActivityTranslation.activity_id == activity.id)
            )
            translations = act_trans_result.scalars().all()
            
            for trans in translations:
                type_name = new_type.value.replace('_', ' ').title()
                trans.title = f"Activity {activity.display_order}: {type_name}" if trans.language == "en" else f"गतिविधि {activity.display_order}: {type_name}"
                trans.instructions = f"Complete this {type_name.lower()} activity" if trans.language == "en" else f"यह {type_name.lower()} गतिविधि पूरी करें"
            
            # Update questions with proper templates
            questions_result = await db.execute(
                select(Question)
                .where(Question.activity_id == activity.id)
                .where(Question.is_active == True)
                .order_by(Question.display_order)
            )
            questions = questions_result.scalars().all()
            
            for q_idx, question in enumerate(questions):
                # Update question type based on activity type
                question.question_type = get_question_type(new_type)
                question.updated_at = datetime.now(timezone.utc)
                
                # Update question translations
                q_trans_result = await db.execute(
                    select(QuestionTranslation).where(QuestionTranslation.question_id == question.id)
                )
                q_translations = q_trans_result.scalars().all()
                
                templates = QUESTION_TEMPLATES.get(new_type, QUESTION_TEMPLATES[ActivityTypeEnum.SIMPLE_QUIZ])
                template = templates[q_idx % len(templates)]
                
                for trans in q_translations:
                    trans.prompt = template.get(trans.language, template["en"])
                
                # Update answer options
                options_result = await db.execute(
                    select(AnswerOption)
                    .where(AnswerOption.question_id == question.id)
                    .order_by(AnswerOption.display_order)
                )
                options = options_result.scalars().all()
                
                content = get_activity_content(new_type, stage_code=subject.code if hasattr(subject, 'code') else 'nursery')
                correct_idx = content.get("correct", 0) if content else 0
                
                for o_idx, option in enumerate(options):
                    option.text = get_option_text(new_type, content, o_idx, o_idx == 0)
                    option.is_correct = (o_idx == 0)
                    option.updated_at = datetime.now(timezone.utc)
                    
                    # Update option translations
                    opt_trans_result = await db.execute(
                        select(AnswerOptionTranslation).where(AnswerOptionTranslation.answer_option_id == option.id)
                    )
                    opt_translations = opt_trans_result.scalars().all()
                    
                    for trans in opt_translations:
                        trans.text = option.text if trans.language == "en" else f"विकल्प {option.display_order}"
                        trans.feedback_correct = "Great job!" if trans.language == "en" else "बहुत बढ़िया!"
                        trans.feedback_incorrect = "Try again!" if trans.language == "en" else "फिर कोशिश करें!"
            
            updated_count += 1
    
    await db.commit()
    print(f"Updated {updated_count} activities across {len(lessons)} lessons")
    return updated_count


def get_question_type(atype: ActivityTypeEnum) -> str:
    """Map activity type to question type."""
    mapping = {
        ActivityTypeEnum.IMAGE_SELECTION: "single_choice",
        ActivityTypeEnum.COLOR_IDENTIFICATION: "single_choice",
        ActivityTypeEnum.SHAPE_MATCHING: "single_choice",
        ActivityTypeEnum.PICTURE_MATCHING: "single_choice",
        ActivityTypeEnum.ALPHABET_RECOGNITION: "single_choice",
        ActivityTypeEnum.NUMBER_RECOGNITION: "single_choice",
        ActivityTypeEnum.COUNTING: "single_choice",
        ActivityTypeEnum.SORTING: "single_choice",
        ActivityTypeEnum.SEQUENCING: "single_choice",
        ActivityTypeEnum.TRACING: "single_choice",
        ActivityTypeEnum.STORY_LISTENING: "single_choice",
        ActivityTypeEnum.AUDIO_IDENTIFICATION: "single_choice",
        ActivityTypeEnum.PICTURE_COMPREHENSION: "single_choice",
        ActivityTypeEnum.SIMPLE_QUIZ: "single_choice",
        ActivityTypeEnum.LETTER_SOUND: "single_choice",
    }
    return mapping.get(atype, "single_choice")


def get_activity_content(atype: ActivityTypeEnum, stage_code: str) -> Dict[str, Any]:
    """Get content for activity type."""
    # Simplified - return basic content for option generation
    content_map = {
        ActivityTypeEnum.IMAGE_SELECTION: {"options": ["A", "B", "C"], "correct": 0},
        ActivityTypeEnum.COLOR_IDENTIFICATION: {"options": ["Red", "Blue", "Yellow"], "correct": 0},
        ActivityTypeEnum.SHAPE_MATCHING: {"options": ["Circle", "Square", "Triangle"], "correct": 0},
        ActivityTypeEnum.PICTURE_MATCHING: {"options": ["Match 1", "Match 2", "Match 3"], "correct": 0},
        ActivityTypeEnum.ALPHABET_RECOGNITION: {"options": ["A", "B", "C"], "correct": 0},
        ActivityTypeEnum.NUMBER_RECOGNITION: {"options": ["1", "2", "3"], "correct": 0},
        ActivityTypeEnum.COUNTING: {"options": ["1", "2", "3"], "correct": 0},
        ActivityTypeEnum.SORTING: {"options": ["Group 1", "Group 2", "Group 3"], "correct": 0},
        ActivityTypeEnum.SEQUENCING: {"options": ["First", "Second", "Third"], "correct": 0},
        ActivityTypeEnum.TRACING: {"options": ["Line 1", "Line 2", "Line 3"], "correct": 0},
        ActivityTypeEnum.STORY_LISTENING: {"options": ["Answer 1", "Answer 2", "Answer 3"], "correct": 0},
        ActivityTypeEnum.AUDIO_IDENTIFICATION: {"options": ["Sound A", "Sound B", "Sound C"], "correct": 0},
        ActivityTypeEnum.PICTURE_COMPREHENSION: {"options": ["Answer 1", "Answer 2", "Answer 3"], "correct": 0},
        ActivityTypeEnum.SIMPLE_QUIZ: {"options": ["A", "B", "C"], "correct": 0},
        ActivityTypeEnum.LETTER_SOUND: {"options": ["A", "B", "C"], "correct": 0},
    }
    return content_map.get(atype, {"options": ["A", "B", "C"], "correct": 0})


def get_option_text(atype: ActivityTypeEnum, content: Dict[str, Any], index: int, is_correct: bool) -> str:
    """Generate option text based on activity type and content."""
    if content and "options" in content and index < len(content["options"]):
        return content["options"][index]
    
    # Default options per activity type
    defaults = {
        ActivityTypeEnum.IMAGE_SELECTION: ["Option A", "Option B", "Option C"],
        ActivityTypeEnum.COLOR_IDENTIFICATION: ["Red", "Blue", "Yellow"],
        ActivityTypeEnum.SHAPE_MATCHING: ["Circle", "Square", "Triangle"],
        ActivityTypeEnum.PICTURE_MATCHING: ["Match 1", "Match 2", "Match 3"],
        ActivityTypeEnum.ALPHABET_RECOGNITION: ["A", "B", "C"],
        ActivityTypeEnum.NUMBER_RECOGNITION: ["1", "2", "3"],
        ActivityTypeEnum.COUNTING: ["1", "2", "3"],
        ActivityTypeEnum.SORTING: ["Group 1", "Group 2", "Group 3"],
        ActivityTypeEnum.SEQUENCING: ["First", "Second", "Third"],
        ActivityTypeEnum.TRACING: ["Line 1", "Line 2", "Line 3"],
        ActivityTypeEnum.STORY_LISTENING: ["Answer 1", "Answer 2", "Answer 3"],
        ActivityTypeEnum.AUDIO_IDENTIFICATION: ["Sound A", "Sound B", "Sound C"],
        ActivityTypeEnum.PICTURE_COMPREHENSION: ["Answer 1", "Answer 2", "Answer 3"],
        ActivityTypeEnum.SIMPLE_QUIZ: ["A", "B", "C"],
        ActivityTypeEnum.LETTER_SOUND: ["A", "B", "C"],
    }
    return defaults.get(atype, ["A", "B", "C"])[index % 3]


QUESTION_TEMPLATES = {
    ActivityTypeEnum.IMAGE_SELECTION: [
        {"en": "Find the {target}", "hi": "{target} ढूंढें"},
        {"en": "Which one is the {target}?", "hi": "कौन सा {target} है?"},
        {"en": "Touch the {target}", "hi": "{target} को छुएं"},
    ],
    ActivityTypeEnum.COLOR_IDENTIFICATION: [
        {"en": "Which one is {color}?", "hi": "कौन सा {color} है?"},
        {"en": "Find the {color} one", "hi": "{color} वाला ढूंढें"},
    ],
    ActivityTypeEnum.SHAPE_MATCHING: [
        {"en": "Match the {shape}", "hi": "{shape} से मिलाएं"},
        {"en": "Find the same {shape}", "hi": "वैसा ही {shape} ढूंढें"},
    ],
    ActivityTypeEnum.PICTURE_MATCHING: [
        {"en": "Match the {item}", "hi": "{item} से मिलाएं"},
        {"en": "Find the matching {item}", "hi": "मिलता-जुलता {item} ढूंढें"},
    ],
    ActivityTypeEnum.ALPHABET_RECOGNITION: [
        {"en": "Find the letter {letter}", "hi": "अक्षर {letter} ढूंढें"},
        {"en": "Which one is {letter}?", "hi": "कौन सा {letter} है?"},
    ],
    ActivityTypeEnum.NUMBER_RECOGNITION: [
        {"en": "Find the number {number}", "hi": "संख्या {number} ढूंढें"},
        {"en": "Touch {number}", "hi": "{number} को छुएं"},
    ],
    ActivityTypeEnum.COUNTING: [
        {"en": "How many {object}?", "hi": "कितने {object}?"},
        {"en": "Count the {object}", "hi": "{object} गिनें"},
    ],
    ActivityTypeEnum.SORTING: [
        {"en": "Sort by {category}", "hi": "{category} से क्रमबद्ध करें"},
        {"en": "Put {category} together", "hi": "{category} को एक साथ रखें"},
    ],
    ActivityTypeEnum.SEQUENCING: [
        {"en": "Put in the right order", "hi": "सही क्रम में लगाएं"},
        {"en": "What comes first?", "hi": "सबसे पहले क्या आता है?"},
    ],
    ActivityTypeEnum.TRACING: [
        {"en": "Trace the {item}", "hi": "{item} को ट्रेस करें"},
        {"en": "Follow the line", "hi": "रेखा का अनुसरण करें"},
    ],
    ActivityTypeEnum.STORY_LISTENING: [
        {"en": "What happened in the story?", "hi": "कहानी में क्या हुआ?"},
        {"en": "Who was in the story?", "hi": "कहानी में कौन था?"},
    ],
    ActivityTypeEnum.AUDIO_IDENTIFICATION: [
        {"en": "What sound is this?", "hi": "यह कैसी आवाज़ है?"},
        {"en": "Which animal makes this sound?", "hi": "यह किस जानवर की आवाज़ है?"},
    ],
    ActivityTypeEnum.PICTURE_COMPREHENSION: [
        {"en": "What do you see?", "hi": "आप क्या देखते हैं?"},
        {"en": "How many {item}?", "hi": "कितने {item}?"},
    ],
    ActivityTypeEnum.SIMPLE_QUIZ: [
        {"en": "{question}", "hi": "{question}"},
    ],
    ActivityTypeEnum.LETTER_SOUND: [
        {"en": "Which letter says /{sound}/?", "hi": "कौन सा अक्षर /{sound}/ बोलता है?"},
        {"en": "Find the letter for /{sound}/", "hi": "/{sound}/ के लिए अक्षर ढूंढें"},
    ],
}


async def validate_all_lessons(db: AsyncSession):
    """Validate all published lessons using the validation service."""
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
            print(f"  Lesson {lesson.code} (ID: {lesson.id}) FAILED:")
            for err in result.errors:
                print(f"    - {err['field']}: {err['message']}")
    
    print(f"\nValidation Results: {passed} passed, {failed} failed")
    return failed == 0


async def main():
    print("Starting activity type migration for Stage 5D...")
    print(f"Database: {settings.database_url}")
    
    async with async_session_factory() as db:
        try:
            await update_activities(db)
            print("Activities updated successfully!")
            
            # Run validation
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