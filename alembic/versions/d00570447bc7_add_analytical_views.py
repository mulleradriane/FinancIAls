"""add_analytical_views

Revision ID: d00570447bc7
Revises: cleanup_legacy
Create Date: 2026-02-23 21:03:28.047587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd00570447bc7'
down_revision: Union[str, Sequence[str], None] = 'cleanup_legacy'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Helper view for current balances
    # Incorporates initial_balance and initial_balance_date logic
    op.execute(\"\"\"
        CREATE OR REPLACE VIEW v_account_balances AS
        SELECT
            a.id,
            a.type,
            a.initial_balance + COALESCE(
                SUM(CASE
                    WHEN t.date >= a.initial_balance_date AND t.deleted_at IS NULL
                    THEN t.amount
                    ELSE 0
                END),
            0) AS current_balance
        FROM accounts a
        LEFT JOIN transactions t ON a.id = t.account_id
        GROUP BY a.id, a.type, a.initial_balance;
    \"\"\")

    # 2. Resultado Operacional Mensal
    # Excludes TRANSFER, INVESTMENT, SYSTEM_ADJUSTMENT
    op.execute(\"\"\"
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
    \"\"\")

    # 3. Taxa de Poupança
    op.execute(\"\"\"
        CREATE OR REPLACE VIEW v_savings_rate AS
        SELECT
            month,
            total_income,
            total_expense,
            net_result,
            CASE
                WHEN total_income > 0
                THEN ROUND(CAST(net_result AS NUMERIC) / CAST(total_income AS NUMERIC), 4)
                ELSE 0
            END AS savings_rate
        FROM v_operational_monthly;
    \"\"\")

    # 4. Burn Rate (média últimos 3 meses fechados)
    op.execute(\"\"\"
        CREATE OR REPLACE VIEW v_burn_rate AS
        SELECT
            COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
        FROM v_operational_monthly
        WHERE month >= date_trunc('month', now()) - interval '3 months'
          AND month < date_trunc('month', now());
    \"\"\")

    # 5. Patrimônio Líquido Total
    op.execute(\"\"\"
        CREATE OR REPLACE VIEW v_net_worth AS
        SELECT
            COALESCE(SUM(current_balance), 0) AS net_worth
        FROM v_account_balances;
    \"\"\")

    # 6. Ativos vs Passivos
    op.execute(\"\"\"
        CREATE OR REPLACE VIEW v_assets_liabilities AS
        SELECT
            CASE
                WHEN type IN ('banco', 'investimento', 'carteira', 'poupanca', 'outros_ativos') THEN 'asset'
                WHEN type IN ('cartao_credito', 'outros_passivos') THEN 'liability'
            END AS classification,
            SUM(
                CASE
                    WHEN type IN ('banco', 'investimento', 'carteira', 'poupanca', 'outros_ativos') THEN current_balance
                    WHEN type IN ('cartao_credito', 'outros_passivos') THEN -current_balance
                END
            ) AS total
        FROM v_account_balances
        WHERE type IN ('banco', 'investimento', 'carteira', 'poupanca', 'outros_ativos', 'cartao_credito', 'outros_passivos')
        GROUP BY 1;
    \"\"\")


def downgrade() -> None:
    \"\"\"Downgrade schema.\"\"\"
    op.execute(\"DROP VIEW IF EXISTS v_assets_liabilities;\")
    op.execute(\"DROP VIEW IF EXISTS v_net_worth;\")
    op.execute(\"DROP VIEW IF EXISTS v_burn_rate;\")
    op.execute(\"DROP VIEW IF EXISTS v_savings_rate;\")
    op.execute(\"DROP VIEW IF EXISTS v_operational_monthly;\")
    op.execute(\"DROP VIEW IF EXISTS v_account_balances;\")
