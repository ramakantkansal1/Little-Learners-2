"""
Role definitions for RBAC.
"""
from enum import Enum


class Role(str, Enum):
    """System roles."""
    ADMIN = "admin"
    PARENT = "parent"
    STUDENT = "student"


class Permission(str, Enum):
    """System permissions."""
    # User management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_LIST = "user:list"

    # Role management
    ROLE_ASSIGN = "role:assign"
    ROLE_REVOKE = "role:revoke"
    ROLE_LIST = "role:list"

    # Parent management
    PARENT_PROFILE_READ = "parent:profile:read"
    PARENT_PROFILE_UPDATE = "parent:profile:update"
    PARENT_CHILDREN_LIST = "parent:children:list"
    PARENT_CHILD_CREATE = "parent:child:create"
    PARENT_CHILD_READ = "parent:child:read"
    PARENT_CHILD_UPDATE = "parent:child:update"
    PARENT_CHILD_DELETE = "parent:child:delete"
    PARENT_PROGRESS_READ = "parent:progress:read"
    PARENT_SETTINGS_READ = "parent:settings:read"
    PARENT_SETTINGS_UPDATE = "parent:settings:update"
    PARENT_NOTIFICATIONS_READ = "parent:notifications:read"
    PARENT_CONSENT_MANAGE = "parent:consent:manage"
    PARENT_DATA_DELETE_REQUEST = "parent:data:delete:request"

    # Student management
    STUDENT_PROFILE_READ = "student:profile:read"
    STUDENT_PROFILE_UPDATE = "student:profile:update"
    STUDENT_LOGIN = "student:login"
    STUDENT_DASHBOARD_READ = "student:dashboard:read"
    STUDENT_LESSON_START = "student:lesson:start"
    STUDENT_LESSON_COMPLETE = "student:lesson:complete"
    STUDENT_ACTIVITY_ATTEMPT = "student:activity:attempt"
    STUDENT_REWARDS_READ = "student:rewards:read"
    STUDENT_HISTORY_READ = "student:history:read"

    # Curriculum management
    CURRICULUM_STAGE_LIST = "curriculum:stage:list"
    CURRICULUM_STAGE_CREATE = "curriculum:stage:create"
    CURRICULUM_STAGE_UPDATE = "curriculum:stage:update"
    CURRICULUM_STAGE_DELETE = "curriculum:stage:delete"
    CURRICULUM_DOMAIN_LIST = "curriculum:domain:list"
    CURRICULUM_DOMAIN_CREATE = "curriculum:domain:create"
    CURRICULUM_DOMAIN_UPDATE = "curriculum:domain:update"
    CURRICULUM_DOMAIN_DELETE = "curriculum:domain:delete"
    CURRICULUM_SUBJECT_LIST = "curriculum:subject:list"
    CURRICULUM_SUBJECT_CREATE = "curriculum:subject:create"
    CURRICULUM_SUBJECT_UPDATE = "curriculum:subject:update"
    CURRICULUM_SUBJECT_DELETE = "curriculum:subject:delete"
    CURRICULUM_TOPIC_LIST = "curriculum:topic:list"
    CURRICULUM_TOPIC_CREATE = "curriculum:topic:create"
    CURRICULUM_TOPIC_UPDATE = "curriculum:topic:update"
    CURRICULUM_TOPIC_DELETE = "curriculum:topic:delete"
    CURRICULUM_OBJECTIVE_LIST = "curriculum:objective:list"
    CURRICULUM_OBJECTIVE_CREATE = "curriculum:objective:create"
    CURRICULUM_OBJECTIVE_UPDATE = "curriculum:objective:update"
    CURRICULUM_OBJECTIVE_DELETE = "curriculum:objective:delete"
    CURRICULUM_LESSON_LIST = "curriculum:lesson:list"
    CURRICULUM_LESSON_CREATE = "curriculum:lesson:create"
    CURRICULUM_LESSON_READ = "curriculum:lesson:read"
    CURRICULUM_LESSON_UPDATE = "curriculum:lesson:update"
    CURRICULUM_LESSON_DELETE = "curriculum:lesson:delete"
    CURRICULUM_LESSON_PUBLISH = "curriculum:lesson:publish"
    CURRICULUM_LESSON_UNPUBLISH = "curriculum:lesson:unpublish"
    CURRICULUM_ACTIVITY_LIST = "curriculum:activity:list"
    CURRICULUM_ACTIVITY_CREATE = "curriculum:activity:create"
    CURRICULUM_ACTIVITY_READ = "curriculum:activity:read"
    CURRICULUM_ACTIVITY_UPDATE = "curriculum:activity:update"
    CURRICULUM_ACTIVITY_DELETE = "curriculum:activity:delete"
    CURRICULUM_ACTIVITY_PUBLISH = "curriculum:activity:publish"

    # Media management
    MEDIA_UPLOAD = "media:upload"
    MEDIA_READ = "media:read"
    MEDIA_UPDATE = "media:update"
    MEDIA_DELETE = "media:delete"
    MEDIA_LIST = "media:list"

    # Progress & Analytics
    PROGRESS_READ_OWN = "progress:read:own"
    PROGRESS_READ_CHILD = "progress:read:child"
    PROGRESS_READ_ALL = "progress:read:all"
    ANALYTICS_READ = "analytics:read"

    # Admin
    ADMIN_DASHBOARD_READ = "admin:dashboard:read"
    ADMIN_USERS_LIST = "admin:users:list"
    ADMIN_USERS_MANAGE = "admin:users:manage"
    ADMIN_AUDIT_LOGS_READ = "admin:audit:read"
    ADMIN_SETTINGS_READ = "admin:settings:read"
    ADMIN_SETTINGS_UPDATE = "admin:settings:update"
    ADMIN_CONTENT_REVIEW = "admin:content:review"

    # System
    HEALTH_CHECK = "health:check"


# Role to permissions mapping
ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.ADMIN: {
        # All permissions
        *Permission,
    },
    Role.PARENT: {
        # Profile
        Permission.PARENT_PROFILE_READ,
        Permission.PARENT_PROFILE_UPDATE,
        # Children
        Permission.PARENT_CHILDREN_LIST,
        Permission.PARENT_CHILD_CREATE,
        Permission.PARENT_CHILD_READ,
        Permission.PARENT_CHILD_UPDATE,
        Permission.PARENT_CHILD_DELETE,
        # Progress
        Permission.PARENT_PROGRESS_READ,
        # Settings
        Permission.PARENT_SETTINGS_READ,
        Permission.PARENT_SETTINGS_UPDATE,
        # Notifications
        Permission.PARENT_NOTIFICATIONS_READ,
        # Consent
        Permission.PARENT_CONSENT_MANAGE,
        # Data deletion
        Permission.PARENT_DATA_DELETE_REQUEST,
        # Curriculum (read only for assigned content)
        Permission.CURRICULUM_STAGE_LIST,
        Permission.CURRICULUM_DOMAIN_LIST,
        Permission.CURRICULUM_SUBJECT_LIST,
        Permission.CURRICULUM_TOPIC_LIST,
        Permission.CURRICULUM_LESSON_LIST,
        Permission.CURRICULUM_LESSON_READ,
        Permission.CURRICULUM_ACTIVITY_LIST,
        Permission.CURRICULUM_ACTIVITY_READ,
        # Media (read only)
        Permission.MEDIA_READ,
        Permission.MEDIA_LIST,
        # Progress
        Permission.PROGRESS_READ_OWN,
        Permission.PROGRESS_READ_CHILD,
        # System
        Permission.HEALTH_CHECK,
    },
    Role.STUDENT: {
        # Profile
        Permission.STUDENT_PROFILE_READ,
        Permission.STUDENT_PROFILE_UPDATE,
        # Login
        Permission.STUDENT_LOGIN,
        # Dashboard
        Permission.STUDENT_DASHBOARD_READ,
        # Lessons
        Permission.STUDENT_LESSON_START,
        Permission.STUDENT_LESSON_COMPLETE,
        # Activities
        Permission.STUDENT_ACTIVITY_ATTEMPT,
        # Rewards
        Permission.STUDENT_REWARDS_READ,
        # History
        Permission.STUDENT_HISTORY_READ,
        # Curriculum (read only for enrolled content)
        Permission.CURRICULUM_STAGE_LIST,
        Permission.CURRICULUM_DOMAIN_LIST,
        Permission.CURRICULUM_SUBJECT_LIST,
        Permission.CURRICULUM_TOPIC_LIST,
        Permission.CURRICULUM_LESSON_LIST,
        Permission.CURRICULUM_LESSON_READ,
        Permission.CURRICULUM_ACTIVITY_LIST,
        Permission.CURRICULUM_ACTIVITY_READ,
        # Media (read only)
        Permission.MEDIA_READ,
        Permission.MEDIA_LIST,
        # Progress
        Permission.PROGRESS_READ_OWN,
        # System
        Permission.HEALTH_CHECK,
    },
}


def get_permissions_for_role(role: Role) -> set[Permission]:
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, set())


def role_has_permission(role: Role, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in get_permissions_for_role(role)


def user_has_permission(user_roles: list[Role], permission: Permission) -> bool:
    """Check if any of the user's roles has a specific permission."""
    return any(role_has_permission(role, permission) for role in user_roles)