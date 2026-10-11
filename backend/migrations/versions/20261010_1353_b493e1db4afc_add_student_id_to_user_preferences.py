"""
Add student_id to user_preferences

Revision ID: b493e1db4afc
Revises: 20241009_000000
Create Date: 2026-10-10 13:53:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b493e1db4afc'
down_revision = '20241009_000000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add student_id column to user_preferences
    op.add_column(
        'user_preferences',
        sa.Column('student_id', sa.BigInteger(), nullable=True, unique=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_user_preferences_student_id',
        'user_preferences', 'student_profiles',
        ['student_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for student_id
    op.create_index('ix_user_preferences_student_id', 'user_preferences', ['student_id'], unique=True)


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_user_preferences_student_id', 'user_preferences', type_='foreignkey')
    
    # Drop index
    op.drop_index('ix_user_preferences_student_id', table_name='user_preferences')
    
    # Drop column
    op.drop_column('user_preferences', 'student_id')