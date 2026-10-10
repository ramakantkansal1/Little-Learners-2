"""
Models package initialization - exports all models for Alembic.
"""
from app.models.base import Base
from app.models.user import User, Role, UserRole, RefreshToken, PasswordReset
from app.models.profile import (
    ParentProfile,
    StudentProfile,
    ParentStudentRelationship,
    ConsentRecord,
    DataDeletionRequest,
    GenderEnum,
)
from app.models.curriculum import (
    LearningStage,
    LearningDomain,
    Subject,
    Topic,
    LearningObjective,
    Lesson,
    LessonTranslation,
    LessonObjectiveLink,
    Activity,
    ActivityTranslation,
    Question,
    QuestionTranslation,
    AnswerOption,
    AnswerOptionTranslation,
    ContentStatusEnum,
    ActivityTypeEnum,
)
from app.models.progress import (
    StudentEnrollment,
    StudentLessonProgress,
    ActivityAttempt,
    ActivityResponse,
    StudentReward,
    StudentRewardAward,
    EnrollmentStatusEnum,
    LessonProgressStatusEnum,
    AttemptStatusEnum,
)
from app.models.media import (
    MediaAsset,
    LessonMedia,
    ActivityMedia,
    ParentNotification,
    AuditLog,
    UserPreference,
    MediaTypeEnum,
    NotificationTypeEnum,
    AuditActionEnum,
)

__all__ = [
    "Base",
    # User & Auth
    "User",
    "Role",
    "UserRole",
    "RefreshToken",
    "PasswordReset",
    # Profiles
    "ParentProfile",
    "StudentProfile",
    "ParentStudentRelationship",
    "ConsentRecord",
    "DataDeletionRequest",
    "GenderEnum",
    # Curriculum
    "LearningStage",
    "LearningDomain",
    "Subject",
    "Topic",
    "LearningObjective",
    "Lesson",
    "LessonTranslation",
    "LessonObjectiveLink",
    "Activity",
    "ActivityTranslation",
    "Question",
    "QuestionTranslation",
    "AnswerOption",
    "AnswerOptionTranslation",
    "ContentStatusEnum",
    "ActivityTypeEnum",
    # Progress
    "StudentEnrollment",
    "StudentLessonProgress",
    "ActivityAttempt",
    "ActivityResponse",
    "StudentReward",
    "StudentRewardAward",
    "EnrollmentStatusEnum",
    "LessonProgressStatusEnum",
    "AttemptStatusEnum",
    # Media & System
    "MediaAsset",
    "LessonMedia",
    "ActivityMedia",
    "ParentNotification",
    "AuditLog",
    "UserPreference",
    "MediaTypeEnum",
    "NotificationTypeEnum",
    "AuditActionEnum",
]