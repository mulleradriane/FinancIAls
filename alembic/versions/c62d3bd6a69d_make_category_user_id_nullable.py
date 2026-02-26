"""make_category_user_id_nullable

Revision ID: c62d3bd6a69d
Revises: 9a1b45a8252c
Create Date: 2026-02-25 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c62d3bd6a69d'
down_revision: Union[str, Sequence[str], None] = '9a1b45a8252c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.alter_column('categories', 'user_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    # Set user_id to NULL for system categories
    op.execute("UPDATE categories SET user_id = NULL WHERE is_system = true")

def downgrade() -> None:
    # We can't easily go back to NOT NULL if we have NULLs, but for the sake of completion:
    # We would need to assign a user_id to those NULL categories.
    op.execute("UPDATE categories SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL")
    op.alter_column('categories', 'user_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
