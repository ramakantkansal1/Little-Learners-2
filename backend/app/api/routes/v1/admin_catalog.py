"""Allowlisted curriculum structure and task editors; administrator-only."""

from typing import Literal
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.orm import lazyload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.permissions.dependencies import require_admin
from app.models import (
    LearningDomain,
    Subject,
    Topic,
    LearningObjective,
    Question,
    AnswerOption,
    Lesson,
    Activity,
    AuditLog,
    PlatformSetting,
    StudentProfile,
)

router = APIRouter(dependencies=[Depends(require_admin)])


class DomainInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage_id: int = Field(gt=0)
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=100)
    is_active: bool = True


class TopicInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject_id: int = Field(gt=0)
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    is_active: bool = True


class ObjectiveInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topic_id: int = Field(gt=0)
    code: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=5000)
    is_active: bool = True


class QuestionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    activity_id: int = Field(gt=0)
    prompt: str = Field(min_length=1, max_length=5000)
    question_type: Literal["single_choice", "multiple_choice", "exploration"] = "single_choice"
    points: int = Field(1, ge=0, le=100)
    display_order: int = Field(0, ge=0)
    configuration: dict = Field(default_factory=dict)
    is_active: bool = True


class OptionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question_id: int = Field(gt=0)
    text: str = Field(min_length=1, max_length=1000)
    is_correct: bool = False
    display_order: int = Field(0, ge=0)
    configuration: dict = Field(default_factory=dict)
    image_url: str | None = Field(None, max_length=500)


CATALOG = {
    "domains": (LearningDomain, DomainInput),
    "topics": (Topic, TopicInput),
    "objectives": (LearningObjective, ObjectiveInput),
    "questions": (Question, QuestionInput),
    "options": (AnswerOption, OptionInput),
}


def kind_spec(kind):
    if kind not in CATALOG:
        raise NotFoundException("Unknown curriculum collection")
    return CATALOG[kind]


def serialize(row):
    return {
        c.name: getattr(row, c.name)
        for c in row.__table__.columns
        if c.name not in ("deleted_at", "created_at", "updated_at")
    }


@router.get("/catalog/{kind}")
async def list_catalog(
    kind: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    parent_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    model, _ = kind_spec(kind)
    query = select(model).options(lazyload("*"))
    if hasattr(model, "deleted_at"):
        query = query.where(model.deleted_at.is_(None))
    parent = {
        "domains": "stage_id",
        "topics": "subject_id",
        "objectives": "topic_id",
        "questions": "activity_id",
        "options": "question_id",
    }[kind]
    if parent_id is not None:
        query = query.where(getattr(model, parent) == parent_id)
    count = await db.scalar(select(func.count()).select_from(query.subquery()))
    rows = (await db.execute(query.order_by(model.id.desc()).limit(limit).offset(offset))).scalars()
    return {"items": [serialize(r) for r in rows], "total": count}


async def save(kind, payload, row_id, db, user):
    model, schema = kind_spec(kind)
    try:
        data = schema.model_validate(payload).model_dump()
    except Exception as exc:
        raise ValidationException("Check the required curriculum fields") from exc
    # Verify all foreign keys through explicit allowlisted models, not arbitrary table names.
    from app.models import LearningStage

    links = {
        "stage_id": LearningStage,
        "subject_id": Subject,
        "topic_id": Topic,
        "activity_id": Activity,
        "question_id": Question,
    }
    for key, target in links.items():
        if key in data and not await db.scalar(select(target.id).where(target.id == data[key])):
            raise ValidationException(f'Choose an existing {key.removesuffix("_id")}')
    if kind in ("questions", "options"):
        activity_id = data.get("activity_id")
        if kind == "options":
            question = await db.get(Question, data["question_id"])
            activity_id = question.activity_id
        activity = await db.get(Activity, activity_id)
        lesson = await db.get(Lesson, activity.lesson_id)
        if lesson.status.value == "published":
            raise ValidationException("Unpublish the lesson before changing its tasks")
    if kind == "questions" and data["question_type"] == "exploration":
        activity = await db.get(Activity, data["activity_id"])
        if activity.type.value not in ("tracing", "story_listening"):
            raise ValidationException("Exploration tasks require drawing or story activities")
    row = await db.get(model, row_id) if row_id else model()
    if not row:
        raise NotFoundException("Record not found")
    old = serialize(row) if row_id else None
    for k, v in data.items():
        setattr(row, k, v)
    db.add(row)
    await db.flush()
    db.add(
        AuditLog(
            user_id=user.id,
            action="update" if row_id else "create",
            resource_type=kind,
            resource_id=row.id,
            old_values=old,
            new_values=data,
            success=True,
        )
    )
    await db.commit()
    return serialize(row)


@router.post("/catalog/{kind}", status_code=201)
async def create_catalog(
    kind: str, payload: dict, db: AsyncSession = Depends(get_db), user=Depends(require_admin)
):
    return await save(kind, payload, None, db, user)


@router.put("/catalog/{kind}/{row_id}")
async def update_catalog(
    kind: str,
    row_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin),
):
    return await save(kind, payload, row_id, db, user)


@router.get("/children")
async def children(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(StudentProfile)
            .options(lazyload("*"))
            .where(StudentProfile.deleted_at.is_(None))
            .order_by(StudentProfile.id.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars()
    return [
        {
            "id": r.id,
            "display_name": r.display_name,
            "stage_id": r.current_stage_id,
            "is_active": r.is_active,
        }
        for r in rows
    ]


class PlatformInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    application_name: str = Field("Happy Little Learners", min_length=1, max_length=100)
    support_email: str = Field("", max_length=255)
    english_enabled: bool = True
    hindi_enabled: bool = True


@router.get("/platform-settings")
async def settings(db: AsyncSession = Depends(get_db)):
    row = await db.get(PlatformSetting, "public")
    return row.value if row else PlatformInput().model_dump()


@router.put("/platform-settings")
async def set_settings(
    payload: PlatformInput, db: AsyncSession = Depends(get_db), user=Depends(require_admin)
):
    if not payload.english_enabled and not payload.hindi_enabled:
        raise ValidationException("Enable at least one learning language")
    row = await db.get(PlatformSetting, "public")
    if not row:
        row = PlatformSetting(key="public")
        db.add(row)
    row.value = payload.model_dump()
    db.add(
        AuditLog(
            user_id=user.id,
            action="settings_change",
            resource_type="platform",
            resource_id=None,
            new_values=row.value,
            success=True,
        )
    )
    await db.commit()
    return row.value


@router.get("/lessons/{lesson_id}/preview")
async def preview(lesson_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    from app.models import LessonTranslation

    lesson = await db.scalar(
        select(Lesson)
        .options(lazyload("*"), selectinload(Lesson.translations))
        .where(Lesson.id == lesson_id)
    )
    if not lesson:
        raise NotFoundException("Lesson not found")
    activities = (
        await db.execute(
            select(Activity).options(lazyload("*")).where(Activity.lesson_id == lesson_id)
        )
    ).scalars()
    output = []
    for activity in activities:
        questions = (
            await db.execute(
                select(Question).options(lazyload("*")).where(Question.activity_id == activity.id)
            )
        ).scalars()
        tasks = []
        for q in questions:
            opts = (
                await db.execute(
                    select(AnswerOption)
                    .options(lazyload("*"))
                    .where(AnswerOption.question_id == q.id)
                )
            ).scalars()
            tasks.append({**serialize(q), "options": [serialize(o) for o in opts]})
        output.append({**serialize(activity), "questions": tasks})
    return {
        "id": lesson.id,
        "code": lesson.code,
        "translations": [{"language": t.language, "title": t.title} for t in lesson.translations],
        "activities": output,
    }


class ObjectiveAssignment(BaseModel):
    objective_ids: list[int] = Field(default_factory=list, max_length=50)


@router.put("/lessons/{lesson_id}/objectives")
async def assign_objectives(
    lesson_id: int,
    payload: ObjectiveAssignment,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin),
):
    from sqlalchemy.orm import selectinload

    lesson = await db.scalar(
        select(Lesson)
        .options(lazyload("*"), selectinload(Lesson.learning_objectives))
        .where(Lesson.id == lesson_id)
    )
    if not lesson:
        raise NotFoundException("Lesson not found")
    objectives = list(
        (
            await db.execute(
                select(LearningObjective)
                .options(lazyload("*"))
                .where(
                    LearningObjective.id.in_(payload.objective_ids),
                    LearningObjective.topic_id == lesson.topic_id,
                    LearningObjective.is_active.is_(True),
                )
            )
        ).scalars()
    )
    if len(objectives) != len(set(payload.objective_ids)):
        raise ValidationException("Choose active objectives from this lesson topic")
    lesson.learning_objectives = objectives
    db.add(
        AuditLog(
            user_id=user.id,
            action="update",
            resource_type="lesson_objectives",
            resource_id=lesson_id,
            new_values=payload.model_dump(),
            success=True,
        )
    )
    await db.commit()
    return payload


class ChildAdminUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=100)
    current_stage_id: int | None = Field(None, gt=0)
    is_active: bool | None = None


@router.patch("/children/{child_id}")
async def update_child(
    child_id: int,
    payload: ChildAdminUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_admin),
):
    from app.models import LearningStage, User

    child = await db.get(StudentProfile, child_id)
    if not child or child.is_deleted:
        raise NotFoundException("Child not found")
    if payload.current_stage_id and not await db.scalar(
        select(LearningStage.id).where(
            LearningStage.id == payload.current_stage_id, LearningStage.is_active.is_(True)
        )
    ):
        raise ValidationException("Choose an active stage")
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(child, key, value)
    if payload.is_active is not None:
        account = await db.get(User, child.user_id)
        account.is_active = payload.is_active
    db.add(
        AuditLog(
            user_id=user.id,
            action="update",
            resource_type="student",
            resource_id=child_id,
            new_values=payload.model_dump(exclude_none=True),
            success=True,
        )
    )
    await db.commit()
    return {
        "id": child.id,
        "display_name": child.display_name,
        "stage_id": child.current_stage_id,
        "is_active": child.is_active,
    }
