from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.analytics import (
    OperationalMonthly, SavingsRate, BurnRate,
    NetWorth, AssetsLiabilities, AccountBalance,
    DailyExpensesResponse, SankeyResponse, SankeyNode, SankeyLink
)
from app.schemas.goals import GoalProgress
from app.schemas.forecast import ForecastRead
from typing import List
from decimal import Decimal
from uuid import UUID
from datetime import date, timedelta

class AnalyticsService:
    def get_operational_monthly(self, db: Session, user_id: UUID) -> List[OperationalMonthly]:
        result = db.execute(
            text("SELECT * FROM v_operational_monthly WHERE user_id = :user_id"),
            {"user_id": str(user_id)}
        ).all()
        return [OperationalMonthly.model_validate(row) for row in result]

    def get_savings_rate(self, db: Session, user_id: UUID) -> List[SavingsRate]:
        result = db.execute(
            text("SELECT * FROM v_savings_rate WHERE user_id = :user_id"),
            {"user_id": str(user_id)}
        ).all()
        return [SavingsRate.model_validate(row) for row in result]

    def get_burn_rate(self, db: Session, user_id: UUID) -> dict:
        # Get last 3 months (excluding current) - Versão PostgreSQL apenas
        last_3m = db.execute(text("""
            SELECT COALESCE(AVG(total_expense), 0)
            FROM v_operational_monthly
            WHERE user_id = :user_id
              AND month >= date_trunc('month', now()) - interval '3 months'
              AND month < date_trunc('month', now())
        """), {"user_id": str(user_id)}).scalar()

        # Get previous 3 months (months -6 to -4)
        prev_3m = db.execute(text("""
            SELECT COALESCE(AVG(total_expense), 0)
            FROM v_operational_monthly
            WHERE user_id = :user_id
              AND month >= date_trunc('month', now()) - interval '6 months'
              AND month < date_trunc('month', now()) - interval '3 months'
        """), {"user_id": str(user_id)}).scalar()

        avg_last = Decimal(last_3m or 0)
        avg_prev = Decimal(prev_3m or 0)

        if avg_prev == 0:
            trend = "STABLE"
        elif avg_last > avg_prev * Decimal('1.05'):
            trend = "UP"
        elif avg_last < avg_prev * Decimal('0.95'):
            trend = "DOWN"
        else:
            trend = "STABLE"

        return {
            "avg_monthly_expense_last_3m": avg_last,
            "previous_3m_avg": avg_prev,
            "trend": trend
        }

    def get_net_worth(self, db: Session, user_id: UUID) -> Decimal:
        result = db.execute(
            text("SELECT net_worth FROM v_net_worth WHERE user_id = :user_id"),
            {"user_id": str(user_id)}
        ).scalar()
        return Decimal(result or 0)

    def get_assets_liabilities(self, db: Session, user_id: UUID) -> List[AssetsLiabilities]:
        result = db.execute(
            text("SELECT * FROM v_assets_liabilities WHERE user_id = :user_id"),
            {"user_id": str(user_id)}
        ).all()
        return [AssetsLiabilities.model_validate(row) for row in result]

    def get_account_balances(self, db: Session, user_id: UUID) -> List[AccountBalance]:
        result = db.execute(
            text("SELECT id, type, current_balance FROM v_account_balances WHERE user_id = :user_id"),
            {"user_id": str(user_id)}
        ).all()
        return [AccountBalance.model_validate(row) for row in result]

    def get_goals_progress(self, db: Session, user_id: UUID) -> List[GoalProgress]:
        result = db.execute(
            text("SELECT * FROM v_goal_progress WHERE user_id = :user_id ORDER BY target_date ASC"),
            {"user_id": str(user_id)}
        ).all()
        return [GoalProgress.model_validate(row) for row in result]

    def get_forecast(self, db: Session, user_id: UUID) -> ForecastRead:
        result = db.execute(
            text("SELECT * FROM v_financial_forecast WHERE user_id = :user_id"),
            {"user_id": str(user_id)}
        ).first()
        if not result:
            return ForecastRead(
                current_net_worth=Decimal(0),
                avg_monthly_result_last_3m=Decimal(0),
                projected_3m=Decimal(0),
                projected_6m=Decimal(0),
                projected_12m=Decimal(0)
            )
        return ForecastRead.model_validate(result)

    def get_sankey_data(self, db: Session, user_id: UUID, year: int, month: int) -> SankeyResponse:
        query = text("""
            SELECT
                COALESCE(c.name, 'Sem Categoria') as category_name,
                c.color as category_color,
                t.nature,
                SUM(ABS(t.amount)) as total
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = :user_id
              AND t.deleted_at IS NULL
              AND EXTRACT(YEAR FROM t.date) = :year
              AND EXTRACT(MONTH FROM t.date) = :month
              AND t.nature IN ('INCOME', 'EXPENSE', 'INVESTMENT')
            GROUP BY c.name, c.color, t.nature
        """)

        results = db.execute(query, {
            "user_id": str(user_id),
            "year": year,
            "month": month
        }).all()

        nodes = []
        links = []
        node_map = {}

        def get_node_idx(name, color=None):
            if name not in node_map:
                node_map[name] = len(nodes)
                nodes.append(SankeyNode(name=name, color=color))
            return node_map[name]

        # Define special nodes
        # Green for Receita and Economizado, Red for Despesas
        receita_idx = get_node_idx("Receita", "#22c55e")
        despesas_idx = get_node_idx("Despesas", "#ef4444")

        total_income = Decimal(0)
        total_outflow = Decimal(0)

        # Level 0 -> 1: Income Categories -> Receita
        # Level 2 -> 3: Despesas -> Expense Categories
        income_cats = []
        outflow_cats = []

        for row in results:
            if row.nature == 'INCOME':
                total_income += row.total
                income_cats.append((row.category_name, row.category_color, row.total))
            elif row.nature in ('EXPENSE', 'INVESTMENT'):
                total_outflow += row.total
                outflow_cats.append((row.category_name, row.category_color, row.total))

        # Add income category links
        for name, color, value in income_cats:
            cat_idx = get_node_idx(name, color)
            links.append(SankeyLink(source=cat_idx, target=receita_idx, value=value))

        # Add outflow (Despesas + Investment) category links
        for name, color, value in outflow_cats:
            cat_idx = get_node_idx(name, color)
            links.append(SankeyLink(source=despesas_idx, target=cat_idx, value=value))

        # Link Level 1 -> 2: Receita -> Despesas
        if total_outflow > 0:
            links.append(SankeyLink(source=receita_idx, target=despesas_idx, value=total_outflow))

        # Link Level 1 -> 2: Receita -> Economizado
        if total_income > total_outflow:
            economizado_val = total_income - total_outflow
            economizado_idx = get_node_idx("Economizado", "#22c55e")
            links.append(SankeyLink(source=receita_idx, target=economizado_idx, value=economizado_val))

        return SankeyResponse(nodes=nodes, links=links)

    def get_daily_expenses(self, db: Session, user_id: UUID, year: int, month: int) -> dict:
        def get_cumulative_for_month(y: int, m: int):
            query = text("""
                WITH days AS (
                    SELECT generate_series(
                        date_trunc('month', make_date(:year, :month, 1)),
                        date_trunc('month', make_date(:year, :month, 1)) + interval '1 month' - interval '1 day',
                        interval '1 day'
                    )::date AS day
                ),
                daily_expenses AS (
                    SELECT
                        (date AT TIME ZONE 'America/Sao_Paulo')::date AS day,
                        SUM(-amount) AS amount
                    FROM transactions
                    WHERE user_id = :user_id
                      AND nature = 'EXPENSE'
                      AND deleted_at IS NULL
                      AND date_trunc('month', date AT TIME ZONE 'America/Sao_Paulo') =
                          date_trunc('month', make_date(:year, :month, 1) AT TIME ZONE 'America/Sao_Paulo')
                    GROUP BY 1
                )
                SELECT
                    EXTRACT(DAY FROM d.day)::int AS day,
                    COALESCE(SUM(de.amount) OVER (ORDER BY d.day), 0) AS cumulative
                FROM days d
                LEFT JOIN daily_expenses de ON d.day = de.day
                ORDER BY d.day;
            """)
            return db.execute(query, {"user_id": str(user_id), "year": y, "month": m}).all()

        current_results = get_cumulative_for_month(year, month)

        # Calculate previous month
        first_day_current = date(year, month, 1)
        last_day_prev = first_day_current - timedelta(days=1)
        prev_year = last_day_prev.year
        prev_month = last_day_prev.month

        previous_results = get_cumulative_for_month(prev_year, prev_month)

        return {
            "current_month": [{"day": row.day, "cumulative": row.cumulative} for row in current_results],
            "previous_month": [{"day": row.day, "cumulative": row.cumulative} for row in previous_results]
        }

analytics_service = AnalyticsService()