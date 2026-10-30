"""
Enhanced seed script for Stage 5D - Creates comprehensive bilingual curriculum
with all 15 activity types, 2 lessons per topic, proper configurations, and validation.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, async_session_factory
from app.models import (
    LearningStage, LearningDomain, Subject, Topic, LearningObjective,
    Lesson, LessonTranslation, Activity, ActivityTranslation,
    Question, QuestionTranslation, AnswerOption, AnswerOptionTranslation,
    StudentReward, ContentStatusEnum, ActivityTypeEnum,
    Role, LessonObjectiveLink
)
from app.permissions.roles import Role as RoleEnum
from app.services.curriculum_validation import validate_lesson_for_publish


# ============================================================
# ENHANCED SEED DATA DEFINITIONS
# ============================================================

# Activity type configurations - matching the frontend registry exactly
ACTIVITY_TYPE_CONFIGS = {
    ActivityTypeEnum.IMAGE_SELECTION: {
        "default": {"promptEmoji": "🔍"},
        "templates": {
            "identify": {"promptEmoji": "🔍", "layout": "grid"},
            "alphabet": {"promptEmoji": "🔤", "layout": "grid"},
            "number": {"promptEmoji": "🔢", "layout": "grid"},
        }
    },
    ActivityTypeEnum.COLOR_IDENTIFICATION: {
        "default": {"colors": ["red", "blue", "yellow", "green", "orange", "purple"]},
        "templates": {
            "basic": {"colors": ["red", "blue", "yellow"]},
            "extended": {"colors": ["red", "blue", "yellow", "green", "orange", "purple", "pink", "brown"]},
        }
    },
    ActivityTypeEnum.SHAPE_MATCHING: {
        "default": {"matchType": "exact", "shapes": ["circle", "square", "triangle", "rectangle", "star", "heart"]},
        "templates": {
            "basic": {"matchType": "exact", "shapes": ["circle", "square", "triangle"]},
            "extended": {"matchType": "exact", "shapes": ["circle", "square", "triangle", "rectangle", "oval", "diamond"]},
        }
    },
    ActivityTypeEnum.PICTURE_MATCHING: {
        "default": {"matchType": "exact", "categories": ["animals", "fruits", "vehicles"]},
        "templates": {
            "animals": {"matchType": "exact", "category": "animals"},
            "fruits": {"matchType": "exact", "category": "fruits"},
            "mixed": {"matchType": "exact", "categories": ["animals", "fruits", "vehicles"]},
        }
    },
    ActivityTypeEnum.ALPHABET_RECOGNITION: {
        "default": {"letters": ["A", "B", "C", "D", "E"], "case": "upper"},
        "templates": {
            "upper": {"letters": ["A", "B", "C", "D", "E", "F", "G"], "case": "upper"},
            "lower": {"letters": ["a", "b", "c", "d", "e", "f", "g"], "case": "lower"},
            "mixed": {"letters": ["A", "a", "B", "b", "C", "c"], "case": "mixed"},
        }
    },
    ActivityTypeEnum.NUMBER_RECOGNITION: {
        "default": {"numbers": [1, 2, 3, 4, 5], "range": "1-10"},
        "templates": {
            "1-5": {"numbers": [1, 2, 3, 4, 5], "range": "1-5"},
            "1-10": {"numbers": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "range": "1-10"},
            "1-20": {"numbers": list(range(1, 21)), "range": "1-20"},
        }
    },
    ActivityTypeEnum.COUNTING: {
        "default": {"maxCount": 5, "objects": ["apples", "stars", "balls"]},
        "templates": {
            "1-5": {"maxCount": 5, "objects": ["apples", "stars", "balls"]},
            "1-10": {"maxCount": 10, "objects": ["apples", "stars", "balls", "flowers", "birds"]},
            "1-20": {"maxCount": 20, "objects": ["apples", "stars", "balls", "flowers", "birds", "cars"]},
        }
    },
    ActivityTypeEnum.SORTING: {
        "default": {"categories": ["color", "shape", "size"], "itemsPerCategory": 3},
        "templates": {
            "color": {"categories": ["red", "blue", "yellow"], "itemsPerCategory": 3},
            "shape": {"categories": ["circle", "square", "triangle"], "itemsPerCategory": 3},
            "size": {"categories": ["small", "medium", "large"], "itemsPerCategory": 3},
            "mixed": {"categories": ["color", "shape", "size"], "itemsPerCategory": 2},
        }
    },
    ActivityTypeEnum.SEQUENCING: {
        "default": {"sequence": ["first", "second", "third"], "type": "visual"},
        "templates": {
            "3-step": {"sequence": ["first", "second", "third"], "type": "visual"},
            "4-step": {"sequence": ["first", "second", "third", "fourth"], "type": "visual"},
            "story": {"sequence": ["beginning", "middle", "end"], "type": "narrative"},
        }
    },
    ActivityTypeEnum.TRACING: {
        "default": {"template": "letter_A", "strokes": [{"points": [[0,0],[10,10]]}]},
        "templates": {
            "lines": {"strokes": [{"points": [[0,0],[100,0]]}, {"points": [[0,0],[0,100]]}]},
            "letters": {"template": "letter_A", "strokes": [{"points": [[50,0],[25,100]]},{"points": [[25,100],[75,100]]},{"points": [[50,0],[75,100]]}]},
            "shapes": {"template": "triangle", "strokes": [{"points": [[50,0],[100,100]]},{"points": [[100,100],[0,100]]},{"points": [[0,100],[50,0]]}]},
        }
    },
    ActivityTypeEnum.STORY_LISTENING: {
        "default": {"segments": [{"text": "Once upon a time...", "audioUrl": None}], "hasAudio": False},
        "templates": {
            "short": {"segments": [{"text": "A short story.", "audioUrl": None}], "hasAudio": False},
            "with_audio": {"segments": [{"text": "Listen carefully.", "audioUrl": "/audio/story1.mp3"}], "hasAudio": True},
        }
    },
    ActivityTypeEnum.AUDIO_IDENTIFICATION: {
        "default": {"audioOptions": [{"audioUrl": "/audio/sound1.mp3", "label": "Sound 1"}, {"audioUrl": "/audio/sound2.mp3", "label": "Sound 2"}]},
        "templates": {
            "animals": {"audioOptions": [
                {"audioUrl": "/audio/cat.mp3", "label": "Cat"},
                {"audioUrl": "/audio/dog.mp3", "label": "Dog"},
                {"audioUrl": "/audio/cow.mp3", "label": "Cow"}
            ]},
            "vehicles": {"audioOptions": [
                {"audioUrl": "/audio/car.mp3", "label": "Car"},
                {"audioUrl": "/audio/train.mp3", "label": "Train"},
                {"audioUrl": "/audio/plane.mp3", "label": "Plane"}
            ]},
        }
    },
    ActivityTypeEnum.PICTURE_COMPREHENSION: {
        "default": {"imageUrl": "/images/scene1.jpg", "questions": ["What do you see?", "How many?"]},
        "templates": {
            "scene": {"imageUrl": "/images/park.jpg", "questions": ["What do you see in the park?", "How many children are playing?"]},
            "home": {"imageUrl": "/images/home.jpg", "questions": ["Who is in the kitchen?", "What is on the table?"]},
        }
    },
    ActivityTypeEnum.SIMPLE_QUIZ: {
        "default": {"questionType": "single_choice", "timeLimit": None},
        "templates": {
            "single": {"questionType": "single_choice", "timeLimit": None},
            "multiple": {"questionType": "multiple_choice", "timeLimit": None},
        }
    },
    ActivityTypeEnum.LETTER_SOUND: {
        "default": {"letters": ["A", "B", "C"], "sounds": ["/æ/", "/b/", "/k/"]},
        "templates": {
            "vowels": {"letters": ["A", "E", "I", "O", "U"], "sounds": ["/æ/", "/ɛ/", "/ɪ/", "/ɒ/", "/ʌ/"]},
            "consonants": {"letters": ["B", "C", "D", "F", "G"], "sounds": ["/b/", "/k/", "/d/", "/f/", "/g/"]},
        }
    },
}

# Stage-specific activity type distribution - developmentally appropriate
STAGE_ACTIVITY_DISTRIBUTION = {
    "playgroup": {
        # Ages 2-3: Focus on sensory, basic recognition, simple matching
        "weights": {
            ActivityTypeEnum.IMAGE_SELECTION: 30,
            ActivityTypeEnum.COLOR_IDENTIFICATION: 20,
            ActivityTypeEnum.SHAPE_MATCHING: 15,
            ActivityTypeEnum.PICTURE_MATCHING: 15,
            ActivityTypeEnum.SIMPLE_QUIZ: 10,
            ActivityTypeEnum.STORY_LISTENING: 10,
        },
        "lessons_per_topic": 2,
        "activities_per_lesson": 3,
    },
    "nursery": {
        # Ages 3-4: Add letter/number recognition, sorting, sequencing
        "weights": {
            ActivityTypeEnum.IMAGE_SELECTION: 20,
            ActivityTypeEnum.COLOR_IDENTIFICATION: 15,
            ActivityTypeEnum.SHAPE_MATCHING: 10,
            ActivityTypeEnum.PICTURE_MATCHING: 10,
            ActivityTypeEnum.ALPHABET_RECOGNITION: 10,
            ActivityTypeEnum.NUMBER_RECOGNITION: 10,
            ActivityTypeEnum.COUNTING: 10,
            ActivityTypeEnum.SORTING: 5,
            ActivityTypeEnum.SEQUENCING: 5,
            ActivityTypeEnum.SIMPLE_QUIZ: 5,
        },
        "lessons_per_topic": 2,
        "activities_per_lesson": 3,
    },
    "lkg": {
        # Ages 4-5: Add letter sounds, tracing, more complex counting/operations
        "weights": {
            ActivityTypeEnum.IMAGE_SELECTION: 10,
            ActivityTypeEnum.COLOR_IDENTIFICATION: 5,
            ActivityTypeEnum.SHAPE_MATCHING: 5,
            ActivityTypeEnum.PICTURE_MATCHING: 5,
            ActivityTypeEnum.ALPHABET_RECOGNITION: 10,
            ActivityTypeEnum.NUMBER_RECOGNITION: 10,
            ActivityTypeEnum.COUNTING: 10,
            ActivityTypeEnum.SORTING: 10,
            ActivityTypeEnum.SEQUENCING: 5,
            ActivityTypeEnum.TRACING: 10,
            ActivityTypeEnum.LETTER_SOUND: 10,
            ActivityTypeEnum.SIMPLE_QUIZ: 5,
            ActivityTypeEnum.PICTURE_COMPREHENSION: 5,
        },
        "lessons_per_topic": 2,
        "activities_per_lesson": 4,
    },
    "ukg": {
        # Ages 5-6: Full range including operations, measurement, story listening, audio
        "weights": {
            ActivityTypeEnum.IMAGE_SELECTION: 5,
            ActivityTypeEnum.COLOR_IDENTIFICATION: 5,
            ActivityTypeEnum.SHAPE_MATCHING: 5,
            ActivityTypeEnum.PICTURE_MATCHING: 5,
            ActivityTypeEnum.ALPHABET_RECOGNITION: 5,
            ActivityTypeEnum.NUMBER_RECOGNITION: 5,
            ActivityTypeEnum.COUNTING: 10,
            ActivityTypeEnum.SORTING: 10,
            ActivityTypeEnum.SEQUENCING: 10,
            ActivityTypeEnum.TRACING: 10,
            ActivityTypeEnum.LETTER_SOUND: 10,
            ActivityTypeEnum.SIMPLE_QUIZ: 10,
            ActivityTypeEnum.STORY_LISTENING: 5,
            ActivityTypeEnum.AUDIO_IDENTIFICATION: 5,
            ActivityTypeEnum.PICTURE_COMPREHENSION: 10,
        },
        "lessons_per_topic": 2,
        "activities_per_lesson": 4,
    },
}

# Developmentally appropriate activity content templates
ACTIVITY_CONTENT_TEMPLATES = {
    ActivityTypeEnum.IMAGE_SELECTION: {
        "playgroup": {
            "identify_animal": {"prompt": "Find the {animal}", "options": ["cat", "dog", "cow"], "correct": 0},
            "identify_fruit": {"prompt": "Touch the {fruit}", "options": ["apple", "banana", "mango"], "correct": 0},
            "identify_vehicle": {"prompt": "Where is the {vehicle}?", "options": ["car", "bus", "train"], "correct": 0},
        },
        "nursery": {
            "alphabet_A_E": {"prompt": "Find letter {letter}", "options": ["A", "B", "C", "D", "E"], "correct": 0},
            "number_1_5": {"prompt": "Find number {number}", "options": ["1", "2", "3", "4", "5"], "correct": 0},
        },
    },
    ActivityTypeEnum.COLOR_IDENTIFICATION: {
        "playgroup": {
            "primary_colors": {"prompt": "Which one is {color}?", "options": ["red", "blue", "yellow"], "correct": 0},
        },
        "nursery": {
            "all_colors": {"prompt": "Find the {color} object", "options": ["red", "blue", "yellow", "green"], "correct": 0},
        },
        "lkg": {
            "extended_colors": {"prompt": "Find the {color} object", "options": ["red", "blue", "yellow", "green", "orange", "purple"], "correct": 0},
        },
        "ukg": {
            "all_colors": {"prompt": "Find the {color} object", "options": ["red", "blue", "yellow", "green", "orange", "purple", "pink", "brown"], "correct": 0},
        },
    },
    ActivityTypeEnum.SHAPE_MATCHING: {
        "playgroup": {
            "basic_shapes": {"prompt": "Match the {shape}", "options": ["circle", "square", "triangle"], "correct": 0},
        },
        "nursery": {
            "basic_shapes": {"prompt": "Match the {shape}", "options": ["circle", "square", "triangle"], "correct": 0},
        },
        "lkg": {
            "extended_shapes": {"prompt": "Match the {shape}", "options": ["circle", "square", "triangle", "rectangle", "oval"], "correct": 0},
        },
        "ukg": {
            "all_shapes": {"prompt": "Match the {shape}", "options": ["circle", "square", "triangle", "rectangle", "oval", "diamond", "star", "heart"], "correct": 0},
        },
    },
    ActivityTypeEnum.PICTURE_MATCHING: {
        "playgroup": {
            "animals": {"prompt": "Match the {animal}", "pairs": [("cat", "cat"), ("dog", "dog"), ("cow", "cow")], "correct": 0},
        },
        "nursery": {
            "fruits": {"prompt": "Match the {fruit}", "pairs": [("apple", "apple"), ("banana", "banana"), ("mango", "mango")], "correct": 0},
        },
        "lkg": {
            "mixed": {"prompt": "Match the {item}", "pairs": [("cat", "cat"), ("apple", "apple"), ("car", "car")], "correct": 0},
        },
        "ukg": {
            "mixed": {"prompt": "Match the {item}", "pairs": [("cat", "cat"), ("apple", "apple"), ("car", "car"), ("tree", "tree"), ("bird", "bird")], "correct": 0},
        },
    },
    ActivityTypeEnum.ALPHABET_RECOGNITION: {
        "playgroup": {
            "first_letters": {"prompt": "Touch the letter {letter}", "options": ["A", "B", "C"], "correct": 0},
        },
        "nursery": {
            "A_to_E": {"prompt": "Touch the letter {letter}", "options": ["A", "B", "C", "D", "E"], "correct": 0},
        },
        "lkg": {
            "full_alphabet": {"prompt": "Find {letter}", "options": ["A", "B", "C", "D", "E", "F", "G"], "correct": 0},
        },
        "ukg": {
            "full_alphabet": {"prompt": "Find {letter}", "options": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"], "correct": 0},
        },
    },
    ActivityTypeEnum.NUMBER_RECOGNITION: {
        "playgroup": {
            "1_to_3": {"prompt": "Find number {number}", "options": ["1", "2", "3"], "correct": 0},
        },
        "nursery": {
            "1_to_5": {"prompt": "Find number {number}", "options": ["1", "2", "3", "4", "5"], "correct": 0},
        },
        "lkg": {
            "1_to_10": {"prompt": "Find {number}", "options": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], "correct": 0},
        },
        "ukg": {
            "1_to_20": {"prompt": "Find {number}", "options": [str(i) for i in range(1, 21)], "correct": 0},
        },
    },
    ActivityTypeEnum.COUNTING: {
        "playgroup": {
            "count_to_3": {"prompt": "How many {object}?", "options": ["1", "2", "3"], "correct": 1, "maxCount": 3},
        },
        "nursery": {
            "count_to_5": {"prompt": "How many {object}?", "options": ["1", "2", "3", "4", "5"], "correct": 2, "maxCount": 5},
        },
        "lkg": {
            "count_to_10": {"prompt": "Count the {object}", "options": ["5", "6", "7", "8", "9", "10"], "correct": 0, "maxCount": 10},
        },
        "ukg": {
            "count_to_20": {"prompt": "Count the {object}", "options": ["10", "12", "14", "16", "18", "20"], "correct": 2, "maxCount": 20},
        },
    },
    ActivityTypeEnum.SORTING: {
        "nursery": {
            "by_color": {"prompt": "Sort by {category}", "categories": ["red", "blue", "yellow"], "correct": 0},
        },
        "lkg": {
            "by_color": {"prompt": "Sort by {category}", "categories": ["red", "blue", "yellow"], "correct": 0},
        },
        "ukg": {
            "by_category": {"prompt": "Sort by {category}", "categories": ["color", "shape", "size"], "correct": 0},
        },
    },
    ActivityTypeEnum.SEQUENCING: {
        "nursery": {
            "simple": {"prompt": "Put in order", "sequence": ["first", "second", "third"], "correct": 0},
        },
        "lkg": {
            "daily_routine": {"prompt": "Put in order", "sequence": ["wake up", "brush teeth", "eat breakfast", "go to school"], "correct": 0},
        },
        "ukg": {
            "story": {"prompt": "Put in order", "sequence": ["beginning", "middle", "end"], "correct": 0},
            "life_cycle": {"prompt": "Put in order", "sequence": ["egg", "caterpillar", "cocoon", "butterfly"], "correct": 0},
        },
    },
    ActivityTypeEnum.TRACING: {
        "playgroup": {
            "standing_lines": {"prompt": "Trace the lines", "template": "standing_lines", "correct": 0},
            "sleeping_lines": {"prompt": "Trace the lines", "template": "sleeping_lines", "correct": 0},
        },
        "nursery": {
            "curves": {"prompt": "Trace the curves", "template": "curves", "correct": 0},
        },
        "lkg": {
            "standing_lines": {"prompt": "Trace the lines", "template": "standing_lines", "correct": 0},
            "sleeping_lines": {"prompt": "Trace the lines", "template": "sleeping_lines", "correct": 0},
            "curves": {"prompt": "Trace the curves", "template": "curves", "correct": 0},
        },
        "ukg": {
            "letters": {"prompt": "Trace the letter {letter}", "template": "letter_A", "correct": 0},
            "numbers": {"prompt": "Trace the number {number}", "template": "number_1", "correct": 0},
        },
    },
    ActivityTypeEnum.STORY_LISTENING: {
        "playgroup": {
            "short_story": {"prompt": "Listen to the story", "segments": ["A cat sat.", "The cat purred."], "correct": 0},
        },
        "nursery": {
            "short_story": {"prompt": "Listen to the story", "segments": ["Once there was a cat.", "The cat liked to play.", "The cat slept."], "correct": 0},
        },
        "lkg": {
            "medium_story": {"prompt": "Listen to the story", "segments": ["Once there was a boy.", "He found a kite.", "The kite flew high.", "The boy was happy."], "correct": 0},
        },
        "ukg": {
            "short_story": {"prompt": "Listen to the story", "segments": ["Once there was a cat.", "The cat liked to play.", "The cat slept."], "correct": 0},
        },
    },
    ActivityTypeEnum.AUDIO_IDENTIFICATION: {
        "lkg": {
            "animal_sounds": {"prompt": "What animal makes this sound?", "audioOptions": [
                {"audioUrl": "/audio/cat.mp3", "label": "Cat"},
                {"audioUrl": "/audio/dog.mp3", "label": "Dog"},
                {"audioUrl": "/audio/cow.mp3", "label": "Cow"}
            ], "correct": 0},
        },
        "ukg": {
            "animal_sounds": {"prompt": "What animal makes this sound?", "audioOptions": [
                {"audioUrl": "/audio/cat.mp3", "label": "Cat"},
                {"audioUrl": "/audio/dog.mp3", "label": "Dog"},
                {"audioUrl": "/audio/cow.mp3", "label": "Cow"}
            ], "correct": 0},
            "vehicle_sounds": {"prompt": "What vehicle makes this sound?", "audioOptions": [
                {"audioUrl": "/audio/car.mp3", "label": "Car"},
                {"audioUrl": "/audio/train.mp3", "label": "Train"},
                {"audioUrl": "/audio/plane.mp3", "label": "Plane"}
            ], "correct": 0},
        },
    },
    ActivityTypeEnum.PICTURE_COMPREHENSION: {
        "playgroup": {
            "simple_scene": {"prompt": "Look at the picture", "imageUrl": "/images/simple.jpg", "questions": ["What do you see?"], "correct": 0},
        },
        "nursery": {
            "home_scene": {"prompt": "Look at the picture", "imageUrl": "/images/home.jpg", "questions": ["Who is in the kitchen?", "What is on the table?"], "correct": 0},
        },
        "lkg": {
            "school_scene": {"prompt": "Look at the picture", "imageUrl": "/images/school.jpg", "questions": ["What are the children doing?", "How many books?"], "correct": 0},
        },
        "ukg": {
            "park_scene": {"prompt": "Look at the picture", "imageUrl": "/images/park.jpg", "questions": ["How many children?", "What color is the ball?"], "correct": 0},
    }
}
    }

# Developmentally appropriate question templates per activity type
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


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_activity_type_for_stage(stage_code: str, activity_index: int, lesson_index: int) -> ActivityTypeEnum:
    """Select an activity type appropriate for the stage, ensuring diversity."""
    import random
    stage_dist = STAGE_ACTIVITY_DISTRIBUTION[stage_code]
    weights = stage_dist["weights"]

    # Use deterministic selection based on indices for reproducibility
    # but ensure good distribution across activity types
    types = list(weights.keys())
    weight_values = list(weights.values())

    # Use a hash of indices to deterministically select
    seed = hash((stage_code, lesson_index, activity_index)) % 1000
    cumulative = 0
    for i, (atype, weight) in enumerate(zip(types, weight_values)):
        cumulative += weight
        if seed < cumulative:
            return atype
    return types[-1]


def get_config_for_activity(atype: ActivityTypeEnum, stage_code: str, template_key: str = "default") -> Dict[str, Any]:
    """Get configuration for an activity type."""
    configs = ACTIVITY_TYPE_CONFIGS.get(atype, {})
    templates = configs.get("templates", {})
    return templates.get(template_key, configs.get("default", {}))


def get_question_template(atype: ActivityTypeEnum, question_index: int) -> Dict[str, str]:
    """Get question template for activity type."""
    templates = QUESTION_TEMPLATES.get(atype, QUESTION_TEMPLATES[ActivityTypeEnum.SIMPLE_QUIZ])
    return templates[question_index % len(templates)]


def select_content_for_activity(atype: ActivityTypeEnum, stage_code: str, activity_index: int) -> Dict[str, Any]:
    """Select appropriate content for an activity."""
    content_map = ACTIVITY_CONTENT_TEMPLATES.get(atype, {})
    stage_content = content_map.get(stage_code, content_map.get("all", {}))

    if not stage_content:
        return {}

    keys = list(stage_content.keys())
    key = keys[activity_index % len(keys)]
    return stage_content[key]


# ============================================================
# MAIN ENHANCED SEED FUNCTIONS
# ============================================================

async def seed_enhanced_curriculum(db: AsyncSession):
    """Seed enhanced curriculum with all 15 activity types, 2 lessons per topic."""
    print("Starting enhanced curriculum seeding...")

    # First, run the base seed to ensure stages, domains, subjects exist
    from app.scripts.seed_data import (
        seed_stages, seed_domains, seed_subjects, seed_roles, seed_rewards
    )

    print("Seeding system roles...")
    await seed_roles(db)

    print("Seeding learning stages...")
    stages = await seed_stages(db)
    print(f"Created/found {len(stages)} stages")

    print("Seeding learning domains...")
    domains = await seed_domains(db, stages)
    total_domains = sum(len(d) for d in domains.values())
    print(f"Created/found {total_domains} domains")

    print("Seeding subjects...")
    subjects = await seed_subjects(db, stages, domains)
    total_subjects = sum(len(s) for s in subjects.values())
    print(f"Created/found {total_subjects} subjects")

    print("Seeding rewards...")
    await seed_rewards(db)

    # Now enhance topics and create 2 lessons per topic with all activity types
    await seed_enhanced_topics_lessons_activities(db, stages, subjects)

    await db.commit()
    print("\nEnhanced curriculum seeding completed!")


async def seed_enhanced_topics_lessons_activities(
    db: AsyncSession,
    stages: Dict[str, LearningStage],
    subjects: Dict[str, Dict[str, Subject]]
):
    """Seed 2 lessons per topic with diverse activity types."""
    print("Seeding enhanced topics, lessons, and activities...")

    lesson_count = 0
    activity_count = 0
    question_count = 0

    for stage_code, stage_subjects in subjects.items():
        stage = stages[stage_code]
        stage_dist = STAGE_ACTIVITY_DISTRIBUTION[stage_code]
        lessons_per_topic = stage_dist["lessons_per_topic"]
        activities_per_lesson = stage_dist["activities_per_lesson"]

        for subject_code, subject in stage_subjects.items():
            # Get topics for this subject
            topics_result = await db.execute(
                select(Topic).where(Topic.subject_id == subject.id).order_by(Topic.display_order)
            )
            topics = topics_result.scalars().all()

            for topic in topics:
                # Get or create learning objective
                obj_result = await db.execute(
                    select(LearningObjective).where(LearningObjective.topic_id == topic.id)
                )
                objectives = obj_result.scalars().all()

                # Create lessons_per_topic lessons
                for lesson_idx in range(lessons_per_topic):
                    lesson_num = lesson_idx + 1
                    lesson_code = f"{topic.code}_lesson_{lesson_num}"

                    # Check if lesson already exists
                    lesson_result = await db.execute(
                        select(Lesson).where(Lesson.topic_id == topic.id, Lesson.code == lesson_code)
                    )
                    lesson = lesson_result.scalar_one_or_none()

                    if not lesson:
                        lesson = Lesson(
                            topic_id=topic.id,
                            code=lesson_code,
                            status=ContentStatusEnum.PUBLISHED,
                            version=1,
                            estimated_duration_minutes=15,
                            instructions=f"Let's learn about {topic.name.lower()} - Lesson {lesson_num}!",
                            display_order=lesson_num,
                            published_at=datetime.now(timezone.utc),
                            is_active=True,
                        )
                        db.add(lesson)
                        await db.flush()

                        # Link objectives
                        for obj in objectives:
                            link = LessonObjectiveLink(
                                lesson_id=lesson.id,
                                objective_id=obj.id,
                                display_order=1
                            )
                            db.add(link)

                        # Create lesson translations
                        for lang in ["en", "hi"]:
                            trans_result = await db.execute(
                                select(LessonTranslation).where(
                                    LessonTranslation.lesson_id == lesson.id,
                                    LessonTranslation.language == lang
                                )
                            )
                            translation = trans_result.scalar_one_or_none()
                            if not translation:
                                en_title = f"{topic.name} - Lesson {lesson_num}"
                                hi_title = f"{topic.name} - पाठ {lesson_num}"
                                translation = LessonTranslation(
                                    lesson_id=lesson.id,
                                    language=lang,
                                    title=en_title if lang == "en" else hi_title,
                                    description=f"Learn about {topic.name.lower()}" if lang == "en" else f"{topic.name.lower()} के बारे में सीखें",
                                    instructions="Let's start!" if lang == "en" else "शुरू करते हैं!",
                                )
                                db.add(translation)

                        lesson_count += 1
                    else:
                        # Update status to published if needed
                        if lesson.status != ContentStatusEnum.PUBLISHED:
                            lesson.status = ContentStatusEnum.PUBLISHED
                            lesson.published_at = datetime.now(timezone.utc)

                    # Create activities for this lesson
                    for act_idx in range(activities_per_lesson):
                        atype = get_activity_type_for_stage(stage_code, act_idx, lesson_idx)
                        act_code = f"{lesson_code}_activity_{act_idx + 1}"

                        # Check if activity exists
                        act_result = await db.execute(
                            select(Activity).where(Activity.lesson_id == lesson.id, Activity.code == act_code)
                        )
                        activity = act_result.scalar_one_or_none()

                        if not activity:
                            # Get config template
                            template_keys = list(ACTIVITY_TYPE_CONFIGS[atype].get("templates", {}).keys())
                            template_key = template_keys[act_idx % len(template_keys)] if template_keys else "default"

                            activity = Activity(
                                lesson_id=lesson.id,
                                type=atype,
                                code=act_code,
                                status=ContentStatusEnum.PUBLISHED,
                                version=1,
                                display_order=act_idx + 1,
                                estimated_duration_minutes=5,
                                instructions=get_activity_instructions(atype, stage_code, act_idx),
                                configuration=get_config_for_activity(atype, stage_code, template_key),
                                is_active=True,
                            )
                            db.add(activity)
                            await db.flush()
                            activity_count += 1

                            # Create activity translations
                            for lang in ["en", "hi"]:
                                act_trans_result = await db.execute(
                                    select(ActivityTranslation).where(
                                        ActivityTranslation.activity_id == activity.id,
                                        ActivityTranslation.language == lang
                                    )
                                )
                                act_translation = act_trans_result.scalar_one_or_none()
                                if not act_translation:
                                    act_translation = ActivityTranslation(
                                        activity_id=activity.id,
                                        language=lang,
                                        title=f"Activity {act_idx + 1}: {atype.value.replace('_', ' ').title()}" if lang == "en" else f"गतिविधि {act_idx + 1}: {atype.value.replace('_', ' ').title()}",
                                        instructions=get_activity_instructions(atype, stage_code, act_idx, lang),
                                    )
                                    db.add(act_translation)

                            # Create questions for this activity
                            question_templates = QUESTION_TEMPLATES.get(atype, QUESTION_TEMPLATES[ActivityTypeEnum.SIMPLE_QUIZ])
                            num_questions = 2 if stage_code in ["playgroup", "nursery"] else 3

                            for q_idx in range(num_questions):
                                q_result = await db.execute(
                                    select(Question).where(Question.activity_id == activity.id, Question.display_order == q_idx + 1)
                                )
                                question = q_result.scalar_one_or_none()

                                if not question:
                                    template = question_templates[q_idx % len(question_templates)] if hasattr(QUESTION_TEMPLATES.get(atype, []), '__getitem__') else QUESTION_TEMPLATES[ActivityTypeEnum.SIMPLE_QUIZ][0]
                                    question = Question(
                                        activity_id=activity.id,
                                        question_type=get_question_type_for_activity(atype),
                                        prompt=template["en"],
                                        prompt_audio_url=None,
                                        display_order=q_idx + 1,
                                        points=1,
                                        configuration={},
                                        is_active=True,
                                    )
                                    db.add(question)
                                    await db.flush()
                                    question_count += 1

                                    # Create question translations
                                    for lang in ["en", "hi"]:
                                        q_trans_result = await db.execute(
                                            select(QuestionTranslation).where(
                                                QuestionTranslation.question_id == question.id,
                                                QuestionTranslation.language == lang
                                            )
                                        )
                                        q_translation = q_trans_result.scalar_one_or_none()
                                        if not q_translation:
                                            q_translation = QuestionTranslation(
                                                question_id=question.id,
                                                language=lang,
                                                prompt=template[lang] if lang in template else template["en"],
                                            )
                                            db.add(q_translation)

                                    # Create answer options
                                    content = select_content_for_activity(atype, stage_code, 0)
                                    await create_answer_options(db, question, atype, content, stage_code)

    print(f"Created {lesson_count} new lessons, {activity_count} new activities, {question_count} new questions")


def get_question_type_for_activity(atype: ActivityTypeEnum) -> str:
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


def get_activity_instructions(atype: ActivityTypeEnum, stage_code: str, activity_index: int, lang: str = "en") -> str:
    """Get child-friendly instructions for activity."""
    instructions = {
        ActivityTypeEnum.IMAGE_SELECTION: {
            "en": "Look at the pictures and tap the correct one!",
            "hi": "चित्रों को देखें और सही वाले पर टैप करें!",
        },
        ActivityTypeEnum.COLOR_IDENTIFICATION: {
            "en": "Find the color that matches!",
            "hi": "मिलता-जुलता रंग ढूंढें!",
        },
        ActivityTypeEnum.SHAPE_MATCHING: {
            "en": "Match the shapes together!",
            "hi": "आकारों को मिलाएं!",
        },
        ActivityTypeEnum.PICTURE_MATCHING: {
            "en": "Match the pictures that go together!",
            "hi": "चित्रों को मिलाएं!",
        },
        ActivityTypeEnum.ALPHABET_RECOGNITION: {
            "en": "Find the letter!",
            "hi": "अक्षर ढूंढें!",
        },
        ActivityTypeEnum.NUMBER_RECOGNITION: {
            "en": "Find the number!",
            "hi": "संख्या ढूंढें!",
        },
        ActivityTypeEnum.COUNTING: {
            "en": "Count and find the right number!",
            "hi": "गिनें और सही संख्या ढूंढें!",
        },
        ActivityTypeEnum.SORTING: {
            "en": "Sort the items into groups!",
            "hi": "चीज़ों को समूहों में बांटें!",
        },
        ActivityTypeEnum.SEQUENCING: {
            "en": "Put them in the right order!",
            "hi": "सही क्रम में लगाएं!",
        },
        ActivityTypeEnum.TRACING: {
            "en": "Trace along the lines with your finger!",
            "hi": "अपनी उंगली से रेखा पर चलाएं!",
        },
        ActivityTypeEnum.STORY_LISTENING: {
            "en": "Listen to the story and answer questions!",
            "hi": "कहानी सुनें और सवालों के जवाब दें!",
        },
        ActivityTypeEnum.AUDIO_IDENTIFICATION: {
            "en": "Listen carefully and find the match!",
            "hi": "ध्यान से सुनें और मिलाएं!",
        },
        ActivityTypeEnum.PICTURE_COMPREHENSION: {
            "en": "Look at the picture and answer!",
            "hi": "चित्र देखें और जवाब दें!",
        },
        ActivityTypeEnum.SIMPLE_QUIZ: {
            "en": "Choose the correct answer!",
            "hi": "सही उत्तर चुनें!",
        },
        ActivityTypeEnum.LETTER_SOUND: {
            "en": "Listen to the sound and find the letter!",
            "hi": "आवाज़ सुनें और अक्षर ढूंढें!",
        },
    }
    return instructions.get(atype, {}).get(lang, instructions.get(atype, {}).get("en", "Complete this activity!"))


async def create_answer_options(db: AsyncSession, question: Question, atype: ActivityTypeEnum, content: Dict[str, Any], stage_code: str):
    """Create answer options for a question based on activity type and content."""
    num_options = 3

    # Get correct answer from content or use default
    correct_index = content.get("correct", 0) if content else 0

    # Generate options based on activity type
    for m in range(num_options):
        is_correct = (m == correct_index)
        option_text = get_option_text(atype, content, m, is_correct)

        option = AnswerOption(
            question_id=question.id,
            text=option_text,
            text_audio_url=None,
            image_url=None,
            is_correct=is_correct,
            display_order=m + 1,
            feedback_correct="Great job!" if is_correct else "Good try!",
            feedback_incorrect="Try again!" if not is_correct else "",
        )
        db.add(option)
        await db.flush()  # Flush to get the option ID

        # Create translations after flush so option.id is available
        for lang in ["en", "hi"]:
            opt_trans = AnswerOptionTranslation(
                answer_option_id=option.id,
                language=lang,
                text=option_text if lang == "en" else f"विकल्प {m+1}",
                feedback_correct="Great job!" if lang == "en" else "बहुत बढ़िया!",
                feedback_incorrect="Try again!" if lang == "en" else "फिर कोशिश करें!",
            )
            db.add(opt_trans)


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


async def main():
    """Main enhanced seeding function."""
    print("Starting Stage 5D Enhanced Curriculum Seeding...")
    print(f"Database: {settings.database_url}")

    async with async_session_factory() as db:
        try:
            await seed_enhanced_curriculum(db)
            print("\n✅ All enhanced seed data created successfully!")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())