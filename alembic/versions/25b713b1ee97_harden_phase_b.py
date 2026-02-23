"""harden_phase_b

Revision ID: 25b713b1ee97
Revises: 7367fa5d2061
Create Date: 2026-02-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '25b713b1ee97'
down_revision: Union[str, Sequence[str], None] = '7367fa5d2061'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. Strategic Indexes
    op.create_index(
        'idx_transactions_account_date_deleted',
        'transactions',
        ['account_id', 'date', 'deleted_at']
    )
    op.create_index(
        'idx_transactions_date_nature_deleted',
        'transactions',
        ['date', 'nature', 'deleted_at']
    )

    # 2. Refine Views
    dialect = op.get_context().dialect.name

    if dialect == 'postgresql':
        # Adjusting v_burn_rate to use 3 months interval
        op.execute("""
        CREATE OR REPLACE VIEW v_burn_rate AS
        SELECT
            COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
        FROM v_operational_monthly
        WHERE month >= date_trunc('month', now()) - interval '3 months'
          AND month < date_trunc('month', now());
        """)

        # Improving v_assets_liabilities for determinism and handling unexpected types
        op.execute("""
        CREATE OR REPLACE VIEW v_assets_liabilities AS
        SELECT
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
        GROUP BY 1;
        """)
    elif dialect == 'sqlite':
        # Support for local development
        op.execute("DROP VIEW IF EXISTS v_burn_rate;")
        op.execute("""
        CREATE VIEW v_burn_rate AS
        SELECT
            COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
        FROM v_operational_monthly
        WHERE month >= date('now', 'start of month', '-3 months')
          AND month < date('now', 'start of month');
        """)

        op.execute("DROP VIEW IF EXISTS v_assets_liabilities;")
        op.execute("""
        CREATE VIEW v_assets_liabilities AS
        SELECT
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
        GROUP BY 1;
        """)


def downgrade():
    dialect = op.get_context().dialect.name

    if dialect == 'postgresql':
        # Revert v_assets_liabilities
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

        # Revert v_burn_rate (back to 4 months)
        op.execute("""
        CREATE OR REPLACE VIEW v_burn_rate AS
        SELECT
            COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
        FROM v_operational_monthly
        WHERE month >= date_trunc('month', now()) - interval '4 months'
          AND month < date_trunc('month', now());
        """)
    elif dialect == 'sqlite':
        op.execute("DROP VIEW IF EXISTS v_assets_liabilities;")
        op.execute("""
        CREATE VIEW v_assets_liabilities AS
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

        op.execute("DROP VIEW IF EXISTS v_burn_rate;")
        op.execute("""
        CREATE VIEW v_burn_rate AS
        SELECT
            COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
        FROM v_operational_monthly
        WHERE month >= date('now', 'start of month', '-4 months')
          AND month < date('now', 'start of month');
        """)

    op.drop_index('idx_transactions_date_nature_deleted', table_name='transactions')
    op.drop_index('idx_transactions_account_date_deleted', table_name='transactions')
