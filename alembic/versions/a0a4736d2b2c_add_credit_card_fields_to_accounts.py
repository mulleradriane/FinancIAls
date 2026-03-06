"""add_credit_card_fields_to_accounts

Revision ID: a0a4736d2b2c
Revises: 0d13c62b3506
Create Date: 2026-03-06 18:30:30.444705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0a4736d2b2c'
down_revision: Union[str, Sequence[str], None] = '0d13c62b3506'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('accounts', sa.Column('closing_day', sa.Integer(), nullable=True))
    op.add_column('accounts', sa.Column('due_day', sa.Integer(), nullable=True))
    op.add_column('accounts', sa.Column('credit_limit', sa.Numeric(precision=12, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('accounts', 'credit_limit')
    op.drop_column('accounts', 'due_day')
    op.drop_column('accounts', 'closing_day')
