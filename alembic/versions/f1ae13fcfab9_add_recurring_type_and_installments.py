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
    # Create RecurringType enum
    recurring_type = sa.Enum('subscription', 'installment', name='recurringtype')
    recurring_type.create(op.get_bind())

    # Add columns to recurring_expenses
    op.add_column('recurring_expenses', sa.Column('type', sa.Enum('subscription', 'installment', name='recurringtype'), nullable=False, server_default='subscription'))
    op.add_column('recurring_expenses', sa.Column('total_installments', sa.Integer(), nullable=True))

    # Make frequency nullable in recurring_expenses
    op.alter_column('recurring_expenses', 'frequency',
               existing_type=postgresql.ENUM('monthly', 'yearly', name='frequencytype'),
               nullable=True)

    # Add columns to transactions
    op.add_column('transactions', sa.Column('recurring_expense_id', sa.UUID(), nullable=True))
    op.add_column('transactions', sa.Column('installment_number', sa.Integer(), nullable=True))

    # Add foreign key constraint
    op.create_foreign_key('fk_transaction_recurring_expense', 'transactions', 'recurring_expenses', ['recurring_expense_id'], ['id'])


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_transaction_recurring_expense', 'transactions', type_='foreignkey')

    # Remove columns from transactions
    op.drop_column('transactions', 'installment_number')
    op.drop_column('transactions', 'recurring_expense_id')

    # Make frequency non-nullable (might fail if there are nulls, but this is for completeness)
    op.alter_column('recurring_expenses', 'frequency',
               existing_type=postgresql.ENUM('monthly', 'yearly', name='frequencytype'),
               nullable=False)

    # Remove columns from recurring_expenses
    op.drop_column('recurring_expenses', 'total_installments')
    op.drop_column('recurring_expenses', 'type')

    # Drop RecurringType enum
    sa.Enum(name='recurringtype').drop(op.get_bind())
