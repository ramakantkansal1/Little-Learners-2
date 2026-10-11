"""add username to student profile

Revision ID: fd8fc238f539
Revises: b493e1db4afc
Create Date: 2026-10-11 14:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd8fc238f539'
down_revision: Union[str, None] = 'b493e1db4afc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add username column to student_profiles
    op.add_column('student_profiles', sa.Column('username', sa.String(100), nullable=True))
    
    # Create unique index on username (allowing NULLs since existing records won't have it yet)
    op.create_index('ix_student_profiles_username', 'student_profiles', ['username'], unique=True)
    
    # For existing records, generate a username based on display_name + id
    # This is a data migration that should be run after adding the column
    op.execute("""
        UPDATE student_profiles 
        SET username = CONCAT(LOWER(REPLACE(display_name, ' ', '_')), '_', id)
        WHERE username IS NULL
    """)
    
    # Now make the column NOT NULL
    op.alter_column('student_profiles', 'username', 
                    existing_type=sa.String(100),
                    nullable=False)


def downgrade() -> None:
    # Drop the unique index
    op.drop_index('ix_student_profiles_username', table_name='student_profiles')
    
    # Drop the username column
    op.drop_column('student_profiles', 'username')