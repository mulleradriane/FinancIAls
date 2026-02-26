"""add_current_installment_and_end_date_to_recurring

Revision ID: cedafe51e6c2
Revises: coloque_aqui_o_id_gerado
Create Date: 2026-02-26 13:21:30.641109

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cedafe51e6c2'
down_revision: Union[str, Sequence[str], None] = 'c194840f9bb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recurring_expenses', sa.Column('current_installment', sa.Integer(), nullable=True))
    op.add_column('recurring_expenses', sa.Column('end_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('recurring_expenses', 'end_date')
    op.drop_column('recurring_expenses', 'current_installment')
