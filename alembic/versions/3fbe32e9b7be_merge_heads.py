"""merge_heads

Revision ID: 3fbe32e9b7be
Revises: 0a173a4a2b4d, a1b2c3d4e5f6
Create Date: 2026-03-03 21:03:56.670686

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3fbe32e9b7be'
down_revision: Union[str, Sequence[str], None] = ('0a173a4a2b4d', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
