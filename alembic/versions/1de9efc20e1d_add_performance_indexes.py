"""add_performance_indexes

Revision ID: 1de9efc20e1d
Revises: bceb7164d6cd
Create Date: 2026-03-07 19:49:40.162272

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1de9efc20e1d'
down_revision: Union[str, Sequence[str], None] = 'bceb7164d6cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        'ix_transactions_user_date_deleted',
        'transactions',
        ['user_id', 'date', 'deleted_at']
    )
    op.create_index(
        'ix_transactions_account_deleted',
        'transactions',
        ['account_id', 'deleted_at']
    )
    op.create_index(
        'ix_balance_history_account_date',
        'balance_history',
        ['account_id', 'date']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_transactions_user_date_deleted', table_name='transactions')
    op.drop_index('ix_transactions_account_deleted', table_name='transactions')
    op.drop_index('ix_balance_history_account_date', table_name='balance_history')
