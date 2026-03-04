"""fix_category_uniqueness_per_user

Revision ID: 0d13c62b3506
Revises: 5acbd08ac3d1
Create Date: 2026-03-04 02:59:06.281394

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d13c62b3506'
down_revision: Union[str, Sequence[str], None] = '5acbd08ac3d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove existing global unique constraint if it exists
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key")

    # Remove existing unique index if it exists
    op.execute("DROP INDEX IF EXISTS ix_categories_name")

    # Re-add composite unique constraint (name, user_id)
    # We drop it first just in case it was partially or incorrectly created before
    op.execute("ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_categories_name_user_id")
    op.create_unique_constraint('uq_categories_name_user_id', 'categories', ['name', 'user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_categories_name_user_id', 'categories', type_='unique')
    op.create_unique_constraint('categories_name_key', 'categories', ['name'])
