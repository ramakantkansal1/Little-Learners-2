"""
Progress tracking models: enrollments, lesson progress, activity attempts, rewards.
"""
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, Text, Integer, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin, SoftDeleteMixin
import enum


class EnrollmentStatusEnum(str, enum.Enum):
    """Student enrollment status."""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    WITHDRAWN = "withdrawn"


class LessonProgressStatusEnum(str, enum.Enum):
    """Lesson progress status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NEEDS_REVIEW = "needs_review"


class AttemptStatusEnum(str, enum.Enum):
    """Activity attempt status."""
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class StudentEnrollment(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Student enrollment in stages/subjects."""
    __tablename__ = "student_enrollments"

    student_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_id: Mapped[int] = mapped_column(ForeignKey("learning_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[Optional[int]] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True, index=True)
    status: Mapped[EnrollmentStatusEnum] = mapped_column(
        SQLEnum(EnrollmentStatusEnum, values_callable=lambda x: [e.value for e in x]),
        default=EnrollmentStatusEnum.ACTIVE,
        nullable=False,
        index=True,
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    student: Mapped["StudentProfile"] = relationship(back_populates="enrollments")
    stage: Mapped["LearningStage"] = relationship(back_populates="enrollments")
    subject: Mapped[Optional["Subject"]] = relationship(back_populates="enrollments")
    assigner: Mapped[Optional["User"]] = relationship(foreign_keys=[assigned_by])

    # Constraints
    __table_args__ = (
        UniqueConstraint("student_id", "stage_id", "subject_id", name="uq_student_stage_subject"),
        Index("ix_enrollment_student_status", "student_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<StudentEnrollment(student_id={self.student_id}, stage_id={self.stage_id}, status={self.status})>"


class StudentLessonProgress(Base, IDMixin, TimestampMixin):
    """Student progress on a specific lesson."""
    __tablename__ = "student_lesson_progress"

    student_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[LessonProgressStatusEnum] = mapped_column(
        SQLEnum(LessonProgressStatusEnum, values_callable=lambda x: [e.value for e in x]),
        default=LessonProgressStatusEnum.NOT_STARTED,
        nullable=False,
        index=True,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_activity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("activities.id"), nullable=True)
    completion_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0-100

    # Relationships
    student: Mapped["StudentProfile"] = relationship(back_populates="lesson_progress")
    lesson: Mapped["Lesson"] = relationship(back_populates="progress_records")
    current_activity: Mapped[Optional["Activity"]] = relationship(foreign_keys=[current_activity_id])

    # Constraints
    __table_args__ = (
        UniqueConstraint("student_id", "lesson_id", name="uq_student_lesson_progress"),
        Index("ix_lesson_progress_student_status", "student_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<StudentLessonProgress(student_id={self.student_id}, lesson_id={self.lesson_id}, status={self.status})>"


class ActivityAttempt(Base, IDMixin, TimestampMixin):
    """Student attempt at an activity."""
    __tablename__ = "activity_attempts"

    student_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_progress_id: Mapped[Optional[int]] = mapped_column(ForeignKey("student_lesson_progress.id", ondelete="SET NULL"), nullable=True, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[AttemptStatusEnum] = mapped_column(
        SQLEnum(AttemptStatusEnum, values_callable=lambda x: [e.value for e in x]),
        default=AttemptStatusEnum.STARTED,
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Percentage score
    max_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)  # Additional attempt data

    # Relationships
    student: Mapped["StudentProfile"] = relationship(back_populates="activity_attempts")
    activity: Mapped["Activity"] = relationship(back_populates="attempts")
    lesson_progress: Mapped[Optional["StudentLessonProgress"]] = relationship(foreign_keys=[lesson_progress_id])
    responses: Mapped[List["ActivityResponse"]] = relationship(back_populates="attempt", lazy="selectin", cascade="all, delete-orphan")
    reward_awards: Mapped[List["StudentRewardAward"]] = relationship(back_populates="attempt", lazy="selectin")

    # Constraints
    __table_args__ = (
        UniqueConstraint("student_id", "activity_id", "attempt_number", name="uq_student_activity_attempt"),
        Index("ix_attempt_student_activity_status", "student_id", "activity_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<ActivityAttempt(student_id={self.student_id}, activity_id={self.activity_id}, attempt={self.attempt_number})>"


class ActivityResponse(Base, IDMixin, TimestampMixin):
    """Student response to a specific question within an activity attempt."""
    __tablename__ = "activity_responses"

    attempt_id: Mapped[int] = mapped_column(ForeignKey("activity_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option_ids: Mapped[List[int]] = mapped_column(JSON, nullable=False, default=list)  # IDs of selected answer options
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    points_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)  # Drag-drop positions, text input, etc.

    # Relationships
    attempt: Mapped["ActivityAttempt"] = relationship(back_populates="responses")
    question: Mapped["Question"] = relationship(back_populates="responses")

    # Constraints
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question_response"),
        Index("ix_response_attempt_question", "attempt_id", "question_id"),
    )

    def __repr__(self) -> str:
        return f"<ActivityResponse(attempt_id={self.attempt_id}, question_id={self.question_id}, correct={self.is_correct})>"


class StudentReward(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Reward definitions (stars, stickers, badges)."""
    __tablename__ = "student_rewards"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reward_type: Mapped[str] = mapped_column(String(20), nullable=False)  # star, sticker, badge, certificate
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Conditions for earning
    points_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    awards: Mapped[List["StudentRewardAward"]] = relationship(back_populates="reward", lazy="selectin")

    def __repr__(self) -> str:
        return f"<StudentReward(code={self.code}, name={self.name})>"


class StudentRewardAward(Base, IDMixin, TimestampMixin):
    """Rewards earned by students."""
    __tablename__ = "student_reward_awards"

    student_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    reward_id: Mapped[int] = mapped_column(ForeignKey("student_rewards.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_id: Mapped[Optional[int]] = mapped_column(ForeignKey("activity_attempts.id", ondelete="SET NULL"), nullable=True, index=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # Relationships
    student: Mapped["StudentProfile"] = relationship(back_populates="reward_awards")
    reward: Mapped["StudentReward"] = relationship(back_populates="awards")
    attempt: Mapped[Optional["ActivityAttempt"]] = relationship(back_populates="reward_awards")

    # Constraints
    __table_args__ = (
        Index("ix_reward_award_student_earned", "student_id", "earned_at"),
    )

    def __repr__(self) -> str:
        return f"<StudentRewardAward(student_id={self.student_id}, reward_id={self.reward_id})>"