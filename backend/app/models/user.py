"""
User and authentication models.
"""
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IDMixin, TimestampMixin, SoftDeleteMixin


class Role(Base, IDMixin, TimestampMixin):
    """Role definitions for RBAC."""
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user_roles: Mapped[List["UserRole"]] = relationship(back_populates="role", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Role(name={self.name})>"


class User(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Core user accounts."""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user_roles: Mapped[List["UserRole"]] = relationship(back_populates="user", lazy="selectin", cascade="all, delete-orphan", foreign_keys="UserRole.user_id")
    parent_profile: Mapped[Optional["ParentProfile"]] = relationship(back_populates="user", lazy="selectin", uselist=False)
    student_profile: Mapped[Optional["StudentProfile"]] = relationship(back_populates="user", lazy="selectin", uselist=False)
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(back_populates="user", lazy="selectin", cascade="all, delete-orphan")
    password_resets: Mapped[List["PasswordReset"]] = relationship(back_populates="user", lazy="selectin", cascade="all, delete-orphan")
    preferences: Mapped[Optional["UserPreference"]] = relationship(back_populates="user", lazy="selectin", uselist=False)

    def __repr__(self) -> str:
        return f"<User(email={self.email}, id={self.id})>"


class UserRole(Base, IDMixin, TimestampMixin):
    """Many-to-many mapping between users and roles."""
    __tablename__ = "user_roles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="user_roles", foreign_keys=[user_id])
    role: Mapped["Role"] = relationship(back_populates="user_roles")
    assigned_by_user: Mapped[Optional["User"]] = relationship(foreign_keys=[assigned_by])

    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )

    def __repr__(self) -> str:
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"


class RefreshToken(Base, IDMixin, TimestampMixin):
    """JWT refresh token store for revocation."""
    __tablename__ = "refresh_tokens"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="refresh_tokens")

    def is_revoked(self) -> bool:
        return self.revoked_at is not None

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at

    def __repr__(self) -> str:
        return f"<RefreshToken(user_id={self.user_id}, jti={self.jti[:8]}...)>"


class PasswordReset(Base, IDMixin, TimestampMixin):
    """Password reset tokens."""
    __tablename__ = "password_resets"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="password_resets")

    def is_used(self) -> bool:
        return self.used_at is not None

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at

    def __repr__(self) -> str:
        return f"<PasswordReset(user_id={self.user_id})>"