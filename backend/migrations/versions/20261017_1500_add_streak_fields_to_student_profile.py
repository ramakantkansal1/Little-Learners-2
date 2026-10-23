"""add streak fields to student_profile

Revision ID: <revision>
Revises: fd8fc238f539
Create Date: 2026-10-17 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, None] = 'fd8fc238f539'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add streak tracking fields to student_profiles
    op.add_column(
        'student_profiles',
        sa.Column('current_streak', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'student_profiles',
        sa.Column('longest_streak', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'student_profiles',
        sa.Column('last_activity_date', sa.Date(), nullable=True),
    )

    # Add unique constraint to prevent duplicate reward awards
    op.create_unique_constraint(
        'uq_student_reward_award_student_reward',
        'student_reward_awards',
        ['student_id', 'reward_id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_student_reward_award_student_reward',
        'student_reward_awards',
        type_='unique',
    )
    op.drop_column('student_profiles', 'last_activity_date')
    op.drop_column('student_profiles', 'longest_streak')
    op.drop_column('student_profiles', 'current_streak')
