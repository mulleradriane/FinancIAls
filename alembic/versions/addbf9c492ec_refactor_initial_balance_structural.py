"""refactor_initial_balance_structural

Revision ID: addbf9c492ec
Revises: eca5f6a1edce
Create Date: 2026-02-21 13:50:49.914676

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'addbf9c492ec'
down_revision: Union[str, Sequence[str], None] = 'eca5f6a1edce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns to accounts table
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('initial_balance', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('initial_balance_date', sa.Date(), nullable=False, server_default=sa.func.current_date()))

    # 2. Data Migration
    connection = op.get_bind()

    # Get all accounts
    accounts = connection.execute(sa.text("SELECT id FROM accounts")).fetchall()

    for account_row in accounts:
        account_id = account_row[0]

        # Find the oldest adjustment transaction
        # Categorized as "Ajuste de Saldo" or description "Saldo Inicial"
        query = sa.text("""
            SELECT t.id, t.amount, t.date
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.account_id = :account_id
            AND (c.name = 'Ajuste de Saldo' OR t.description = 'Saldo Inicial')
            AND t.deleted_at IS NULL
            ORDER BY t.date ASC, t.created_at ASC
            LIMIT 1
        """)

        trans = connection.execute(query, {"account_id": str(account_id)}).fetchone()

        if trans:
            trans_id, amount, t_date = trans

            # Update account
            update_query = sa.text("""
                UPDATE accounts
                SET initial_balance = :amount, initial_balance_date = :t_date
                WHERE id = :account_id
            """)
            connection.execute(update_query, {"amount": amount, "t_date": t_date, "account_id": str(account_id)})

            # Delete the transaction (Hard delete since we moved it to Account)
            delete_query = sa.text("DELETE FROM transactions WHERE id = :trans_id")
            connection.execute(delete_query, {"trans_id": str(trans_id)})


def downgrade() -> None:
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('initial_balance_date')
        batch_op.drop_column('initial_balance')
