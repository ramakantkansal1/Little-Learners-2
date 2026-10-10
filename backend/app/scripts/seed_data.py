"""
Script to seed initial curriculum data.
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, async_session_factory
from app.models import (
    LearningStage, LearningDomain, Subject, Topic, LearningObjective,
    Lesson, LessonTranslation, Activity, ActivityTranslation,
    Question, QuestionTranslation, AnswerOption, AnswerOptionTranslation,
    StudentReward, ContentStatusEnum, ActivityTypeEnum,
)
from app.permissions.roles import Role as RoleEnum


# Seed data definitions
STAGES_DATA = [
    {
        "code": "playgroup",
        "name": "Playgroup / Pre-Nursery",
        "description": "Play-based exploration for ages 2-3 years. Focus on sensory experiences, familiar objects, sounds, colors, movement, and social routines.",
        "min_age_months": 24,
        "max_age_months": 36,
        "display_order": 1,
        "icon": "baby",
        "color": "#FFB3BA",
    },
    {
        "code": "nursery",
        "name": "Nursery",
        "description": "Colors, shapes, motor skills, vocabulary, listening, speaking, rhymes, and environmental awareness for ages 3-4 years.",
        "min_age_months": 36,
        "max_age_months": 48,
        "display_order": 2,
        "icon": "blocks",
        "color": "#BAFFC9",
    },
    {
        "code": "lkg",
        "name": "Lower Kindergarten (LKG)",
        "description": "Pre-literacy, pre-numeracy, fine motor skills, creativity, observation, and language development for ages 4-5 years.",
        "min_age_months": 48,
        "max_age_months": 60,
        "display_order": 3,
        "icon": "abc",
        "color": "#BAE1FF",
    },
    {
        "code": "ukg",
        "name": "Upper Kindergarten (UKG)",
        "description": "Reading readiness, early writing, number sense, basic mathematical reasoning, structured routines, and school readiness for ages 5-6 years.",
        "min_age_months": 60,
        "max_age_months": 72,
        "display_order": 4,
        "icon": "book",
        "color": "#FFFFBA",
    },
]

DOMAINS_DATA = {
    "playgroup": [
        {"code": "language", "name": "Language & Communication", "description": "Listening, speaking, vocabulary building through sounds and words", "display_order": 1, "icon": "mic", "color": "#FF6B6B"},
        {"code": "cognitive", "name": "Cognitive Development", "description": "Exploration, memory, problem-solving through play", "display_order": 2, "icon": "brain", "color": "#4ECDC4"},
        {"code": "physical", "name": "Physical Development", "description": "Gross and fine motor skills, movement, coordination", "display_order": 3, "icon": "run", "color": "#45B7D1"},
        {"code": "socio_emotional", "name": "Socio-Emotional Development", "description": "Social routines, sharing, empathy, self-awareness", "display_order": 4, "icon": "heart", "color": "#FFA07A"},
        {"code": "creative", "name": "Creative Expression", "description": "Art, music, dance, imaginative play", "display_order": 5, "icon": "palette", "color": "#DDA0DD"},
        {"code": "environmental", "name": "Environmental Awareness", "description": "Nature, animals, plants, weather, surroundings", "display_order": 6, "icon": "leaf", "color": "#98D8C8"},
    ],
    "nursery": [
        {"code": "language", "name": "Language & Literacy", "description": "Vocabulary, phonological awareness, storytelling, rhymes", "display_order": 1, "icon": "book-open", "color": "#FF6B6B"},
        {"code": "mathematics", "name": "Early Mathematics", "description": "Numbers, counting, shapes, patterns, sorting", "display_order": 2, "icon": "calculator", "color": "#4ECDC4"},
        {"code": "physical", "name": "Physical Development", "description": "Fine motor skills, gross motor skills, coordination", "display_order": 3, "icon": "run", "color": "#45B7D1"},
        {"code": "socio_emotional", "name": "Socio-Emotional Development", "description": "Self-awareness, relationships, emotions, routines", "display_order": 4, "icon": "heart", "color": "#FFA07A"},
        {"code": "creative", "name": "Creative Arts", "description": "Drawing, coloring, music, movement, drama", "display_order": 5, "icon": "palette", "color": "#DDA0DD"},
        {"code": "environmental", "name": "Understanding the World", "description": "Animals, plants, community helpers, transport, festivals", "display_order": 6, "icon": "globe", "color": "#98D8C8"},
    ],
    "lkg": [
        {"code": "language", "name": "Language & Literacy", "description": "Alphabet recognition, letter sounds, early reading, writing readiness", "display_order": 1, "icon": "book-open", "color": "#FF6B6B"},
        {"code": "mathematics", "name": "Mathematics", "description": "Number recognition, counting, basic operations, shapes, patterns", "display_order": 2, "icon": "calculator", "color": "#4ECDC4"},
        {"code": "physical", "name": "Physical Development", "description": "Fine motor skills, hand-eye coordination, writing readiness", "display_order": 3, "icon": "pen", "color": "#45B7D1"},
        {"code": "socio_emotional", "name": "Socio-Emotional Development", "description": "Cooperation, sharing, following rules, self-regulation", "display_order": 4, "icon": "users", "color": "#FFA07A"},
        {"code": "creative", "name": "Creative Expression", "description": "Art techniques, music, dance, imaginative storytelling", "display_order": 5, "icon": "music", "color": "#DDA0DD"},
        {"code": "environmental", "name": "Environmental Studies (EVS)", "description": "My body, family, food, water, seasons, plants, animals", "display_order": 6, "icon": "leaf", "color": "#98D8C8"},
    ],
    "ukg": [
        {"code": "language", "name": "Language & Literacy", "description": "Reading simple words, sentences, comprehension, creative writing", "display_order": 1, "icon": "book-open", "color": "#FF6B6B"},
        {"code": "mathematics", "name": "Mathematics", "description": "Number operations, addition/subtraction, measurement, time, money", "display_order": 2, "icon": "calculator", "color": "#4ECDC4"},
        {"code": "physical", "name": "Physical Development", "description": "Refined motor skills, sports basics, yoga, health habits", "display_order": 3, "icon": "dumbbell", "color": "#45B7D1"},
        {"code": "socio_emotional", "name": "Socio-Emotional Development", "description": "Empathy, conflict resolution, responsibility, school readiness", "display_order": 4, "icon": "heart", "color": "#FFA07A"},
        {"code": "creative", "name": "Creative Arts", "description": "Advanced art, craft, music appreciation, dramatic play", "display_order": 5, "icon": "palette", "color": "#DDA0DD"},
        {"code": "environmental", "name": "Environmental Studies (EVS)", "description": "Community, festivals, transport, communication, safety rules", "display_order": 6, "icon": "globe", "color": "#98D8C8"},
    ],
}

SUBJECTS_DATA = {
    "playgroup": {
        "language": [
            {"code": "english", "name": "English", "display_order": 1, "icon": "flag-us", "color": "#FF6B6B"},
            {"code": "hindi", "name": "हिंदी (Hindi)", "display_order": 2, "icon": "flag-in", "color": "#FF6B6B"},
        ],
        "cognitive": [
            {"code": "thinking_skills", "name": "Thinking Skills", "display_order": 1, "icon": "puzzle", "color": "#4ECDC4"},
        ],
        "physical": [
            {"code": "motor_skills", "name": "Motor Skills", "display_order": 1, "icon": "hand", "color": "#45B7D1"},
        ],
        "socio_emotional": [
            {"code": "social_skills", "name": "Social Skills", "display_order": 1, "icon": "users", "color": "#FFA07A"},
        ],
        "creative": [
            {"code": "art_music", "name": "Art & Music", "display_order": 1, "icon": "music", "color": "#DDA0DD"},
        ],
        "environmental": [
            {"code": "nature", "name": "Nature Around Us", "display_order": 1, "icon": "tree", "color": "#98D8C8"},
        ],
    },
    "nursery": {
        "language": [
            {"code": "english", "name": "English", "display_order": 1, "icon": "flag-us", "color": "#FF6B6B"},
            {"code": "hindi", "name": "हिंदी (Hindi)", "display_order": 2, "icon": "flag-in", "color": "#FF6B6B"},
        ],
        "mathematics": [
            {"code": "numbers", "name": "Numbers & Counting", "display_order": 1, "icon": "hash", "color": "#4ECDC4"},
            {"code": "shapes", "name": "Shapes & Patterns", "display_order": 2, "icon": "square", "color": "#4ECDC4"},
        ],
        "physical": [
            {"code": "fine_motor", "name": "Fine Motor Skills", "display_order": 1, "icon": "pen", "color": "#45B7D1"},
            {"code": "gross_motor", "name": "Gross Motor Skills", "display_order": 2, "icon": "run", "color": "#45B7D1"},
        ],
        "socio_emotional": [
            {"code": "self_awareness", "name": "Self Awareness", "display_order": 1, "icon": "user", "color": "#FFA07A"},
            {"code": "relationships", "name": "Relationships", "display_order": 2, "icon": "users", "color": "#FFA07A"},
        ],
        "creative": [
            {"code": "art", "name": "Art & Craft", "display_order": 1, "icon": "palette", "color": "#DDA0DD"},
            {"code": "music_movement", "name": "Music & Movement", "display_order": 2, "icon": "music", "color": "#DDA0DD"},
        ],
        "environmental": [
            {"code": "animals", "name": "Animals", "display_order": 1, "icon": "paw", "color": "#98D8C8"},
            {"code": "plants", "name": "Plants", "display_order": 2, "icon": "sprout", "color": "#98D8C8"},
            {"code": "community", "name": "Community Helpers", "display_order": 3, "icon": "briefcase", "color": "#98D8C8"},
        ],
    },
    "lkg": {
        "language": [
            {"code": "english", "name": "English", "display_order": 1, "icon": "flag-us", "color": "#FF6B6B"},
            {"code": "hindi", "name": "हिंदी (Hindi)", "display_order": 2, "icon": "flag-in", "color": "#FF6B6B"},
        ],
        "mathematics": [
            {"code": "numbers", "name": "Numbers 1-20", "display_order": 1, "icon": "hash", "color": "#4ECDC4"},
            {"code": "operations", "name": "Basic Operations", "display_order": 2, "icon": "plus", "color": "#4ECDC4"},
            {"code": "shapes_patterns", "name": "Shapes & Patterns", "display_order": 3, "icon": "triangle", "color": "#4ECDC4"},
        ],
        "physical": [
            {"code": "writing_readiness", "name": "Writing Readiness", "display_order": 1, "icon": "pen", "color": "#45B7D1"},
        ],
        "socio_emotional": [
            {"code": "cooperation", "name": "Cooperation & Sharing", "display_order": 1, "icon": "handshake", "color": "#FFA07A"},
        ],
        "creative": [
            {"code": "art", "name": "Art & Craft", "display_order": 1, "icon": "palette", "color": "#DDA0DD"},
        ],
        "environmental": [
            {"code": "my_world", "name": "My World", "display_order": 1, "icon": "home", "color": "#98D8C8"},
        ],
    },
    "ukg": {
        "language": [
            {"code": "english", "name": "English", "display_order": 1, "icon": "flag-us", "color": "#FF6B6B"},
            {"code": "hindi", "name": "हिंदी (Hindi)", "display_order": 2, "icon": "flag-in", "color": "#FF6B6B"},
        ],
        "mathematics": [
            {"code": "numbers", "name": "Numbers 1-50", "display_order": 1, "icon": "hash", "color": "#4ECDC4"},
            {"code": "operations", "name": "Addition & Subtraction", "display_order": 2, "icon": "plus-minus", "color": "#4ECDC4"},
            {"code": "measurement", "name": "Measurement & Time", "display_order": 3, "icon": "ruler", "color": "#4ECDC4"},
        ],
        "physical": [
            {"code": "sports_yoga", "name": "Sports & Yoga", "display_order": 1, "icon": "dumbbell", "color": "#45B7D1"},
        ],
        "socio_emotional": [
            {"code": "school_readiness", "name": "School Readiness", "display_order": 1, "icon": "school", "color": "#FFA07A"},
        ],
        "creative": [
            {"code": "arts_crafts", "name": "Arts & Crafts", "display_order": 1, "icon": "scissors", "color": "#DDA0DD"},
        ],
        "environmental": [
            {"code": "our_world", "name": "Our World", "display_order": 1, "icon": "globe", "color": "#98D8C8"},
        ],
    },
}


async def seed_stages(db: AsyncSession) -> dict[str, LearningStage]:
    """Seed learning stages."""
    stages = {}
    for stage_data in STAGES_DATA:
        result = await db.execute(select(LearningStage).where(LearningStage.code == stage_data["code"]))
        stage = result.scalar_one_or_none()
        if not stage:
            stage = LearningStage(**stage_data, is_active=True)
            db.add(stage)
            await db.flush()
        stages[stage_data["code"]] = stage
    await db.commit()
    return stages


async def seed_domains(db: AsyncSession, stages: dict[str, LearningStage]) -> dict[str, dict[str, LearningDomain]]:
    """Seed learning domains for each stage."""
    domains = {}
    for stage_code, domain_list in DOMAINS_DATA.items():
        stage = stages[stage_code]
        domains[stage_code] = {}
        for domain_data in domain_list:
            result = await db.execute(
                select(LearningDomain).where(
                    LearningDomain.stage_id == stage.id,
                    LearningDomain.code == domain_data["code"]
                )
            )
            domain = result.scalar_one_or_none()
            if not domain:
                domain = LearningDomain(stage_id=stage.id, **domain_data, is_active=True)
                db.add(domain)
                await db.flush()
            domains[stage_code][domain_data["code"]] = domain
    await db.commit()
    return domains


async def seed_subjects(db: AsyncSession, stages: dict[str, LearningStage], domains: dict[str, dict[str, LearningDomain]]) -> dict[str, dict[str, Subject]]:
    """Seed subjects for each stage and domain."""
    subjects = {}
    for stage_code, domain_subjects in SUBJECTS_DATA.items():
        stage = stages[stage_code]
        subjects[stage_code] = {}
        for domain_code, subject_list in domain_subjects.items():
            domain = domains[stage_code][domain_code]
            for subject_data in subject_list:
                result = await db.execute(
                    select(Subject).where(
                        Subject.stage_id == stage.id,
                        Subject.domain_id == domain.id,
                        Subject.code == subject_data["code"]
                    )
                )
                subject = result.scalar_one_or_none()
                if not subject:
                    subject = Subject(
                        stage_id=stage.id,
                        domain_id=domain.id,
                        **subject_data,
                        is_active=True
                    )
                    db.add(subject)
                    await db.flush()
                subjects[stage_code][subject_data["code"]] = subject
    await db.commit()
    return subjects


async def seed_topics_and_content(db: AsyncSession, stages: dict[str, LearningStage], subjects: dict[str, dict[str, Subject]]):
    """Seed topics, objectives, lessons, activities, and questions."""
    # This is a simplified seed - in production, you'd want more comprehensive content
    # For each stage, create sample topics for each subject
    
    for stage_code, stage_subjects in subjects.items():
        stage = stages[stage_code]
        
        for subject_code, subject in stage_subjects.items():
            # Create 3 topics per subject
            topic_names = {
                "playgroup": {
                    "english": ["Animal Sounds", "My Family", "Colors Around Me"],
                    "hindi": ["पशुओं की आवाज़ें", "मेरा परिवार", "मेरे आसपास के रंग"],
                    "thinking_skills": ["Big and Small", "Same and Different", "What Goes Together"],
                    "motor_skills": ["Clap Your Hands", "Stomp Your Feet", "Reach for the Sky"],
                    "social_skills": ["Hello and Goodbye", "Sharing is Caring", "My Feelings"],
                    "art_music": ["Finger Painting", "Nursery Rhymes", "Dance with Me"],
                    "nature": ["Farm Animals", "Trees and Flowers", "Sun and Rain"],
                },
                "nursery": {
                    "english": ["Alphabet A-E", "Rhyming Words", "Picture Stories"],
                    "hindi": ["स्वर अ-इ", "कविता समय", "चित्र कथा"],
                    "numbers": ["Numbers 1-5", "Counting Objects", "Number Rhymes"],
                    "shapes": ["Circle and Square", "Triangle and Rectangle", "Shapes in Nature"],
                    "fine_motor": ["Tracing Lines", "Playdough Fun", "Bead Threading"],
                    "gross_motor": ["Jump Like a Frog", "Balance Walk", "Ball Games"],
                    "self_awareness": ["My Name", "My Body Parts", "My Emotions"],
                    "relationships": ["My Friends", "My Teachers", "Helping Others"],
                    "art": ["Color Mixing", "Collage Making", "Finger Printing"],
                    "music_movement": ["Action Songs", "Rhythm Sticks", "Freeze Dance"],
                    "animals": ["Pet Animals", "Wild Animals", "Birds Around Us"],
                    "plants": ["Parts of a Plant", "Growing Seeds", "Fruits and Vegetables"],
                    "community": ["Doctor", "Teacher", "Postman"],
                },
                "lkg": {
                    "english": ["Alphabet A-Z", "Letter Sounds", "Simple Words"],
                    "hindi": ["व्यंजन क-ह", "दो अक्षर के शब्द", "चित्र पहचान"],
                    "numbers": ["Numbers 1-10", "Counting 1-20", "Number Order"],
                    "operations": ["More and Less", "Adding with Objects", "Taking Away"],
                    "shapes_patterns": ["2D Shapes", "Patterns", "Symmetry"],
                    "writing_readiness": ["Standing Lines", "Sleeping Lines", "Curves and Loops"],
                    "cooperation": ["Taking Turns", "Group Play", "Following Rules"],
                    "art": ["Drawing Shapes", "Clay Modeling", "Paper Craft"],
                    "my_world": ["My Family", "My Home", "My School"],
                },
                "ukg": {
                    "english": ["CVC Words", "Sight Words", "Simple Sentences"],
                    "hindi": ["तीन अक्षर के शब्द", "सरल वाक्य", "चित्र वर्णन"],
                    "numbers": ["Numbers 1-50", "Before/After/Between", "Skip Counting"],
                    "operations": ["Addition with Pictures", "Subtraction with Pictures", "Word Problems"],
                    "measurement": ["Long and Short", "Heavy and Light", "Day and Night"],
                    "sports_yoga": ["Warm-up Exercises", "Basic Yoga", "Team Games"],
                    "school_readiness": ["Packing My Bag", "Following Schedule", "Asking for Help"],
                    "arts_crafts": ["Origami", "Mask Making", "Greeting Cards"],
                    "our_world": ["Festivals of India", "Transport", "Safety Rules"],
                },
            }
            
            topics_to_create = topic_names.get(stage_code, {}).get(subject_code, [f"Topic {i+1}" for i in range(3)])
            
            for i, topic_name in enumerate(topics_to_create):
                # Create topic
                result = await db.execute(
                    select(Topic).where(Topic.subject_id == subject.id, Topic.code == topic_name.lower().replace(" ", "_"))
                )
                topic = result.scalar_one_or_none()
                if not topic:
                    topic = Topic(
                        subject_id=subject.id,
                        code=topic_name.lower().replace(" ", "_"),
                        name=topic_name,
                        description=f"Learn about {topic_name.lower()}",
                        display_order=i + 1,
                        estimated_duration_minutes=15,
                        is_active=True,
                    )
                    db.add(topic)
                    await db.flush()

                # Create learning objective
                obj_result = await db.execute(
                    select(LearningObjective).where(LearningObjective.topic_id == topic.id, LearningObjective.code == f"obj_{i+1}")
                )
                objective = obj_result.scalar_one_or_none()
                if not objective:
                    objective = LearningObjective(
                        topic_id=topic.id,
                        code=f"obj_{i+1}",
                        description=f"Identify and recognize {topic_name.lower()}",
                        display_order=1,
                        is_assessable=True,
                        is_active=True,
                    )
                    db.add(objective)
                    await db.flush()

                # Create lesson
                lesson_result = await db.execute(
                    select(Lesson).where(Lesson.topic_id == topic.id, Lesson.code == f"lesson_{i+1}")
                )
                lesson = lesson_result.scalar_one_or_none()
                if not lesson:
                    lesson = Lesson(
                        topic_id=topic.id,
                        code=f"lesson_{i+1}",
                        status=ContentStatusEnum.PUBLISHED,
                        version=1,
                        estimated_duration_minutes=15,
                        instructions=f"Let's learn about {topic_name.lower()}!",
                        display_order=i + 1,
                        published_at=datetime.now(timezone.utc),
                        is_active=True,
                    )
                    db.add(lesson)
                    await db.flush()

                    # Link objective to lesson
                    from app.models import LessonObjectiveLink
                    link = LessonObjectiveLink(lesson_id=lesson.id, objective_id=objective.id, display_order=1)
                    db.add(link)

                    # Create lesson translations
                    for trans_lang in ["en", "hi"]:
                        trans_result = await db.execute(
                            select(LessonTranslation).where(
                                LessonTranslation.lesson_id == lesson.id,
                                LessonTranslation.language == trans_lang
                            )
                        )
                        translation = trans_result.scalar_one_or_none()
                        if not translation:
                            translation = LessonTranslation(
                                lesson_id=lesson.id,
                                language=trans_lang,
                                title=topic_name if trans_lang == "en" else f"{topic_name} (हिंदी)",
                                description=f"Learn about {topic_name.lower()}" if trans_lang == "en" else f"{topic_name.lower()} के बारे में सीखें",
                                instructions="Tap to start!" if trans_lang == "en" else "शुरू करने के लिए टैप करें!",
                            )
                            db.add(translation)

                    # Create 3 activities per lesson
                    activity_types = [
                        ActivityTypeEnum.IMAGE_SELECTION,
                        ActivityTypeEnum.PICTURE_MATCHING,
                        ActivityTypeEnum.SIMPLE_QUIZ,
                    ]
                    
                    for j, act_type in enumerate(activity_types):
                        act_result = await db.execute(
                            select(Activity).where(Activity.lesson_id == lesson.id, Activity.code == f"activity_{j+1}")
                        )
                        activity = act_result.scalar_one_or_none()
                        if not activity:
                            activity = Activity(
                                lesson_id=lesson.id,
                                type=act_type,
                                code=f"activity_{j+1}",
                                status=ContentStatusEnum.PUBLISHED,
                                version=1,
                                display_order=j + 1,
                                estimated_duration_minutes=5,
                                instructions=f"Complete this {act_type.value.replace('_', ' ')} activity",
                                configuration={"difficulty": "easy"},
                                is_active=True,
                            )
                            db.add(activity)
                            await db.flush()

                            # Create activity translations
                            for trans_lang in ["en", "hi"]:
                                act_trans_result = await db.execute(
                                    select(ActivityTranslation).where(
                                        ActivityTranslation.activity_id == activity.id,
                                        ActivityTranslation.language == trans_lang
                                    )
                                )
                                act_translation = act_trans_result.scalar_one_or_none()
                                if not act_translation:
                                    act_translation = ActivityTranslation(
                                        activity_id=activity.id,
                                        language=trans_lang,
                                        title=f"Activity {j+1}" if trans_lang == "en" else f"गतिविधि {j+1}",
                                        instructions="Choose the correct answer" if trans_lang == "en" else "सही उत्तर चुनें",
                                    )
                                    db.add(act_translation)

                            # Create 2-3 questions per activity
                            for k in range(2):
                                q_result = await db.execute(
                                    select(Question).where(Question.activity_id == activity.id, Question.display_order == k + 1)
                                )
                                question = q_result.scalar_one_or_none()
                                if not question:
                                    question = Question(
                                        activity_id=activity.id,
                                        question_type="single_choice",
                                        prompt=f"Question {k+1} about {topic_name}" if k == 0 else f"Which one is {topic_name}?",
                                        prompt_audio_url=None,
                                        display_order=k + 1,
                                        points=1,
                                        is_active=True,
                                    )
                                    db.add(question)
                                    await db.flush()

                                    # Create question translations
                                    for trans_lang in ["en", "hi"]:
                                        q_trans_result = await db.execute(
                                            select(QuestionTranslation).where(
                                                QuestionTranslation.question_id == question.id,
                                                QuestionTranslation.language == trans_lang
                                            )
                                        )
                                        q_translation = q_trans_result.scalar_one_or_none()
                                        if not q_translation:
                                            q_translation = QuestionTranslation(
                                                question_id=question.id,
                                                language=trans_lang,
                                                prompt=question.prompt if trans_lang == "en" else f"प्रश्न {k+1}",
                                            )
                                            db.add(q_translation)

                                    # Create answer options (3 options, 1 correct)
                                    for m in range(3):
                                        opt_result = await db.execute(
                                            select(AnswerOption).where(
                                                AnswerOption.question_id == question.id,
                                                AnswerOption.display_order == m + 1
                                            )
                                        )
                                        option = opt_result.scalar_one_or_none()
                                        if not option:
                                            option = AnswerOption(
                                                question_id=question.id,
                                                text=f"Option {m+1}",
                                                is_correct=(m == 0),  # First option is correct
                                                display_order=m + 1,
                                                feedback_correct="Great job!",
                                                feedback_incorrect="Try again!",
                                            )
                                            db.add(option)
                                            await db.flush()

                                            # Create answer option translations
                                            for trans_lang in ["en", "hi"]:
                                                opt_trans_result = await db.execute(
                                                    select(AnswerOptionTranslation).where(
                                                        AnswerOptionTranslation.answer_option_id == option.id,
                                                        AnswerOptionTranslation.language == trans_lang
                                                    )
                                                )
                                                opt_translation = opt_trans_result.scalar_one_or_none()
                                                if not opt_translation:
                                                    opt_translation = AnswerOptionTranslation(
                                                        answer_option_id=option.id,
                                                        language=trans_lang,
                                                        text=f"Option {m+1}" if trans_lang == "en" else f"विकल्प {m+1}",
                                                        feedback_correct="Great job!" if trans_lang == "en" else "बहुत बढ़िया!",
                                                        feedback_incorrect="Try again!" if trans_lang == "en" else "फिर कोशिश करें!",
                                                    )
                                                    db.add(opt_translation)

    await db.commit()


async def seed_rewards(db: AsyncSession):
    """Seed student rewards."""
    rewards_data = [
        {"code": "first_star", "name": "First Star", "description": "Earned your first star!", "reward_type": "star", "points_value": 1, "display_order": 1},
        {"code": "five_stars", "name": "Five Stars", "description": "Collected 5 stars!", "reward_type": "star", "points_value": 5, "display_order": 2},
        {"code": "ten_stars", "name": "Ten Stars", "description": "Collected 10 stars!", "reward_type": "star", "points_value": 10, "display_order": 3},
        {"code": "first_lesson", "name": "First Lesson", "description": "Completed your first lesson!", "reward_type": "badge", "points_value": 10, "display_order": 4},
        {"code": "five_lessons", "name": "Five Lessons", "description": "Completed 5 lessons!", "reward_type": "badge", "points_value": 25, "display_order": 5},
        {"code": "perfect_score", "name": "Perfect Score", "description": "Got 100% on an activity!", "reward_type": "sticker", "points_value": 5, "display_order": 6},
        {"code": "week_streak", "name": "Week Streak", "description": "Learned 7 days in a row!", "reward_type": "badge", "points_value": 50, "display_order": 7},
        {"code": "animal_friend", "name": "Animal Friend", "description": "Met all the animal friends!", "reward_type": "sticker", "points_value": 15, "display_order": 8},
        {"code": "color_master", "name": "Color Master", "description": "Learned all the colors!", "reward_type": "badge", "points_value": 20, "display_order": 9},
        {"code": "shape_explorer", "name": "Shape Explorer", "description": "Found all the shapes!", "reward_type": "badge", "points_value": 20, "display_order": 10},
    ]

    for reward_data in rewards_data:
        result = await db.execute(select(StudentReward).where(StudentReward.code == reward_data["code"]))
        reward = result.scalar_one_or_none()
        if not reward:
            reward = StudentReward(**reward_data, is_active=True)
            db.add(reward)

    await db.commit()


async def main():
    """Main seeding function."""
    print("Seeding curriculum data...")
    print(f"Database: {settings.database_url}")

    async with async_session_factory() as db:
        try:
            # Seed stages
            print("Seeding learning stages...")
            stages = await seed_stages(db)
            print(f"Created {len(stages)} stages")

            # Seed domains
            print("Seeding learning domains...")
            domains = await seed_domains(db, stages)
            total_domains = sum(len(d) for d in domains.values())
            print(f"Created {total_domains} domains")

            # Seed subjects
            print("Seeding subjects...")
            subjects = await seed_subjects(db, stages, domains)
            total_subjects = sum(len(s) for s in subjects.values())
            print(f"Created {total_subjects} subjects")

            # Seed topics, lessons, activities, questions
            print("Seeding topics, lessons, activities, and questions...")
            await seed_topics_and_content(db, stages, subjects)
            print("Content seeded successfully")

            # Seed rewards
            print("Seeding rewards...")
            await seed_rewards(db)
            print("Rewards seeded successfully")

            print("\nAll seed data created successfully!")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())