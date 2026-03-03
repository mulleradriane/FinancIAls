"""filter_future_transactions_in_account_balances

Revision ID: 5acbd08ac3d1
Revises: 3fbe32e9b7be
Create Date: 2026-03-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5acbd08ac3d1'
down_revision: Union[str, Sequence[str], None] = '3fbe32e9b7be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. v_account_balances - Now filtering by date <= today (Sao Paulo)
    op.execute("""
    CREATE OR REPLACE VIEW v_account_balances AS
    SELECT
        a.id,
        a.type,
        a.user_id,
        a.initial_balance + COALESCE(
            SUM(
                CASE
                    WHEN t.date >= a.initial_balance_date
                     AND t.date <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
                     AND t.deleted_at IS NULL
                    THEN t.amount
                    ELSE 0
                END
            ), 0
        ) AS current_balance
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
    GROUP BY a.id, a.type, a.user_id, a.initial_balance, a.initial_balance_date;
    """)

    # We don't strictly need to recreate the other views because they depend on v_account_balances
    # but some databases might require it if the columns/types changed (they haven't).
    # Recreating them ensures everything is consistent.

    # 2. v_net_worth
    op.execute("""
    CREATE OR REPLACE VIEW v_net_worth AS
    SELECT
        user_id,
        COALESCE(SUM(current_balance), 0) AS net_worth
    FROM v_account_balances
    GROUP BY user_id;
    """)

    # 6. v_assets_liabilities
    op.execute("""
    CREATE OR REPLACE VIEW v_assets_liabilities AS
    SELECT
        user_id,
        CASE
            WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                THEN 'asset'
            WHEN type IN ('cartao_credito','outros_passivos')
                THEN 'liability'
            ELSE 'other'
        END AS classification,
        SUM(
            CASE
                WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                    THEN current_balance
                WHEN type IN ('cartao_credito','outros_passivos')
                    THEN -current_balance
                ELSE 0
            END
        ) AS total
    FROM v_account_balances
    GROUP BY user_id, 2;
    """)


def downgrade() -> None:
    # Restore v_account_balances to previous state (without date <= today filter)
    op.execute("""
    CREATE OR REPLACE VIEW v_account_balances AS
    SELECT
        a.id,
        a.type,
        a.user_id,
        a.initial_balance + COALESCE(
            SUM(
                CASE
                    WHEN t.date >= a.initial_balance_date
                     AND t.deleted_at IS NULL
                    THEN t.amount
                    ELSE 0
                END
            ), 0
        ) AS current_balance
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
    GROUP BY a.id, a.type, a.user_id, a.initial_balance, a.initial_balance_date;
    """)

    # Restore v_net_worth
    op.execute("""
    CREATE OR REPLACE VIEW v_net_worth AS
    SELECT
        user_id,
        COALESCE(SUM(current_balance), 0) AS net_worth
    FROM v_account_balances
    GROUP BY user_id;
    """)

    # Restore v_assets_liabilities
    op.execute("""
    CREATE OR REPLACE VIEW v_assets_liabilities AS
    SELECT
        user_id,
        CASE
            WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                THEN 'asset'
            WHEN type IN ('cartao_credito','outros_passivos')
                THEN 'liability'
            ELSE 'other'
        END AS classification,
        SUM(
            CASE
                WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                    THEN current_balance
                WHEN type IN ('cartao_credito','outros_passivos')
                    THEN -current_balance
                ELSE 0
            END
        ) AS total
    FROM v_account_balances
    GROUP BY user_id, 2;
    """)
