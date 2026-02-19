"""add recurring type and installments

Revision ID: f1ae13fcfab9
Revises: 32cc088ef579
Create Date: 2026-02-15 19:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1ae13fcfab9'
down_revision: Union[str, Sequence[str], None] = '32cc088ef579'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to recurring_expenses
    with op.batch_alter_table('recurring_expenses', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type', sa.Enum('subscription', 'installment', name='recurringtype'), nullable=False, server_default='subscription'))
        batch_op.add_column(sa.Column('total_installments', sa.Integer(), nullable=True))
        batch_op.alter_column('frequency',
               existing_type=sa.Enum('monthly', 'yearly', name='frequencytype'),
               nullable=True)

    # Add columns to transactions
    with op.batch_alter_table('transactions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('recurring_expense_id', sa.UUID(), nullable=True))
        batch_op.add_column(sa.Column('installment_number', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_transaction_recurring_expense', 'recurring_expenses', ['recurring_expense_id'], ['id'])


def downgrade() -> None:
    # Remove foreign key constraint
    with op.batch_alter_table('transactions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_transaction_recurring_expense', type_='foreignkey')
        batch_op.drop_column('installment_number')
        batch_op.drop_column('recurring_expense_id')

    # Remove columns from recurring_expenses
    with op.batch_alter_table('recurring_expenses', schema=None) as batch_op:
        batch_op.alter_column('frequency',
               existing_type=sa.Enum('monthly', 'yearly', name='frequencytype'),
               nullable=False)
        batch_op.drop_column('total_installments')
        batch_op.drop_column('type')
