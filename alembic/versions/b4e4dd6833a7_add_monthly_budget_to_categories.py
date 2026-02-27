"""add monthly_budget to categories

Revision ID: b4e4dd6833a7
Revises: cedafe51e6c2
Create Date: 2026-02-27 01:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4e4dd6833a7'
down_revision: Union[str, Sequence[str], None] = 'cedafe51e6c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('monthly_budget', sa.Numeric(precision=12, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('categories', 'monthly_budget')
