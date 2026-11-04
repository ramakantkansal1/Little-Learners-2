"""Add a small original Phase 6 pilot curriculum. Idempotent; preserves existing lessons.
Run: python -m app.scripts.seed_phase6
"""

import asyncio
from sqlalchemy import select
from sqlalchemy.orm import lazyload
from app.core.database import async_session_factory, engine
from app.models import (
    LearningStage,
    LearningDomain,
    Subject,
    Topic,
    Lesson,
    LessonTranslation,
    Activity,
    ActivityTranslation,
    Question,
    QuestionTranslation,
    AnswerOption,
    AnswerOptionTranslation,
    ActivityTypeEnum,
    StudentReward,
)

# Original prompts; Unicode emoji and geometric symbols use the device's font.
TASKS = [
    (
        "image_selection",
        "Find the elephant",
        "हाथी खोजो",
        ["🐘", "🐇", "🐟"],
        {"promptEmoji": "🐘"},
    ),
    (
        "color_identification",
        "Match this red colour",
        "लाल रंग मिलाओ",
        ["Red · लाल", "Blue · नीला", "Yellow · पीला"],
        {"targetColor": "#ef4444", "targetColorName": "Red"},
    ),
    (
        "shape_matching",
        "Match the circle",
        "गोला मिलाओ",
        ["Circle · गोला", "Square · चौकोर", "Triangle · त्रिकोण"],
        {"targetShape": "circle"},
    ),
    (
        "picture_matching",
        "Find the same mango",
        "वही आम खोजो",
        ["🥭", "🍌", "🍎"],
        {"targetEmoji": "🥭"},
    ),
    ("alphabet_recognition", "Find A like Apple", "A खोजो", ["A", "B", "C"], {"targetLetter": "A"}),
    (
        "letter_sound",
        "A is for apple. Find A.",
        "A से apple। A खोजो।",
        ["A", "M", "S"],
        {"targetLetter": "A"},
    ),
    ("number_recognition", "Find the number 2", "अंक २ खोजो", ["2", "1", "3"], {"targetNumber": 2}),
    (
        "counting",
        "How many mangoes?",
        "कितने आम हैं?",
        ["2", "1", "3"],
        {"totalCount": 2, "objectEmoji": "🥭"},
    ),
    (
        "sorting",
        "The banana is a fruit. Which group?",
        "केला फल है। कौन सा समूह?",
        ["Fruit · फल", "Transport · वाहन", "Clothes · कपड़े"],
        {"items": [{"name": "Banana", "emoji": "🍌", "category": "fruit"}]},
    ),
    (
        "sequencing",
        "What comes next? Red, blue, red…",
        "आगे क्या आएगा? लाल, नीला, लाल…",
        ["🔵", "🔴", "🟡"],
        {
            "sequence": [
                {"value": "🔴"},
                {"value": "🔵"},
                {"value": "🔴"},
                {"value": "?", "isMissing": True},
            ]
        },
    ),
    (
        "tracing",
        "Explore a round path with your finger",
        "उँगली से गोल रास्ता बनाओ",
        [],
        {"traceTarget": "○", "traceType": "shape"},
    ),
    (
        "story_listening",
        "Enjoy Meena and the mango together",
        "मीना और आम की कहानी सुनो",
        [],
        {
            "storyTitle": "Meena and the mango",
            "storyText": "Meena found a ripe mango. She washed it with her grown-up. They shared it with her little brother. Everyone smiled. मीना को एक आम मिला। उसने आम धोया और भाई के साथ बाँटा। सब मुस्कुराए।",
        },
    ),
    (
        "picture_comprehension",
        "Meena shares a mango. What fruit does she share?",
        "मीना आम बाँटती है। कौन सा फल?",
        ["🥭", "🍎", "🍌"],
        {"pictureEmoji": "🥭", "storyText": "Meena shares a mango with her brother."},
    ),
    (
        "simple_quiz",
        "What do we wash before eating?",
        "खाने से पहले क्या धोते हैं?",
        ["Hands · हाथ", "Shoes · जूते", "Books · किताबें"],
        {"promptEmoji": "🧼"},
    ),
    (
        "audio_identification",
        "The cow says moo. Find the cow.",
        "गाय रंभाती है। गाय खोजो।",
        ["🐄", "🐕", "🐈"],
        {"promptEmoji": "🐄"},
    ),
]


async def seed():
    async with async_session_factory() as db:
        from app.scripts.seed_data import seed_stages, seed_roles

        await seed_roles(db)
        await seed_stages(db)
        stages = (
            await db.execute(
                select(LearningStage)
                .options(lazyload("*"))
                .where(LearningStage.code.in_(["playgroup", "nursery", "lkg", "ukg"]))
            )
        ).scalars()
        for stage in stages:
            code = f"phase6_{stage.code}"
            lesson = (
                await db.execute(select(Lesson).options(lazyload("*")).where(Lesson.code == code))
            ).scalar_one_or_none()
            domain = (
                await db.execute(
                    select(LearningDomain)
                    .options(lazyload("*"))
                    .where(
                        LearningDomain.stage_id == stage.id, LearningDomain.code == "phase6_play"
                    )
                )
            ).scalar_one_or_none()
            if not domain:
                domain = LearningDomain(
                    stage_id=stage.id,
                    code="phase6_play",
                    name="Play and discovery",
                    display_order=99,
                    is_active=True,
                )
                db.add(domain)
                await db.flush()
            if lesson:
                subject = (
                    await db.execute(
                        select(Subject).options(lazyload("*")).where(Subject.code == code)
                    )
                ).scalar_one()
                subject.domain_id = domain.id
                continue
            subject = Subject(
                stage_id=stage.id,
                domain_id=domain.id,
                code=code,
                name="Playful discovery",
                display_order=99,
                is_active=True,
            )
            db.add(subject)
            await db.flush()
            topic = Topic(
                subject_id=subject.id, code=code, name="Our familiar world", is_active=True
            )
            db.add(topic)
            await db.flush()
            lesson = Lesson(
                topic_id=topic.id,
                code=code,
                status="published",
                is_active=True,
                estimated_duration_minutes=3,
            )
            db.add(lesson)
            await db.flush()
            for lang, title in [("en", "Little discoveries"), ("hi", "नन्ही खोजें")]:
                db.add(
                    LessonTranslation(
                        lesson_id=lesson.id,
                        language=lang,
                        title=title,
                        description="Short playful activities to enjoy with a grown-up. Choose any task; no timer or reading requirement.",
                    )
                )
            for order, (kind, en, hi, choices, config) in enumerate(TASKS, 1):
                activity = Activity(
                    lesson_id=lesson.id,
                    code=f"{code}_{kind}",
                    type=ActivityTypeEnum(kind),
                    status="published",
                    is_active=True,
                    display_order=order,
                    estimated_duration_minutes=2,
                    instructions="Explore together. Use Listen if a device voice is available. Take a break whenever you like.",
                )
                db.add(activity)
                await db.flush()
                for lang, title in [("en", en), ("hi", hi)]:
                    db.add(ActivityTranslation(activity_id=activity.id, language=lang, title=title))
                question = Question(
                    activity_id=activity.id,
                    question_type="single_choice" if choices else "exploration",
                    prompt=en,
                    configuration=config,
                    points=1,
                    display_order=1,
                    is_active=True,
                )
                db.add(question)
                await db.flush()
                db.add(QuestionTranslation(question_id=question.id, language="hi", prompt=hi))
                for i, text in enumerate(choices):
                    option_config = {
                        "emoji": text,
                        "shape": ["circle", "square", "triangle"][i],
                        "color": ["#ef4444", "#3b82f6", "#facc15"][i],
                    }
                    option = AnswerOption(
                        question_id=question.id,
                        text=text,
                        configuration=option_config,
                        is_correct=i == 0,
                        display_order=i,
                    )
                    db.add(option)
        for code, name, kind in [
            ("completion_star", "Activity discovery star", "star"),
            ("first_star", "First discovery", "badge"),
            ("five_stars", "Five discoveries", "star"),
            ("ten_stars", "Ten discoveries", "star"),
            ("first_lesson", "Journey milestone", "badge"),
            ("five_lessons", "Five lesson milestone", "badge"),
            ("perfect_score", "Careful explorer", "sticker"),
        ]:
            if not (
                await db.execute(select(StudentReward.id).where(StudentReward.code == code))
            ).first():
                db.add(
                    StudentReward(
                        code=code, name=name, reward_type=kind, points_value=1, is_active=True
                    )
                )
        await db.commit()
        print(
            "Phase 6 pilot curriculum and completion rewards are ready; existing content preserved."
        )
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
