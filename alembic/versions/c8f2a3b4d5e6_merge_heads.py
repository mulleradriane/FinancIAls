"""merge heads and add unique index recurring transaction per month

Revision ID: c8f2a3b4d5e6
Revises: 6aebac75a7a1, b7e9f1a2c3d4
Create Date: 2026-04-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from typing import Sequence, Union

revision = 'c8f2a3b4d5e6'
down_revision: Union[str, Sequence[str]] = ('6aebac75a7a1', 'b7e9f1a2c3d4')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
