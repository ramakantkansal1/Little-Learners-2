"""
Parent and student profile models.
"""
from datetime import datetime, date, timezone
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, UniqueConstraint, Index, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin, SoftDeleteMixin
import enum


class GenderEnum(str, enum.Enum):
    """Gender options for profiles."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class ParentProfile(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Parent/guardian profile information."""
    __tablename__ = "parent_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[GenderEnum]] = mapped_column(SQLEnum(GenderEnum), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="parent_profile")
    student_relationships: Mapped[List["ParentStudentRelationship"]] = relationship(
        back_populates="parent", lazy="selectin", cascade="all, delete-orphan"
    )
    notifications: Mapped[List["ParentNotification"]] = relationship(
        back_populates="parent", lazy="selectin", cascade="all, delete-orphan"
    )
    consent_records: Mapped[List["ConsentRecord"]] = relationship(
        back_populates="parent", lazy="selectin", cascade="all, delete-orphan"
    )
    data_deletion_requests: Mapped[List["DataDeletionRequest"]] = relationship(
        back_populates="parent", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ParentProfile(user_id={self.user_id}, name={self.full_name})>"


class StudentProfile(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Child/student profile information (minimal PII)."""
    __tablename__ = "student_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[GenderEnum]] = mapped_column(SQLEnum(GenderEnum), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    avatar_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # e.g., "elephant", "owl", "rabbit"
    pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # For child-friendly login
    current_stage_id: Mapped[Optional[int]] = mapped_column(ForeignKey("learning_stages.id"), nullable=True, index=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)  # en, hi
    audio_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    high_contrast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="student_profile")
    parent_relationships: Mapped[List["ParentStudentRelationship"]] = relationship(
        back_populates="student", lazy="selectin"
    )
    enrollments: Mapped[List["StudentEnrollment"]] = relationship(
        back_populates="student", lazy="selectin", cascade="all, delete-orphan"
    )
    lesson_progress: Mapped[List["StudentLessonProgress"]] = relationship(
        back_populates="student", lazy="selectin", cascade="all, delete-orphan"
    )
    activity_attempts: Mapped[List["ActivityAttempt"]] = relationship(
        back_populates="student", lazy="selectin", cascade="all, delete-orphan"
    )
    reward_awards: Mapped[List["StudentRewardAward"]] = relationship(
        back_populates="student", lazy="selectin", cascade="all, delete-orphan"
    )
    preferences: Mapped[Optional["UserPreference"]] = relationship(
        back_populates="student", lazy="selectin", uselist=False
    )
    current_stage: Mapped[Optional["LearningStage"]] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return f"<StudentProfile(user_id={self.user_id}, name={self.display_name})>"


class ParentStudentRelationship(Base, IDMixin, TimestampMixin):
    """Link between parent and student profiles."""
    __tablename__ = "parent_student_relationships"

    parent_id: Mapped[int] = mapped_column(ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(String(50), default="parent", nullable=False)  # parent, guardian, grandparent
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_manage_profile: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_view_progress: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_manage_settings: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    parent: Mapped["ParentProfile"] = relationship(back_populates="student_relationships")
    student: Mapped["StudentProfile"] = relationship(back_populates="parent_relationships")

    # Constraints
    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
        Index("ix_parent_student_primary", "parent_id", "is_primary"),
    )

    def __repr__(self) -> str:
        return f"<ParentStudentRelationship(parent_id={self.parent_id}, student_id={self.student_id})>"


class ConsentRecord(Base, IDMixin, TimestampMixin):
    """Privacy consent tracking for children's data."""
    __tablename__ = "consent_records"

    parent_id: Mapped[int] = mapped_column(ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type: Mapped[str] = mapped_column(String(50), nullable=False)  # data_collection, analytics, marketing, third_party
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_version: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g., "1.0"
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    parent: Mapped["ParentProfile"] = relationship(back_populates="consent_records")
    student: Mapped["StudentProfile"] = relationship()

    # Constraints
    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", "consent_type", "consent_version", name="uq_consent_record"),
    )

    def __repr__(self) -> str:
        return f"<ConsentRecord(parent_id={self.parent_id}, student_id={self.student_id}, type={self.consent_type})>"


class DataDeletionRequest(Base, IDMixin, TimestampMixin):
    """GDPR/DPDP Act data deletion requests."""
    __tablename__ = "data_deletion_requests"

    parent_id: Mapped[int] = mapped_column(ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[Optional[int]] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False)  # full_account, student_profile, specific_data
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending, processing, completed, rejected
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    verification_token: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    verification_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    parent: Mapped["ParentProfile"] = relationship(back_populates="data_deletion_requests")
    student: Mapped[Optional["StudentProfile"]] = relationship()
    processor: Mapped[Optional["User"]] = relationship(foreign_keys=[processed_by])

    def __repr__(self) -> str:
        return f"<DataDeletionRequest(parent_id={self.parent_id}, status={self.status})>"