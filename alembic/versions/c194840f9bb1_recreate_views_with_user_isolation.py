"""recreate_views_with_user_isolation

Revision ID: (gerada automaticamente)
Revises: c62d3bd6a69d
Create Date: 2026-02-25
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c194840f9bb1'
down_revision = 'c62d3bd6a69d'
branch_labels = None
depends_on = None

def upgrade():
    # 1. v_account_balances - Agora com user_id
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

    # 2. v_net_worth - Baseada na view anterior com user_id
    op.execute("""
    CREATE OR REPLACE VIEW v_net_worth AS
    SELECT
        user_id,
        COALESCE(SUM(current_balance), 0) AS net_worth
    FROM v_account_balances
    GROUP BY user_id;
    """)

    # 3. v_operational_monthly
    op.execute("""
    CREATE OR REPLACE VIEW v_operational_monthly AS
    SELECT
        t.user_id,
        date_trunc('month', t.date) AS month,
        SUM(CASE WHEN t.nature = 'INCOME' THEN t.amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN t.nature = 'EXPENSE' THEN -t.amount ELSE 0 END) AS total_expense,
        SUM(CASE WHEN t.nature IN ('INCOME','EXPENSE') THEN t.amount ELSE 0 END) AS net_result
    FROM transactions t
    WHERE t.deleted_at IS NULL
    GROUP BY t.user_id, 2
    ORDER BY 2;
    """)

    # 4. v_savings_rate
    op.execute("""
    CREATE OR REPLACE VIEW v_savings_rate AS
    SELECT
        user_id,
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

    # 5. v_burn_rate
    op.execute("""
    CREATE OR REPLACE VIEW v_burn_rate AS
    SELECT
        user_id,
        COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
    FROM v_operational_monthly
    WHERE month >= date_trunc('month', now()) - interval '3 months'
      AND month < date_trunc('month', now())
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

    # 7. v_goal_progress - Adaptada para usar as novas views
    op.execute("""
    CREATE OR REPLACE VIEW v_goal_progress AS
    WITH current_nw AS (
        SELECT user_id, net_worth FROM v_net_worth
    )
    SELECT
        g.id,
        g.user_id,
        g.name,
        g.target_amount,
        g.goal_type,
        g.start_date,
        g.target_date,
        nw.net_worth AS current_amount,
        CASE
            WHEN CURRENT_DATE < g.start_date THEN 0
            WHEN g.target_amount > 0 THEN ROUND((nw.net_worth / g.target_amount) * 100, 2)
            ELSE 0
        END AS percentage_completed,
        GREATEST(g.target_amount - nw.net_worth, 0) AS remaining_amount,
        GREATEST(g.target_date - CURRENT_DATE, 0) AS days_remaining,
        CASE
            WHEN CURRENT_DATE < g.start_date THEN TRUE
            WHEN CURRENT_DATE > g.target_date THEN nw.net_worth >= g.target_amount
            ELSE
                nw.net_worth >= (
                    g.target_amount * (
                        (CURRENT_DATE - g.start_date)::float /
                        NULLIF((g.target_date - g.start_date), 0)::float
                    )
                )
        END AS on_track
    FROM financial_goals g
    JOIN current_nw nw ON g.user_id = nw.user_id
    WHERE g.deleted_at IS NULL;
    """)

    # 8. v_financial_forecast
    op.execute("""
    CREATE OR REPLACE VIEW v_financial_forecast AS
    WITH stats AS (
        SELECT
            nw.user_id,
            nw.net_worth AS current_net_worth,
            COALESCE(AVG(om.net_result), 0) AS avg_monthly_result
        FROM v_net_worth nw
        LEFT JOIN v_operational_monthly om ON nw.user_id = om.user_id
            AND om.month >= date_trunc('month', now()) - interval '3 months'
            AND om.month < date_trunc('month', now())
        GROUP BY nw.user_id, nw.net_worth
    )
    SELECT
        user_id,
        current_net_worth,
        avg_monthly_result AS avg_monthly_result_last_3m,
        current_net_worth + (avg_monthly_result * 3) AS projected_3m,
        current_net_worth + (avg_monthly_result * 6) AS projected_6m,
        current_net_worth + (avg_monthly_result * 12) AS projected_12m,
        CASE
            WHEN avg_monthly_result < 0 THEN
                CASE
                    WHEN current_net_worth <= 0 THEN 0
                    ELSE ABS(current_net_worth / avg_monthly_result)
                END
            ELSE NULL
        END AS months_until_zero,
        CASE
            WHEN avg_monthly_result < 0 THEN
                CASE
                    WHEN current_net_worth <= 0 THEN CURRENT_DATE
                    ELSE (date_trunc('day', now()) + (ABS(current_net_worth / avg_monthly_result) * interval '1 month'))::date
                END
            ELSE NULL
        END AS projected_date_of_zero
    FROM stats;
    """)

def downgrade():
    # Remove todas as views (opcional, mas seguro)
    op.execute("DROP VIEW IF EXISTS v_financial_forecast;")
    op.execute("DROP VIEW IF EXISTS v_goal_progress;")
    op.execute("DROP VIEW IF EXISTS v_assets_liabilities;")
    op.execute("DROP VIEW IF EXISTS v_burn_rate;")
    op.execute("DROP VIEW IF EXISTS v_savings_rate;")
    op.execute("DROP VIEW IF EXISTS v_operational_monthly;")
    op.execute("DROP VIEW IF EXISTS v_net_worth;")
    op.execute("DROP VIEW IF EXISTS v_account_balances;")