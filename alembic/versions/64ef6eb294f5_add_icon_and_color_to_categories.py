"""add icon and color to categories

Revision ID: 64ef6eb294f5
Revises: 175aa2a97cf3
Create Date: 2026-02-18 19:58:40.255169

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '64ef6eb294f5'
down_revision: Union[str, Sequence[str], None] = '175aa2a97cf3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('categories', sa.Column('icon', sa.String(), nullable=True))
    op.add_column('categories', sa.Column('color', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('categories', 'color')
    op.drop_column('categories', 'icon')
