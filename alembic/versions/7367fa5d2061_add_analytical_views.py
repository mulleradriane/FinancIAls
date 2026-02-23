"""add_analytical_views

Revision ID: 7367fa5d2061
Revises: 4229760ab57a
Create Date: 2026-02-23 18:29:28.843654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7367fa5d2061'
down_revision: Union[str, Sequence[str], None] = '4229760ab57a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("""
    CREATE OR REPLACE VIEW v_account_balances AS
    SELECT
        a.id,
        a.type,
        a.initial_balance +
        COALESCE(
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
    GROUP BY
        a.id,
        a.type,
        a.initial_balance,
        a.initial_balance_date;
    """)

    op.execute("""
    CREATE OR REPLACE VIEW v_operational_monthly AS
    SELECT
        date_trunc('month', date) AS month,
        SUM(CASE WHEN nature = 'INCOME' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN nature = 'EXPENSE' THEN -amount ELSE 0 END) AS total_expense,
        SUM(
            CASE
                WHEN nature IN ('INCOME','EXPENSE')
                THEN amount
                ELSE 0
            END
        ) AS net_result
    FROM transactions
    WHERE deleted_at IS NULL
    GROUP BY 1
    ORDER BY 1;
    """)

    op.execute("""
    CREATE OR REPLACE VIEW v_savings_rate AS
    SELECT
        month,
        total_income,
        total_expense,
        net_result,
        CASE
            WHEN total_income > 0
            THEN ROUND(net_result / total_income, 4)
            ELSE 0
        END AS savings_rate
    FROM v_operational_monthly;
    """)

    op.execute("""
    CREATE OR REPLACE VIEW v_burn_rate AS
    SELECT
        COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
    FROM v_operational_monthly
    WHERE month >= date_trunc('month', now()) - interval '4 months'
      AND month < date_trunc('month', now());
    """)

    op.execute("""
    CREATE OR REPLACE VIEW v_net_worth AS
    SELECT
        COALESCE(SUM(current_balance), 0) AS net_worth
    FROM v_account_balances;
    """)

    op.execute("""
    CREATE OR REPLACE VIEW v_assets_liabilities AS
    SELECT
        CASE
            WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                THEN 'asset'
            WHEN type IN ('cartao_credito','outros_passivos')
                THEN 'liability'
        END AS classification,
        SUM(
            CASE
                WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                    THEN current_balance
                WHEN type IN ('cartao_credito','outros_passivos')
                    THEN -current_balance
            END
        ) AS total
    FROM v_account_balances
    GROUP BY 1;
    """)


def downgrade():
    op.execute("DROP VIEW IF EXISTS v_assets_liabilities;")
    op.execute("DROP VIEW IF EXISTS v_net_worth;")
    op.execute("DROP VIEW IF EXISTS v_burn_rate;")
    op.execute("DROP VIEW IF EXISTS v_savings_rate;")
    op.execute("DROP VIEW IF EXISTS v_operational_monthly;")
    op.execute("DROP VIEW IF EXISTS v_account_balances;")