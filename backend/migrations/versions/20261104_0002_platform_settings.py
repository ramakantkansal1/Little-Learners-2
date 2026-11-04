"""Persist public platform settings."""

from alembic import op
import sqlalchemy as sa

revision = "phase7_settings_20261104"
down_revision = "phase6_scopes_20261104"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "platform_settings",
        sa.Column("key", sa.String(80), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade():
    op.drop_table("platform_settings")
