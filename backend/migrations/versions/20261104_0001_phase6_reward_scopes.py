"""One completion star per activity; milestones remain one-time per child."""

from alembic import op
import sqlalchemy as sa

revision = "phase6_scopes_20261104"
down_revision = "phase6_rewards_20261104"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "student_reward_awards",
        sa.Column("award_key", sa.String(80), nullable=False, server_default="milestone"),
    )
    op.drop_constraint(
        "uq_student_reward_award_student_reward", "student_reward_awards", type_="unique"
    )
    op.create_unique_constraint(
        "uq_student_reward_award_scope",
        "student_reward_awards",
        ["student_id", "reward_id", "award_key"],
    )


def downgrade():
    duplicate = (
        op.get_bind()
        .execute(
            sa.text(
                "SELECT student_id FROM student_reward_awards GROUP BY student_id, reward_id HAVING COUNT(*) > 1 LIMIT 1"
            )
        )
        .first()
    )
    if duplicate:
        raise RuntimeError(
            "Cannot downgrade reward scopes without losing awards. Export and reconcile scoped awards first."
        )
    op.drop_constraint("uq_student_reward_award_scope", "student_reward_awards", type_="unique")
    op.create_unique_constraint(
        "uq_student_reward_award_student_reward",
        "student_reward_awards",
        ["student_id", "reward_id"],
    )
    op.drop_column("student_reward_awards", "award_key")
