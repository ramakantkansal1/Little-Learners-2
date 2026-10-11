"""
Curriculum models: stages, domains, subjects, topics, objectives, lessons, activities.
"""
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, Text, Integer, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin, SoftDeleteMixin
import enum


class ContentStatusEnum(str, enum.Enum):
    """Publication status for curriculum content."""
    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ActivityTypeEnum(str, enum.Enum):
    """Types of interactive activities."""
    IMAGE_SELECTION = "image_selection"
    COLOR_IDENTIFICATION = "color_identification"
    SHAPE_MATCHING = "shape_matching"
    PICTURE_MATCHING = "picture_matching"
    ALPHABET_RECOGNITION = "alphabet_recognition"
    LETTER_SOUND = "letter_sound"
    NUMBER_RECOGNITION = "number_recognition"
    COUNTING = "counting"
    SORTING = "sorting"
    SEQUENCING = "sequencing"
    TRACING = "tracing"
    STORY_LISTENING = "story_listening"
    PICTURE_COMPREHENSION = "picture_comprehension"
    SIMPLE_QUIZ = "simple_quiz"
    AUDIO_IDENTIFICATION = "audio_identification"


class LearningStage(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Educational stages: Playgroup, Nursery, LKG, UKG."""
    __tablename__ = "learning_stages"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)  # playgroup, nursery, lkg, ukg
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    min_age_months: Mapped[int] = mapped_column(Integer, nullable=False)
    max_age_months: Mapped[int] = mapped_column(Integer, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # icon identifier
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # hex color
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    domains: Mapped[List["LearningDomain"]] = relationship(back_populates="stage", lazy="selectin")
    subjects: Mapped[List["Subject"]] = relationship(back_populates="stage", lazy="selectin")
    enrollments: Mapped[List["StudentEnrollment"]] = relationship(back_populates="stage", lazy="selectin")
    student_profiles: Mapped[List["StudentProfile"]] = relationship(back_populates="current_stage", lazy="selectin")

    def __repr__(self) -> str:
        return f"<LearningStage(code={self.code}, name={self.name})>"


class LearningDomain(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Learning domains: Language, Mathematics, Physical, Cognitive, Socio-emotional, Creative, Environmental."""
    __tablename__ = "learning_domains"

    stage_id: Mapped[int] = mapped_column(ForeignKey("learning_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # language, math, physical, etc.
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    stage: Mapped["LearningStage"] = relationship(back_populates="domains")
    subjects: Mapped[List["Subject"]] = relationship(back_populates="domain", lazy="selectin")

    # Constraints
    __table_args__ = (
        UniqueConstraint("stage_id", "code", name="uq_stage_domain_code"),
        Index("ix_domain_stage_order", "stage_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<LearningDomain(code={self.code}, name={self.name})>"


class Subject(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Subjects within domains: English, Hindi, Mathematics, EVS, Art, etc."""
    __tablename__ = "subjects"

    stage_id: Mapped[int] = mapped_column(ForeignKey("learning_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("learning_domains.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # english, hindi, mathematics, evs, art
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    stage: Mapped["LearningStage"] = relationship(back_populates="subjects")
    domain: Mapped["LearningDomain"] = relationship(back_populates="subjects")
    topics: Mapped[List["Topic"]] = relationship(back_populates="subject", lazy="selectin")
    enrollments: Mapped[List["StudentEnrollment"]] = relationship(back_populates="subject", lazy="selectin")

    # Constraints
    __table_args__ = (
        UniqueConstraint("stage_id", "domain_id", "code", name="uq_stage_domain_subject_code"),
        Index("ix_subject_stage_domain_order", "stage_id", "domain_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<Subject(code={self.code}, name={self.name})>"


class Topic(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Topics within subjects."""
    __tablename__ = "topics"

    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    subject: Mapped["Subject"] = relationship(back_populates="topics")
    learning_objectives: Mapped[List["LearningObjective"]] = relationship(back_populates="topic", lazy="selectin")
    lessons: Mapped[List["Lesson"]] = relationship(back_populates="topic", lazy="selectin")

    # Constraints
    __table_args__ = (
        UniqueConstraint("subject_id", "code", name="uq_subject_topic_code"),
        Index("ix_topic_subject_order", "subject_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<Topic(code={self.code}, name={self.name})>"


class LearningObjective(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Measurable learning objectives."""
    __tablename__ = "learning_objectives"

    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_assessable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship(back_populates="learning_objectives")
    lessons: Mapped[List["Lesson"]] = relationship(back_populates="learning_objectives", secondary="lesson_objectives", lazy="selectin")

    # Constraints
    __table_args__ = (
        UniqueConstraint("topic_id", "code", name="uq_topic_objective_code"),
        Index("ix_objective_topic_order", "topic_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<LearningObjective(code={self.code})>"


class Lesson(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Learning units containing activities."""
    __tablename__ = "lessons"

    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[ContentStatusEnum] = mapped_column(
        SQLEnum(ContentStatusEnum, values_callable=lambda x: [e.value for e in x]),
        default=ContentStatusEnum.DRAFT,
        nullable=False,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    estimated_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship(back_populates="lessons")
    translations: Mapped[List["LessonTranslation"]] = relationship(back_populates="lesson", lazy="selectin", cascade="all, delete-orphan")
    activities: Mapped[List["Activity"]] = relationship(back_populates="lesson", lazy="selectin", cascade="all, delete-orphan")
    learning_objectives: Mapped[List["LearningObjective"]] = relationship(
        secondary="lesson_objectives", back_populates="lessons", lazy="selectin"
    )
    media: Mapped[List["LessonMedia"]] = relationship(back_populates="lesson", lazy="selectin", cascade="all, delete-orphan")
    progress_records: Mapped[List["StudentLessonProgress"]] = relationship(back_populates="lesson", lazy="selectin")
    publisher: Mapped[Optional["User"]] = relationship(foreign_keys=[published_by])

    # Constraints
    __table_args__ = (
        UniqueConstraint("topic_id", "code", name="uq_topic_lesson_code"),
        Index("ix_lesson_topic_status_order", "topic_id", "status", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<Lesson(code={self.code}, status={self.status})>"


class LessonTranslation(Base, IDMixin, TimestampMixin):
    """Multilingual lesson content."""
    __tablename__ = "lesson_translations"

    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # en, hi, etc.
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    lesson: Mapped["Lesson"] = relationship(back_populates="translations")

    # Constraints
    __table_args__ = (
        UniqueConstraint("lesson_id", "language", name="uq_lesson_translation"),
    )

    def __repr__(self) -> str:
        return f"<LessonTranslation(lesson_id={self.lesson_id}, language={self.language})>"


class LessonObjectiveLink(Base, TimestampMixin):
    """Many-to-many link between lessons and learning objectives."""
    __tablename__ = "lesson_objectives"

    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), primary_key=True)
    objective_id: Mapped[int] = mapped_column(ForeignKey("learning_objectives.id", ondelete="CASCADE"), primary_key=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Activity(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Interactive activities within lessons."""
    __tablename__ = "activities"

    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[ActivityTypeEnum] = mapped_column(
        SQLEnum(ActivityTypeEnum, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[ContentStatusEnum] = mapped_column(
        SQLEnum(ContentStatusEnum, values_callable=lambda x: [e.value for e in x]),
        default=ContentStatusEnum.DRAFT,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    configuration: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Activity-specific config
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    lesson: Mapped["Lesson"] = relationship(back_populates="activities")
    translations: Mapped[List["ActivityTranslation"]] = relationship(back_populates="activity", lazy="selectin", cascade="all, delete-orphan")
    questions: Mapped[List["Question"]] = relationship(back_populates="activity", lazy="selectin", cascade="all, delete-orphan")
    media: Mapped[List["ActivityMedia"]] = relationship(back_populates="activity", lazy="selectin", cascade="all, delete-orphan")
    attempts: Mapped[List["ActivityAttempt"]] = relationship(back_populates="activity", lazy="selectin")

    # Constraints
    __table_args__ = (
        UniqueConstraint("lesson_id", "code", name="uq_lesson_activity_code"),
        Index("ix_activity_lesson_order", "lesson_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<Activity(type={self.type}, code={self.code})>"


class ActivityTranslation(Base, IDMixin, TimestampMixin):
    """Multilingual activity content."""
    __tablename__ = "activity_translations"

    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    activity: Mapped["Activity"] = relationship(back_populates="translations")

    # Constraints
    __table_args__ = (
        UniqueConstraint("activity_id", "language", name="uq_activity_translation"),
    )

    def __repr__(self) -> str:
        return f"<ActivityTranslation(activity_id={self.activity_id}, language={self.language})>"


class Question(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Quiz/assessment questions within activities."""
    __tablename__ = "questions"

    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    question_type: Mapped[str] = mapped_column(String(30), nullable=False)  # single_choice, multiple_choice, drag_drop, etc.
    prompt: Mapped[str] = mapped_column(Text, nullable=False)  # Question text/prompt
    prompt_audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    configuration: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Question-specific config
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    activity: Mapped["Activity"] = relationship(back_populates="questions")
    translations: Mapped[List["QuestionTranslation"]] = relationship(back_populates="question", lazy="selectin", cascade="all, delete-orphan")
    answer_options: Mapped[List["AnswerOption"]] = relationship(back_populates="question", lazy="selectin", cascade="all, delete-orphan")
    responses: Mapped[List["ActivityResponse"]] = relationship(back_populates="question", lazy="selectin")

    # Constraints
    __table_args__ = (
        Index("ix_question_activity_order", "activity_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<Question(activity_id={self.activity_id}, type={self.question_type})>"


class QuestionTranslation(Base, IDMixin, TimestampMixin):
    """Multilingual question content."""
    __tablename__ = "question_translations"

    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    question: Mapped["Question"] = relationship(back_populates="translations")

    # Constraints
    __table_args__ = (
        UniqueConstraint("question_id", "language", name="uq_question_translation"),
    )

    def __repr__(self) -> str:
        return f"<QuestionTranslation(question_id={self.question_id}, language={self.language})>"


class AnswerOption(Base, IDMixin, TimestampMixin):
    """Answer choices for questions."""
    __tablename__ = "answer_options"

    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    text_audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    feedback_correct: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_incorrect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    configuration: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # For drag-drop positions, etc.

    # Relationships
    question: Mapped["Question"] = relationship(back_populates="answer_options")
    translations: Mapped[List["AnswerOptionTranslation"]] = relationship(back_populates="answer_option", lazy="selectin", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        Index("ix_answer_option_question_order", "question_id", "display_order"),
    )

    def __repr__(self) -> str:
        return f"<AnswerOption(question_id={self.question_id}, correct={self.is_correct})>"


class AnswerOptionTranslation(Base, IDMixin, TimestampMixin):
    """Multilingual answer option content."""
    __tablename__ = "answer_option_translations"

    answer_option_id: Mapped[int] = mapped_column(ForeignKey("answer_options.id", ondelete="CASCADE"), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    feedback_correct: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_incorrect: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    answer_option: Mapped["AnswerOption"] = relationship(back_populates="translations")

    # Constraints
    __table_args__ = (
        UniqueConstraint("answer_option_id", "language", name="uq_answer_option_translation"),
    )

    def __repr__(self) -> str:
        return f"<AnswerOptionTranslation(answer_option_id={self.answer_option_id}, language={self.language})>"