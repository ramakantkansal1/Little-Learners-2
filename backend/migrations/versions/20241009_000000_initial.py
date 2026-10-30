"""
Initial migration - Create all tables for Happy Little Learners.

Revision ID: 20241009_000000
Revises:
Create Date: 2024-10-09 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '20241009_000000'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create all tables

    # ===========================================
    # USERS & AUTHENTICATION
    # ===========================================

    op.create_table(
        'roles',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_roles_name'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'users',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'user_roles',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('role_id', sa.BigInteger(), nullable=False),
        sa.Column('assigned_by', sa.BigInteger(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('jti', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('jti', name='uq_refresh_tokens_jti'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'password_resets',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    # ===========================================
    # PROFILES & RELATIONSHIPS
    # ===========================================

    op.create_table(
        'parent_profiles',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('phone_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.Enum('male', 'female', 'other', 'prefer_not_to_say', name='gender_enum'), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('pincode', sa.String(length=10), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=False, server_default=sa.text("'India'")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_parent_profiles_user_id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'student_profiles',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.Enum('male', 'female', 'other', 'prefer_not_to_say', name='gender_enum'), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('avatar_type', sa.String(length=50), nullable=True),
        sa.Column('pin_hash', sa.String(length=255), nullable=True),
        sa.Column('current_stage_id', sa.BigInteger(), nullable=True),
        sa.Column('preferred_language', sa.String(length=10), nullable=False, server_default=sa.text("'en'")),
        sa.Column('audio_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('reduced_motion', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('high_contrast', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_student_profiles_user_id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'parent_student_relationships',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('parent_id', sa.BigInteger(), nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=False),
        sa.Column('relationship_type', sa.String(length=50), nullable=False, server_default=sa.text("'parent'")),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('can_manage_profile', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('can_view_progress', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('can_manage_settings', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['parent_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('parent_id', 'student_id', name='uq_parent_student'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'consent_records',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('parent_id', sa.BigInteger(), nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=False),
        sa.Column('consent_type', sa.String(length=50), nullable=False),
        sa.Column('consent_given', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('consent_version', sa.String(length=20), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['parent_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('parent_id', 'student_id', 'consent_type', 'consent_version', name='uq_consent_record'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'data_deletion_requests',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('parent_id', sa.BigInteger(), nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=True),
        sa.Column('request_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processed_by', sa.BigInteger(), nullable=True),
        sa.Column('verification_token', sa.String(length=64), nullable=True),
        sa.Column('verification_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['parent_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['processed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    # ===========================================
    # CURRICULUM (Hierarchical)
    # ===========================================

    op.create_table(
        'learning_stages',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('min_age_months', sa.Integer(), nullable=False),
        sa.Column('max_age_months', sa.Integer(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_learning_stages_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'learning_domains',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('stage_id', sa.BigInteger(), nullable=False),
        sa.Column('code', sa.String(length=30), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['stage_id'], ['learning_stages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stage_id', 'code', name='uq_stage_domain_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'subjects',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('stage_id', sa.BigInteger(), nullable=False),
        sa.Column('domain_id', sa.BigInteger(), nullable=False),
        sa.Column('code', sa.String(length=30), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['stage_id'], ['learning_stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['domain_id'], ['learning_domains.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stage_id', 'domain_id', 'code', name='uq_stage_domain_subject_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'topics',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('subject_id', sa.BigInteger(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subject_id', 'code', name='uq_subject_topic_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'learning_objectives',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('topic_id', sa.BigInteger(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('is_assessable', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('topic_id', 'code', name='uq_topic_objective_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'lessons',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('topic_id', sa.BigInteger(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('status', sa.Enum('draft', 'review', 'published', 'archived', name='content_status_enum'), nullable=False, server_default=sa.text("'draft'")),
        sa.Column('version', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('thumbnail_url', sa.String(length=500), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_by', sa.BigInteger(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['published_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('topic_id', 'code', name='uq_topic_lesson_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'lesson_translations',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('lesson_id', sa.BigInteger(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lesson_id', 'language', name='uq_lesson_translation'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'lesson_objectives',
        sa.Column('lesson_id', sa.BigInteger(), nullable=False),
        sa.Column('objective_id', sa.BigInteger(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['objective_id'], ['learning_objectives.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('lesson_id', 'objective_id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'activities',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('lesson_id', sa.BigInteger(), nullable=False),
        sa.Column('type', sa.Enum(
            'image_selection', 'color_identification', 'shape_matching', 'picture_matching',
            'alphabet_recognition', 'letter_sound', 'number_recognition', 'counting',
            'sorting', 'sequencing', 'tracing', 'story_listening', 'picture_comprehension',
            'simple_quiz', 'audio_identification',
            name='activity_type_enum'), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('status', sa.Enum('draft', 'review', 'published', 'archived', name='content_status_enum'), nullable=False, server_default=sa.text("'draft'")),
        sa.Column('version', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lesson_id', 'code', name='uq_lesson_activity_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'activity_translations',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('activity_id', sa.BigInteger(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('activity_id', 'language', name='uq_activity_translation'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'questions',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('activity_id', sa.BigInteger(), nullable=False),
        sa.Column('question_type', sa.String(length=30), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('prompt_audio_url', sa.String(length=500), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('points', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'question_translations',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('question_id', sa.BigInteger(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('prompt_audio_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('question_id', 'language', name='uq_question_translation'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'answer_options',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('question_id', sa.BigInteger(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('text_audio_url', sa.String(length=500), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('feedback_correct', sa.Text(), nullable=True),
        sa.Column('feedback_incorrect', sa.Text(), nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'answer_option_translations',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('answer_option_id', sa.BigInteger(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('feedback_correct', sa.Text(), nullable=True),
        sa.Column('feedback_incorrect', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['answer_option_id'], ['answer_options.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('answer_option_id', 'language', name='uq_answer_option_translation'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    # ===========================================
    # PROGRESS & ENGAGEMENT
    # ===========================================

    op.create_table(
        'student_enrollments',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=False),
        sa.Column('stage_id', sa.BigInteger(), nullable=False),
        sa.Column('subject_id', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.Enum('active', 'completed', 'paused', 'withdrawn', name='enrollment_status_enum'), nullable=False, server_default=sa.text("'active'")),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('assigned_by', sa.BigInteger(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['stage_id'], ['learning_stages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'stage_id', 'subject_id', name='uq_student_stage_subject'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'student_lesson_progress',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=False),
        sa.Column('lesson_id', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.Enum('not_started', 'in_progress', 'completed', 'needs_review', name='lesson_progress_status_enum'), nullable=False, server_default=sa.text("'not_started'")),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('time_spent_seconds', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('current_activity_id', sa.BigInteger(), nullable=True),
        sa.Column('completion_percentage', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['current_activity_id'], ['activities.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'lesson_id', name='uq_student_lesson_progress'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'activity_attempts',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=False),
        sa.Column('activity_id', sa.BigInteger(), nullable=False),
        sa.Column('lesson_progress_id', sa.BigInteger(), nullable=True),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('status', sa.Enum('started', 'in_progress', 'completed', 'abandoned', name='attempt_status_enum'), nullable=False, server_default=sa.text("'started'")),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('time_spent_seconds', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('max_score', sa.Integer(), nullable=False, server_default=sa.text('100')),
        sa.Column('passed', sa.Boolean(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lesson_progress_id'], ['student_lesson_progress.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'activity_id', 'attempt_number', name='uq_student_activity_attempt'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'activity_responses',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('attempt_id', sa.BigInteger(), nullable=False),
        sa.Column('question_id', sa.BigInteger(), nullable=False),
        sa.Column('selected_option_ids', sa.JSON(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('points_earned', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('time_spent_seconds', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['attempt_id'], ['activity_attempts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('attempt_id', 'question_id', name='uq_attempt_question_response'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'student_rewards',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reward_type', sa.String(length=20), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('criteria', sa.JSON(), nullable=True),
        sa.Column('points_value', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_student_rewards_code'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'student_reward_awards',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=False),
        sa.Column('reward_id', sa.BigInteger(), nullable=False),
        sa.Column('attempt_id', sa.BigInteger(), nullable=True),
        sa.Column('earned_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reward_id'], ['student_rewards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['attempt_id'], ['activity_attempts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    # ===========================================
    # MEDIA & SYSTEM
    # ===========================================

    op.create_table(
        'media_assets',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=True),
        sa.Column('media_type', sa.Enum('image', 'audio', 'video', 'document', name='media_type_enum'), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('alt_text', sa.Text(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('source', sa.String(length=255), nullable=True),
        sa.Column('license', sa.String(length=100), nullable=True),
        sa.Column('attribution', sa.Text(), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('uploaded_by', sa.BigInteger(), nullable=True),
        sa.Column('is_processed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'lesson_media',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('lesson_id', sa.BigInteger(), nullable=False),
        sa.Column('media_asset_id', sa.BigInteger(), nullable=False),
        sa.Column('media_role', sa.String(length=50), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['media_asset_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lesson_id', 'media_asset_id', 'media_role', name='uq_lesson_media'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'activity_media',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('activity_id', sa.BigInteger(), nullable=False),
        sa.Column('media_asset_id', sa.BigInteger(), nullable=False),
        sa.Column('media_role', sa.String(length=50), nullable=False),
        sa.Column('question_id', sa.BigInteger(), nullable=True),
        sa.Column('answer_option_id', sa.BigInteger(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['media_asset_id'], ['media_assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['answer_option_id'], ['answer_options.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('activity_id', 'media_asset_id', 'media_role', 'question_id', 'answer_option_id', name='uq_activity_media'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'parent_notifications',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('parent_id', sa.BigInteger(), nullable=False),
        sa.Column('student_id', sa.BigInteger(), nullable=True),
        sa.Column('notification_type', sa.Enum(
            'lesson_completed', 'activity_completed', 'reward_earned', 'stage_progress',
            'weekly_summary', 'inactivity_alert', 'content_recommendation', 'system_announcement',
            name='notification_type_enum'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_via_email', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('sent_via_sms', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['parent_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['student_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=True),
        sa.Column('action', sa.Enum(
            'create', 'read', 'update', 'delete', 'login', 'logout', 'password_change',
            'role_assign', 'role_revoke', 'content_publish', 'content_unpublish',
            'user_suspend', 'user_activate', 'data_export', 'data_delete', 'settings_change',
            name='audit_action_enum'), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('resource_name', sa.String(length=255), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('correlation_id', sa.String(length=64), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    op.create_table(
        'user_preferences',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('preferred_language', sa.String(length=10), nullable=False, server_default=sa.text("'en'")),
        sa.Column('audio_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('audio_volume', sa.Float(), nullable=False, server_default=sa.text('0.8')),
        sa.Column('narration_speed', sa.Float(), nullable=False, server_default=sa.text('1.0')),
        sa.Column('reduced_motion', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('high_contrast', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('font_size', sa.String(length=20), nullable=False, server_default=sa.text("'medium'")),
        sa.Column('screen_reader_optimized', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('email_notifications', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('sms_notifications', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('in_app_notifications', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('weekly_summary_email', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('progress_alerts', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('analytics_opt_in', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('data_sharing_consent', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_preferences_user_id'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci',
        mysql_engine='InnoDB'
    )

    # ===========================================
    # INDEXES
    # ===========================================

    # Users indexes
    op.create_index('idx_users_deleted_at', 'users', ['deleted_at'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])

    # User Roles indexes
    op.create_index('idx_user_roles_user_id', 'user_roles', ['user_id'])
    op.create_index('idx_user_roles_role_id', 'user_roles', ['role_id'])

    # Refresh Tokens indexes
    op.create_index('idx_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('idx_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'])
    op.create_index('idx_refresh_tokens_revoked_at', 'refresh_tokens', ['revoked_at'])

    # Password Resets indexes
    op.create_index('idx_password_resets_user_id', 'password_resets', ['user_id'])
    op.create_index('idx_password_resets_expires_at', 'password_resets', ['expires_at'])

    # Parent Profiles indexes
    op.create_index('idx_parent_profiles_phone', 'parent_profiles', ['phone_number'])

    # Student Profiles indexes
    op.create_index('idx_student_profiles_stage', 'student_profiles', ['current_stage_id'])

    # Parent Student Relationships indexes
    op.create_index('idx_ps_rel_parent_primary', 'parent_student_relationships', ['parent_id', 'is_primary'])

    # Consent Records indexes
    op.create_index('idx_consent_parent_student', 'consent_records', ['parent_id', 'student_id'])

    # Data Deletion Requests indexes
    op.create_index('idx_data_deletion_parent_status', 'data_deletion_requests', ['parent_id', 'status'])

    # Curriculum indexes
    op.create_index('idx_domain_stage_order', 'learning_domains', ['stage_id', 'display_order'])
    op.create_index('idx_subject_stage_domain_order', 'subjects', ['stage_id', 'domain_id', 'display_order'])
    op.create_index('idx_topic_subject_order', 'topics', ['subject_id', 'display_order'])
    op.create_index('idx_objective_topic_order', 'learning_objectives', ['topic_id', 'display_order'])
    op.create_index('idx_lesson_topic_status_order', 'lessons', ['topic_id', 'status', 'display_order'])
    op.create_index('idx_activity_lesson_order', 'activities', ['lesson_id', 'display_order'])
    op.create_index('idx_question_activity_order', 'questions', ['activity_id', 'display_order'])
    op.create_index('idx_answer_option_question_order', 'answer_options', ['question_id', 'display_order'])

    # Progress indexes
    op.create_index('idx_enrollment_student_status', 'student_enrollments', ['student_id', 'status'])
    op.create_index('idx_lesson_progress_student_status', 'student_lesson_progress', ['student_id', 'status'])
    op.create_index('idx_attempt_student_activity_status', 'activity_attempts', ['student_id', 'activity_id', 'status'])
    op.create_index('idx_response_attempt_question', 'activity_responses', ['attempt_id', 'question_id'])
    op.create_index('idx_reward_award_student_earned', 'student_reward_awards', ['student_id', 'earned_at'])

    # Media indexes
    op.create_index('idx_media_type_language', 'media_assets', ['media_type', 'language'])

    # Notifications indexes
    op.create_index('idx_notification_parent_read', 'parent_notifications', ['parent_id', 'is_read'])
    op.create_index('idx_notification_parent_created', 'parent_notifications', ['parent_id', 'created_at'])

    # Audit Logs indexes
    op.create_index('idx_audit_user_action_time', 'audit_logs', ['user_id', 'action', 'created_at'])
    op.create_index('idx_audit_resource', 'audit_logs', ['resource_type', 'resource_id'])

    # User Preferences indexes
    op.create_index('idx_user_preferences_user_id', 'user_preferences', ['user_id'])


def downgrade() -> None:
    # Drop all tables in reverse order
    op.drop_table('user_preferences')
    op.drop_table('audit_logs')
    op.drop_table('parent_notifications')
    op.drop_table('activity_media')
    op.drop_table('lesson_media')
    op.drop_table('media_assets')
    op.drop_table('student_reward_awards')
    op.drop_table('student_rewards')
    op.drop_table('activity_responses')
    op.drop_table('activity_attempts')
    op.drop_table('student_lesson_progress')
    op.drop_table('student_enrollments')
    op.drop_table('answer_option_translations')
    op.drop_table('answer_options')
    op.drop_table('question_translations')
    op.drop_table('questions')
    op.drop_table('activity_translations')
    op.drop_table('activities')
    op.drop_table('lesson_objectives')
    op.drop_table('lesson_translations')
    op.drop_table('lessons')
    op.drop_table('learning_objectives')
    op.drop_table('topics')
    op.drop_table('subjects')
    op.drop_table('learning_domains')
    op.drop_table('learning_stages')
    op.drop_table('data_deletion_requests')
    op.drop_table('consent_records')
    op.drop_table('parent_student_relationships')
    op.drop_table('student_profiles')
    op.drop_table('parent_profiles')
    op.drop_table('password_resets')
    op.drop_table('refresh_tokens')
    op.drop_table('user_roles')
    op.drop_table('users')
    op.drop_table('roles')