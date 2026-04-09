"""restore transaction indexes, fix category_id FK ondelete, add recurring index

Revision ID: d1e2f3a4b5c6
Revises: c8f2a3b4d5e6
Create Date: 2026-04-08 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c8f2a3b4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Restaura índices removidos sem justificativa em 6aebac75a7a1
    op.create_index('ix_transactions_user_date_deleted', 'transactions', ['user_id', 'date', 'deleted_at'])
    op.create_index('ix_transactions_account_deleted', 'transactions', ['account_id', 'deleted_at'])
    op.create_index('idx_transactions_date_nature_deleted', 'transactions', ['date', 'nature', 'deleted_at'])
    op.create_index('idx_transactions_account_date_deleted', 'transactions', ['account_id', 'date', 'deleted_at'])

    # Índice composto para generate_future_transactions (busca por recurring_expense_id + mês)
    op.create_index('idx_transactions_recurring_date', 'transactions', ['recurring_expense_id', 'date'])

    # Corrige FK category_id: adiciona ON DELETE SET NULL
    op.drop_constraint('transactions_category_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_category_id_fkey',
        'transactions', 'categories',
        ['category_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('transactions_category_id_fkey', 'transactions', type_='foreignkey')
    op.create_foreign_key(
        'transactions_category_id_fkey',
        'transactions', 'categories',
        ['category_id'], ['id'],
    )

    op.drop_index('idx_transactions_recurring_date', table_name='transactions')
    op.drop_index('idx_transactions_account_date_deleted', table_name='transactions')
    op.drop_index('idx_transactions_date_nature_deleted', table_name='transactions')
    op.drop_index('ix_transactions_account_deleted', table_name='transactions')
    op.drop_index('ix_transactions_user_date_deleted', table_name='transactions')
