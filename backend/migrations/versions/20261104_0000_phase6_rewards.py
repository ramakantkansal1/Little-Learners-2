"""Parent controlled rewards, without streak pressure.

Revision ID: phase6_rewards_20261104
Revises: a7b8c9d0e1f2
"""

from alembic import op
import sqlalchemy as sa

revision = "phase6_rewards_20261104"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "student_profiles",
        sa.Column("rewards_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade():
    op.drop_column("student_profiles", "rewards_enabled")
