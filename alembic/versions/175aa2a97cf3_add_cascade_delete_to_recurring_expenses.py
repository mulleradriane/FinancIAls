"""add_cascade_delete_to_recurring_expenses

Revision ID: 175aa2a97cf3
Revises: 9563f67aa490
Create Date: 2026-02-18 13:41:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '175aa2a97cf3'
down_revision: Union[str, Sequence[str], None] = '9563f67aa490'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table('recurring_expenses', schema=None) as batch_op:
        batch_op.drop_constraint('fk_recurring_expense_account_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_recurring_expense_account_id', 'accounts', ['account_id'], ['id'], ondelete='CASCADE')

def downgrade() -> None:
    with op.batch_alter_table('recurring_expenses', schema=None) as batch_op:
        batch_op.drop_constraint('fk_recurring_expense_account_id', type_='foreignkey')
        batch_op.create_foreign_key('fk_recurring_expense_account_id', 'accounts', ['account_id'], ['id'])
