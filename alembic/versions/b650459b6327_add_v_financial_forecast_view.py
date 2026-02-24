"""add_v_financial_forecast_view

Revision ID: b650459b6327
Revises: 18671a96c794
Create Date: 2026-02-24 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b650459b6327'
down_revision: Union[str, Sequence[str], None] = '18671a96c794'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    dialect = op.get_context().dialect.name

    if dialect == 'postgresql':
        op.execute("""
        CREATE OR REPLACE VIEW v_financial_forecast AS
        WITH stats AS (
            SELECT
                (SELECT net_worth FROM v_net_worth) as current_net_worth,
                (SELECT COALESCE(AVG(net_result), 0) FROM v_operational_monthly
                 WHERE month >= date_trunc('month', now()) - interval '3 months'
                   AND month < date_trunc('month', now())) as avg_monthly_result
        )
        SELECT
            current_net_worth,
            avg_monthly_result as avg_monthly_result_last_3m,
            current_net_worth + (avg_monthly_result * 3) as projected_3m,
            current_net_worth + (avg_monthly_result * 6) as projected_6m,
            current_net_worth + (avg_monthly_result * 12) as projected_12m,
            CASE
                WHEN avg_monthly_result < 0 THEN
                    CASE
                        WHEN current_net_worth <= 0 THEN 0
                        ELSE ABS(current_net_worth / avg_monthly_result)
                    END
                ELSE NULL
            END as months_until_zero,
            CASE
                WHEN avg_monthly_result < 0 THEN
                    CASE
                        WHEN current_net_worth <= 0 THEN CURRENT_DATE
                        ELSE (date_trunc('day', now()) + (ABS(current_net_worth / avg_monthly_result) * interval '1 month'))::date
                    END
                ELSE NULL
            END as projected_date_of_zero
        FROM stats;
        """)
    elif dialect == 'sqlite':
        op.execute("DROP VIEW IF EXISTS v_financial_forecast;")
        op.execute("""
        CREATE VIEW v_financial_forecast AS
        WITH stats AS (
            SELECT
                (SELECT net_worth FROM v_net_worth) as current_net_worth,
                (SELECT COALESCE(AVG(net_result), 0) FROM v_operational_monthly
                 WHERE month >= date('now', 'start of month', '-3 months')
                   AND month < date('now', 'start of month')) as avg_monthly_result
        )
        SELECT
            current_net_worth,
            avg_monthly_result as avg_monthly_result_last_3m,
            current_net_worth + (avg_monthly_result * 3) as projected_3m,
            current_net_worth + (avg_monthly_result * 6) as projected_6m,
            current_net_worth + (avg_monthly_result * 12) as projected_12m,
            CASE
                WHEN avg_monthly_result < 0 THEN
                    CASE
                        WHEN current_net_worth <= 0 THEN 0
                        ELSE ABS(CAST(current_net_worth AS FLOAT) / CAST(avg_monthly_result AS FLOAT))
                    END
                ELSE NULL
            END as months_until_zero,
            CASE
                WHEN avg_monthly_result < 0 THEN
                    CASE
                        WHEN current_net_worth <= 0 THEN date('now')
                        ELSE date('now', '+' || CAST(ROUND(ABS(CAST(current_net_worth AS FLOAT) / CAST(avg_monthly_result AS FLOAT))) AS INTEGER) || ' months')
                    END
                ELSE NULL
            END as projected_date_of_zero
        FROM stats;
        """)


def downgrade():
    op.execute("DROP VIEW IF EXISTS v_financial_forecast;")
