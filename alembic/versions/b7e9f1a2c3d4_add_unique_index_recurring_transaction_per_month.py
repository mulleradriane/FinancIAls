"""add unique index recurring transaction per month

Revision ID: b7e9f1a2c3d4
Revises: 66d18793a3d9
Create Date: 2026-04-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from typing import Sequence, Union

revision = 'b7e9f1a2c3d4'
down_revision: Union[str, Sequence[str], None] = '66d18793a3d9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove duplicatas existentes antes de criar o índice.
    # Mantém a transação mais antiga (menor created_at) e faz soft-delete nas demais.
    op.execute("""
        UPDATE transactions
        SET deleted_at = NOW()
        WHERE id IN (
            SELECT id FROM (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY
                            recurring_expense_id,
                            date_trunc('month', date::timestamp),
                            user_id
                        ORDER BY created_at ASC
                    ) AS rn
                FROM transactions
                WHERE recurring_expense_id IS NOT NULL
                  AND deleted_at IS NULL
            ) ranked
            WHERE rn > 1
        )
    """)

    # Cast explícito date::timestamp torna a expressão IMMUTABLE no PostgreSQL,
    # permitindo seu uso em índice único.
    op.execute("""
        CREATE UNIQUE INDEX uq_recurring_transaction_month
        ON transactions (
            recurring_expense_id,
            date_trunc('month', date::timestamp),
            user_id
        )
        WHERE deleted_at IS NULL
          AND recurring_expense_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_recurring_transaction_month")
