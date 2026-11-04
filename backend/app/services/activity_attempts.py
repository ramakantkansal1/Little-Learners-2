"""Transactional activity execution. Raw strokes/audio and device data are never stored."""

from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.orm import lazyload

from app.core.exceptions import NotFoundException, ValidationException
from app.models import (
    StudentProfile,
    Activity,
    Lesson,
    Topic,
    Subject,
    Question,
    AnswerOption,
    ActivityAttempt,
    ActivityResponse,
    StudentLessonProgress,
    ActivityTranslation,
    LessonTranslation,
    StudentReward,
    StudentRewardAward,
    QuestionTranslation,
    AnswerOptionTranslation,
)


def now():
    return datetime.now(timezone.utc)


async def student_for_update(db, user_id):
    # Authentication has performed read-only queries. End that transaction before
    # acquiring the child lock: MySQL REPEATABLE READ must not reuse the earlier
    # auth snapshot after waiting for a concurrent writer's commit.
    await db.commit()
    # All writes for a child take this lock, serializing numbering and reward awards.
    student = (
        await db.execute(
            select(StudentProfile)
            .options(lazyload("*"))
            .where(
                StudentProfile.user_id == user_id,
                StudentProfile.is_active.is_(True),
                StudentProfile.deleted_at.is_(None),
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not student:
        raise NotFoundException("Student profile not found")
    return student


async def available_activity(db, student, activity_id):
    activity = (
        await db.execute(
            select(Activity)
            .options(lazyload("*"))
            .join(Lesson, Activity.lesson_id == Lesson.id)
            .join(Topic, Lesson.topic_id == Topic.id)
            .join(Subject, Topic.subject_id == Subject.id)
            .where(
                Activity.id == activity_id,
                Activity.status == "published",
                Activity.is_active.is_(True),
                Activity.deleted_at.is_(None),
                Lesson.status == "published",
                Lesson.is_active.is_(True),
                Lesson.deleted_at.is_(None),
                Subject.stage_id == student.current_stage_id,
                Subject.is_active.is_(True),
                Topic.is_active.is_(True),
                Topic.deleted_at.is_(None),
                Subject.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if not activity:
        raise NotFoundException("Activity not available for this learning stage")
    return activity


async def owned_attempt(db, student, attempt_id):
    attempt = (
        await db.execute(
            select(ActivityAttempt)
            .options(lazyload("*"))
            .where(ActivityAttempt.id == attempt_id, ActivityAttempt.student_id == student.id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not attempt:
        raise NotFoundException("Attempt not found")
    activity = await available_activity(db, student, attempt.activity_id)
    return attempt, activity


async def questions_for(db, activity_id):
    return list(
        (
            await db.execute(
                select(Question)
                .options(lazyload("*"))
                .where(Question.activity_id == activity_id, Question.is_active.is_(True))
                .order_by(Question.display_order, Question.id)
            )
        ).scalars()
    )


async def progress_state(db, attempt, questions):
    rows = list(
        (
            await db.execute(
                select(ActivityResponse)
                .options(lazyload("*"))
                .where(ActivityResponse.attempt_id == attempt.id)
            )
        ).scalars()
    )
    by_id = {r.question_id: r for r in rows}
    index = next(
        (i for i, q in enumerate(questions) if q.id not in by_id), max(0, len(questions) - 1)
    )
    return {
        "current_question_index": index,
        "accumulated_score": sum(r.points_earned for r in rows),
        "correct_count": sum(bool(r.is_correct) for r in rows),
        "answers_submitted": len(rows),
        "responses": [
            {
                "question_id": r.question_id,
                "selected_option_ids": r.selected_option_ids,
                "is_correct": r.is_correct,
            }
            for r in rows
        ],
    }


async def title_for(db, model, foreign_key, item, language):
    title = (
        await db.execute(
            select(model.title).where(foreign_key == item.id, model.language == language)
        )
    ).scalar_one_or_none()
    if not title and language != "en":
        title = (
            await db.execute(
                select(model.title).where(foreign_key == item.id, model.language == "en")
            )
        ).scalar_one_or_none()
    return title or item.code


async def detail(db, student, attempt, activity):
    questions = await questions_for(db, activity.id)
    if not questions:
        raise ValidationException("This activity has no published tasks yet")
    data = []
    for q in questions:
        options = (
            await db.execute(
                select(AnswerOption)
                .options(lazyload("*"))
                .where(AnswerOption.question_id == q.id)
                .order_by(AnswerOption.display_order)
            )
        ).scalars()
        trans = (
            await db.execute(
                select(QuestionTranslation)
                .options(lazyload("*"))
                .where(
                    QuestionTranslation.question_id == q.id,
                    QuestionTranslation.language == student.preferred_language,
                )
            )
        ).scalar_one_or_none()
        options = list(options)
        translated = dict(
            (
                await db.execute(
                    select(
                        AnswerOptionTranslation.answer_option_id, AnswerOptionTranslation.text
                    ).where(
                        AnswerOptionTranslation.answer_option_id.in_([o.id for o in options]),
                        AnswerOptionTranslation.language == student.preferred_language,
                    )
                )
            ).all()
        )
        data.append(
            {
                "id": q.id,
                "question_type": q.question_type,
                "prompt": trans.prompt if trans else q.prompt,
                "prompt_audio_url": trans.prompt_audio_url if trans else q.prompt_audio_url,
                "display_order": q.display_order,
                "points": q.points,
                "configuration": q.configuration,
                "options": [
                    {
                        "id": o.id,
                        "text": translated.get(o.id, o.text),
                        "image_url": o.image_url,
                        "text_audio_url": o.text_audio_url,
                        "display_order": o.display_order,
                        "configuration": o.configuration,
                    }
                    for o in options
                ],
            }
        )
    state = await progress_state(db, attempt, questions)
    progress = (
        await db.get(StudentLessonProgress, attempt.lesson_progress_id)
        if attempt.lesson_progress_id
        else None
    )
    return {
        "attempt_id": attempt.id,
        "activity": {
            "id": activity.id,
            "code": activity.code,
            "type": activity.type.value,
            "title": await title_for(
                db,
                ActivityTranslation,
                ActivityTranslation.activity_id,
                activity,
                student.preferred_language,
            ),
            "instructions": activity.instructions,
            "estimated_duration_minutes": activity.estimated_duration_minutes,
            "configuration": activity.configuration,
            "questions": data,
        },
        "questions": data,
        "saved_progress": state,
        "status": attempt.status,
        "score": attempt.score,
        "time_spent_seconds": attempt.time_spent_seconds,
        "rewards_enabled": student.rewards_enabled,
        "lesson_progress": (
            {
                "status": progress.status,
                "completion_percentage": progress.completion_percentage,
                "time_spent_seconds": progress.time_spent_seconds,
            }
            if progress
            else None
        ),
    }


async def start(db, user_id, activity_id):
    student = await student_for_update(db, user_id)
    activity = await available_activity(db, student, activity_id)
    if not await questions_for(db, activity.id):
        raise ValidationException("This activity has no published tasks yet")
    # Reload and concurrent double clicks resume the same unfinished attempt.
    attempt = (
        await db.execute(
            select(ActivityAttempt)
            .options(lazyload("*"))
            .where(
                ActivityAttempt.student_id == student.id,
                ActivityAttempt.activity_id == activity_id,
                ActivityAttempt.status.in_(["started", "in_progress"]),
            )
            .order_by(ActivityAttempt.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not attempt:
        progress = (
            await db.execute(
                select(StudentLessonProgress)
                .options(lazyload("*"))
                .where(
                    StudentLessonProgress.student_id == student.id,
                    StudentLessonProgress.lesson_id == activity.lesson_id,
                )
            )
        ).scalar_one_or_none()
        if not progress:
            progress = StudentLessonProgress(
                student_id=student.id,
                lesson_id=activity.lesson_id,
                status="in_progress",
                started_at=now(),
                last_activity_at=now(),
                current_activity_id=activity.id,
            )
            db.add(progress)
            await db.flush()
        number = (
            await db.execute(
                select(func.max(ActivityAttempt.attempt_number)).where(
                    ActivityAttempt.student_id == student.id,
                    ActivityAttempt.activity_id == activity.id,
                )
            )
        ).scalar() or 0
        attempt = ActivityAttempt(
            student_id=student.id,
            activity_id=activity.id,
            lesson_progress_id=progress.id,
            attempt_number=number + 1,
            status="started",
            started_at=now(),
        )
        db.add(attempt)
        await db.flush()
    result = await detail(db, student, attempt, activity)
    await db.commit()
    return result


async def record_time(db, attempt, seconds):
    # Cumulative seconds make transport retries idempotent. Bound to elapsed wall
    # time and 30 minutes per attempt. The browser counts foreground active time.
    started = attempt.started_at.replace(tzinfo=timezone.utc)
    elapsed = max(0, int((now() - started).total_seconds()))
    attempt.time_spent_seconds = max(attempt.time_spent_seconds or 0, min(seconds, elapsed, 1800))
    attempt.updated_at = now()
    await db.flush()


async def answer(db, user_id, attempt_id, request):
    student = await student_for_update(db, user_id)
    attempt, activity = await owned_attempt(db, student, attempt_id)
    if attempt.status == "completed":
        raise ValidationException("Attempt already completed")
    questions = await questions_for(db, activity.id)
    question = next((q for q in questions if q.id == request.question_id), None)
    if not question:
        raise NotFoundException("Question not found")
    options = list(
        (
            await db.execute(
                select(AnswerOption)
                .options(lazyload("*"))
                .where(AnswerOption.question_id == question.id)
            )
        ).scalars()
    )
    selected = set(request.selected_option_ids)
    valid = {o.id for o in options}
    correct = {o.id for o in options if o.is_correct}
    if len(selected) != len(request.selected_option_ids) or not selected.issubset(valid):
        raise ValidationException("Choose only options belonging to this question")
    exploratory = (
        activity.type.value in ("tracing", "story_listening")
        and question.question_type == "exploration"
    )
    is_correct = bool(selected) and selected == correct
    if exploratory:
        is_correct = request.outcome == "explored"
    existing = (
        await db.execute(
            select(ActivityResponse)
            .options(lazyload("*"))
            .where(
                ActivityResponse.attempt_id == attempt.id,
                ActivityResponse.question_id == question.id,
            )
        )
    ).scalar_one_or_none()
    if not existing:
        existing = ActivityResponse(attempt_id=attempt.id, question_id=question.id)
        db.add(existing)
    existing.selected_option_ids = sorted(selected)
    existing.is_correct = is_correct
    existing.points_earned = question.points if is_correct else 0
    # Only retain completion outcome, never drawing paths or audio recordings.
    existing.metadata_json = {"outcome": "explored"} if exploratory else None
    await record_time(db, attempt, request.time_spent_seconds)
    attempt.status = "in_progress"
    await db.flush()
    state = await progress_state(db, attempt, questions)
    attempt.metadata_json = {**(attempt.metadata_json or {}), **state}
    student.last_activity_at = now()
    await db.commit()
    return {
        "is_correct": is_correct,
        "points_earned": existing.points_earned,
        "correct_options": sorted(correct),
        "saved_progress": state,
        "lesson_progress": None,
    }


async def complete(db, user_id, attempt_id, seconds):
    student = await student_for_update(db, user_id)
    attempt, activity = await owned_attempt(db, student, attempt_id)
    cached = (attempt.metadata_json or {}).get("completion")
    if attempt.status == "completed":
        # A lost response can be retried without new writes or reward awards.
        return cached or {
            "score": attempt.score or 0,
            "passed": bool(attempt.passed),
            "rewards_earned": [],
            "next_activity_id": None,
        }
    questions = await questions_for(db, activity.id)
    state = await progress_state(db, attempt, questions)
    if not questions or state["answers_submitted"] != len(questions):
        raise ValidationException("Finish each task before completing this activity")
    max_points = sum(q.points for q in questions)
    score = round(100 * state["accumulated_score"] / max_points) if max_points else 0
    await record_time(db, attempt, seconds)
    attempt.score = min(100, max(0, score))
    attempt.max_score = max_points
    attempt.passed = score >= 70
    attempt.status = "completed"
    attempt.completed_at = now()
    student.last_activity_at = now()
    await db.flush()
    from app.api.routes.v1.students import update_lesson_progress

    progress = await update_lesson_progress(db, student, activity.lesson_id, activity.id)
    progress.time_spent_seconds = (
        await db.execute(
            select(func.coalesce(func.sum(ActivityAttempt.time_spent_seconds), 0)).where(
                ActivityAttempt.student_id == student.id,
                ActivityAttempt.lesson_progress_id == progress.id,
            )
        )
    ).scalar()
    completed_activities = (
        await db.execute(
            select(func.count(func.distinct(ActivityAttempt.activity_id))).where(
                ActivityAttempt.student_id == student.id, ActivityAttempt.status == "completed"
            )
        )
    ).scalar() or 0
    completed_lessons = (
        await db.execute(
            select(func.count(StudentLessonProgress.id)).where(
                StudentLessonProgress.student_id == student.id,
                StudentLessonProgress.status == "completed",
            )
        )
    ).scalar() or 0
    if progress.status == "completed":
        # The session disables autoflush, so include this just-completed lesson.
        await db.flush()
        completed_lessons = (
            await db.execute(
                select(func.count(StudentLessonProgress.id)).where(
                    StudentLessonProgress.student_id == student.id,
                    StudentLessonProgress.status == "completed",
                )
            )
        ).scalar() or 0
    codes = {"first_star", "completion_star"}
    if completed_activities >= 5:
        codes.add("five_stars")
    if completed_activities >= 10:
        codes.add("ten_stars")
    if completed_lessons >= 1:
        codes.add("first_lesson")
    if completed_lessons >= 5:
        codes.add("five_lessons")
    if score == 100:
        codes.add("perfect_score")
    earned = []
    if student.rewards_enabled:
        rewards = (
            await db.execute(
                select(StudentReward)
                .options(lazyload("*"))
                .where(StudentReward.code.in_(codes), StudentReward.is_active.is_(True))
            )
        ).scalars()
        for reward in rewards:
            award_key = (
                f"activity:{activity.id}" if reward.code == "completion_star" else "milestone"
            )
            awarded = (
                await db.execute(
                    select(StudentRewardAward.id).where(
                        StudentRewardAward.student_id == student.id,
                        StudentRewardAward.reward_id == reward.id,
                        StudentRewardAward.award_key == award_key,
                    )
                )
            ).first()
            if not awarded:
                db.add(
                    StudentRewardAward(
                        student_id=student.id,
                        reward_id=reward.id,
                        attempt_id=attempt.id,
                        award_key=award_key,
                    )
                )
                earned.append(
                    {"name": reward.name, "type": reward.reward_type, "image_url": reward.image_url}
                )
    next_id = (
        await db.execute(
            select(Activity.id)
            .where(
                Activity.lesson_id == activity.lesson_id,
                Activity.status == "published",
                Activity.is_active.is_(True),
                Activity.display_order > activity.display_order,
            )
            .order_by(Activity.display_order)
            .limit(1)
        )
    ).scalar_one_or_none()
    result = {
        "score": attempt.score,
        "passed": attempt.passed,
        "correct_count": state["correct_count"],
        "rewards_earned": earned,
        "rewards_enabled": student.rewards_enabled,
        "next_activity_id": next_id,
        "lesson_progress": {
            "status": progress.status,
            "completion_percentage": progress.completion_percentage,
        },
    }
    if attempt.passed:
        from app.api.routes.v1.students import calculate_streak

        current, longest = await calculate_streak(db, student, now().date())
        result["streak"] = {
            "current_streak": current,
            "longest_streak": longest,
            "last_activity_date": now().date().isoformat(),
        }
    attempt.metadata_json = {**state, "completion": result}
    await db.commit()
    return result
