"""
Media, notifications, audit logs, and user preferences models.
"""
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, Text, Integer, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin, SoftDeleteMixin
import enum


class MediaTypeEnum(str, enum.Enum):
    """Media asset types."""
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"


class MediaAsset(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Media assets (images, audio, video)."""
    __tablename__ = "media_assets"

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    media_type: Mapped[MediaTypeEnum] = mapped_column(
        SQLEnum(MediaTypeEnum, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(nullable=True)
    alt_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    license: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    attribution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, index=True)
    tags: Mapped[List[str]] = mapped_column(JSON, nullable=True, default=list)
    uploaded_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    processing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    lesson_media: Mapped[List["LessonMedia"]] = relationship(back_populates="media_asset", lazy="selectin")
    activity_media: Mapped[List["ActivityMedia"]] = relationship(back_populates="media_asset", lazy="selectin")
    uploader: Mapped[Optional["User"]] = relationship(foreign_keys=[uploaded_by])

    # Constraints
    __table_args__ = (
        Index("ix_media_type_language", "media_type", "language"),
    )

    def __repr__(self) -> str:
        return f"<MediaAsset(file_name={self.file_name}, type={self.media_type})>"


class LessonMedia(Base, IDMixin, TimestampMixin):
    """Lesson-media associations."""
    __tablename__ = "lesson_media"

    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    media_asset_id: Mapped[int] = mapped_column(ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    media_role: Mapped[str] = mapped_column(String(50), nullable=False)  # thumbnail, illustration, background, audio
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    lesson: Mapped["Lesson"] = relationship(back_populates="media")
    media_asset: Mapped["MediaAsset"] = relationship(back_populates="lesson_media")

    # Constraints
    __table_args__ = (
        UniqueConstraint("lesson_id", "media_asset_id", "media_role", name="uq_lesson_media"),
    )

    def __repr__(self) -> str:
        return f"<LessonMedia(lesson_id={self.lesson_id}, media_asset_id={self.media_asset_id}, role={self.media_role})>"


class ActivityMedia(Base, IDMixin, TimestampMixin):
    """Activity-media associations."""
    __tablename__ = "activity_media"

    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    media_asset_id: Mapped[int] = mapped_column(ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    media_role: Mapped[str] = mapped_column(String(50), nullable=False)  # question_image, option_image, audio, background
    question_id: Mapped[Optional[int]] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=True, index=True)
    answer_option_id: Mapped[Optional[int]] = mapped_column(ForeignKey("answer_options.id", ondelete="CASCADE"), nullable=True, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    activity: Mapped["Activity"] = relationship(back_populates="media")
    media_asset: Mapped["MediaAsset"] = relationship(back_populates="activity_media")

    # Constraints
    __table_args__ = (
        UniqueConstraint("activity_id", "media_asset_id", "media_role", "question_id", "answer_option_id", name="uq_activity_media"),
    )

    def __repr__(self) -> str:
        return f"<ActivityMedia(activity_id={self.activity_id}, media_asset_id={self.media_asset_id}, role={self.media_role})>"


class NotificationTypeEnum(str, enum.Enum):
    """Parent notification types."""
    LESSON_COMPLETED = "lesson_completed"
    ACTIVITY_COMPLETED = "activity_completed"
    REWARD_EARNED = "reward_earned"
    STAGE_PROGRESS = "stage_progress"
    WEEKLY_SUMMARY = "weekly_summary"
    INACTIVITY_ALERT = "inactivity_alert"
    CONTENT_RECOMMENDATION = "content_recommendation"
    SYSTEM_ANNOUNCEMENT = "system_announcement"


class ParentNotification(Base, IDMixin, TimestampMixin):
    """In-app notifications for parents."""
    __tablename__ = "parent_notifications"

    parent_id: Mapped[int] = mapped_column(ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[Optional[int]] = mapped_column(ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    notification_type: Mapped[NotificationTypeEnum] = mapped_column(
        SQLEnum(NotificationTypeEnum, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Additional context (lesson_id, reward_id, etc.)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_via_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_via_sms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    parent: Mapped["ParentProfile"] = relationship(back_populates="notifications")
    student: Mapped[Optional["StudentProfile"]] = relationship()

    # Constraints
    __table_args__ = (
        Index("ix_notification_parent_read", "parent_id", "is_read"),
        Index("ix_notification_parent_created", "parent_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ParentNotification(parent_id={self.parent_id}, type={self.notification_type}, read={self.is_read})>"


class AuditActionEnum(str, enum.Enum):
    """Audit log action types."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    ROLE_ASSIGN = "role_assign"
    ROLE_REVOKE = "role_revoke"
    CONTENT_PUBLISH = "content_publish"
    CONTENT_UNPUBLISH = "content_unpublish"
    USER_SUSPEND = "user_suspend"
    USER_ACTIVATE = "user_activate"
    DATA_EXPORT = "data_export"
    DATA_DELETE = "data_delete"
    SETTINGS_CHANGE = "settings_change"


class AuditLog(Base, IDMixin):
    """Audit log for administrative actions."""
    __tablename__ = "audit_logs"

    # No TimestampMixin - we only need created_at
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[AuditActionEnum] = mapped_column(
        SQLEnum(AuditActionEnum, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # user, lesson, activity, etc.
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    resource_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship()

    # Constraints
    __table_args__ = (
        Index("ix_audit_user_action_time", "user_id", "action", "created_at"),
        Index("ix_audit_resource", "resource_type", "resource_id"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog(user_id={self.user_id}, action={self.action}, resource={self.resource_type})>"


class UserPreference(Base, IDMixin, TimestampMixin):
    """User preferences for language, accessibility, etc."""
    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Language
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)

    # Audio
    audio_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    audio_volume: Mapped[float] = mapped_column(default=0.8, nullable=False)
    narration_speed: Mapped[float] = mapped_column(default=1.0, nullable=False)

    # Accessibility
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    high_contrast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    font_size: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)  # small, medium, large
    screen_reader_optimized: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Notifications
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sms_notifications: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    in_app_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    weekly_summary_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    progress_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Privacy
    analytics_opt_in: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    data_sharing_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="preferences")
    student_id: Mapped[Optional[int]] = mapped_column(ForeignKey("student_profiles.id", ondelete="SET NULL"), nullable=True, unique=True, index=True)
    student: Mapped[Optional["StudentProfile"]] = relationship(back_populates="preferences", uselist=False, foreign_keys="[UserPreference.student_id]")

    def __repr__(self) -> str:
        return f"<UserPreference(user_id={self.user_id}, language={self.preferred_language})>"