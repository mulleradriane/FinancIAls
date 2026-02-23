"""add_v_goal_progress_view

Revision ID: 18671a96c794
Revises: 14d68e1fb0e0
Create Date: 2026-02-23 23:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '18671a96c794'
down_revision: Union[str, Sequence[str], None] = '14d68e1fb0e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    dialect = op.get_context().dialect.name

    if dialect == 'postgresql':
        op.execute("""
        CREATE OR REPLACE VIEW v_goal_progress AS
        WITH current_nw AS (
            SELECT net_worth FROM v_net_worth
        )
        SELECT
            g.id,
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
        FROM financial_goals g, current_nw nw
        WHERE g.deleted_at IS NULL;
        """)
    else:
        # SQLite
        op.execute("DROP VIEW IF EXISTS v_goal_progress;")
        op.execute("""
        CREATE VIEW v_goal_progress AS
        WITH current_nw AS (
            SELECT net_worth FROM v_net_worth
        )
        SELECT
            g.id,
            g.name,
            g.target_amount,
            g.goal_type,
            g.start_date,
            g.target_date,
            nw.net_worth AS current_amount,
            CASE
                WHEN date('now') < g.start_date THEN 0
                WHEN g.target_amount > 0 THEN ROUND((CAST(nw.net_worth AS FLOAT) / CAST(g.target_amount AS FLOAT)) * 100, 2)
                ELSE 0
            END AS percentage_completed,
            CASE WHEN g.target_amount - nw.net_worth > 0 THEN g.target_amount - nw.net_worth ELSE 0 END AS remaining_amount,
            CASE WHEN julianday(g.target_date) - julianday('now', 'start of day') > 0 THEN CAST(julianday(g.target_date) - julianday('now', 'start of day') AS INTEGER) ELSE 0 END AS days_remaining,
            CASE
                WHEN date('now') < g.start_date THEN 1
                WHEN date('now') > g.target_date THEN nw.net_worth >= g.target_amount
                ELSE
                    nw.net_worth >= (
                        g.target_amount * (
                            (julianday('now', 'start of day') - julianday(g.start_date)) /
                            NULLIF((julianday(g.target_date) - julianday(g.start_date)), 0)
                        )
                    )
            END AS on_track
        FROM financial_goals g, current_nw nw
        WHERE g.deleted_at IS NULL;
        """)

def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_goal_progress;")
