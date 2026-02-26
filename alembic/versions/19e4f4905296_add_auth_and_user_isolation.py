"""add_auth_and_user_isolation

Revision ID: 19e4f4905296
Revises: b650459b6327
Create Date: 2026-02-25 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = '19e4f4905296'
down_revision: Union[str, Sequence[str], None] = 'b650459b6327'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Drop ALL existing views first to avoid dependency issues during table alterations
    op.execute("DROP VIEW IF EXISTS v_financial_forecast;")
    op.execute("DROP VIEW IF EXISTS v_goal_progress;")
    op.execute("DROP VIEW IF EXISTS v_assets_liabilities;")
    op.execute("DROP VIEW IF EXISTS v_net_worth;")
    op.execute("DROP VIEW IF EXISTS v_burn_rate;")
    op.execute("DROP VIEW IF EXISTS v_savings_rate;")
    op.execute("DROP VIEW IF EXISTS v_operational_monthly;")
    op.execute("DROP VIEW IF EXISTS v_account_balances;")

    # 2. Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 3. Add user_id to main tables
    tables = ['accounts', 'categories', 'transactions', 'recurring_expenses', 'financial_goals']

    for table in tables:
        op.add_column(table, sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(f'fk_{table}_user_id_users', table, 'users', ['user_id'], ['id'])

    # 4. Create a default user for existing data (if any)
    default_user_id = str(uuid.uuid4())
    op.execute(f"INSERT INTO users (id, username, display_name, hashed_password) VALUES ('{default_user_id}', 'admin', 'Administrador', 'no-password-login-disabled')")

    for table in tables:
        op.execute(f"UPDATE {table} SET user_id = '{default_user_id}' WHERE user_id IS NULL")
        op.alter_column(table, 'user_id', nullable=False)

    # 5. Recreate Analytical Views with user_id support (PostgreSQL specific)

    # v_account_balances
    op.execute("""
    CREATE VIEW v_account_balances AS
    SELECT
        a.id,
        a.user_id,
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
        a.user_id,
        a.type,
        a.initial_balance,
        a.initial_balance_date;
    """)

    # v_operational_monthly
    op.execute("""
    CREATE VIEW v_operational_monthly AS
    SELECT
        user_id,
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
    GROUP BY user_id, 2
    ORDER BY user_id, 2;
    """)

    # v_savings_rate
    op.execute("""
    CREATE VIEW v_savings_rate AS
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

    # v_burn_rate
    op.execute("""
    CREATE VIEW v_burn_rate AS
    SELECT
        user_id,
        COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
    FROM v_operational_monthly
    WHERE month >= date_trunc('month', now()) - interval '3 months'
      AND month < date_trunc('month', now())
    GROUP BY user_id;
    """)

    # v_net_worth
    op.execute("""
    CREATE VIEW v_net_worth AS
    SELECT
        user_id,
        COALESCE(SUM(current_balance), 0) AS net_worth
    FROM v_account_balances
    GROUP BY user_id;
    """)

    # v_assets_liabilities
    op.execute("""
    CREATE VIEW v_assets_liabilities AS
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
    GROUP BY user_id, classification;
    """)

    # v_goal_progress
    op.execute("""
    CREATE VIEW v_goal_progress AS
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
    LEFT JOIN v_net_worth nw ON g.user_id = nw.user_id
    WHERE g.deleted_at IS NULL;
    """)

    # v_financial_forecast
    op.execute("""
    CREATE VIEW v_financial_forecast AS
    WITH stats AS (
        SELECT
            u.id as user_id,
            COALESCE(nw.net_worth, 0) as current_net_worth,
            COALESCE((
                SELECT AVG(net_result) FROM v_operational_monthly om
                WHERE om.user_id = u.id
                  AND om.month >= date_trunc('month', now()) - interval '3 months'
                  AND om.month < date_trunc('month', now())
            ), 0) as avg_monthly_result
        FROM users u
        LEFT JOIN v_net_worth nw ON u.id = nw.user_id
    )
    SELECT
        user_id,
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

def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_financial_forecast;")
    op.execute("DROP VIEW IF EXISTS v_goal_progress;")
    op.execute("DROP VIEW IF EXISTS v_assets_liabilities;")
    op.execute("DROP VIEW IF EXISTS v_net_worth;")
    op.execute("DROP VIEW IF EXISTS v_burn_rate;")
    op.execute("DROP VIEW IF EXISTS v_savings_rate;")
    op.execute("DROP VIEW IF EXISTS v_operational_monthly;")
    op.execute("DROP VIEW IF EXISTS v_account_balances;")

    tables = ['accounts', 'categories', 'transactions', 'recurring_expenses', 'financial_goals']
    for table in tables:
        op.drop_constraint(f'fk_{table}_user_id_users', table, type_='foreignkey')
        op.drop_column(table, 'user_id')

    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')
