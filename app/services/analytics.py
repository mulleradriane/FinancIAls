from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.analytics import (
    OperationalMonthly, SavingsRate, BurnRate,
    NetWorth, AssetsLiabilities, AccountBalance,
    DailyExpensesResponse
)
from app.schemas.goals import GoalProgress
from app.schemas.forecast import ForecastRead
from typing import List
from decimal import Decimal
from uuid import UUID

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

    def get_daily_expenses(self, db: Session, user_id: UUID, year: int, month: int) -> dict:
        # Cumulative daily expenses for the requested month
        # Using AT TIME ZONE 'America/Sao_Paulo' as requested
        daily_query = text("""
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

        daily_results = db.execute(daily_query, {
            "user_id": str(user_id),
            "year": year,
            "month": month
        }).all()

        # Total expenses for the previous month
        prev_month_query = text("""
            SELECT COALESCE(SUM(-amount), 0)
            FROM transactions
            WHERE user_id = :user_id
              AND nature = 'EXPENSE'
              AND deleted_at IS NULL
              AND date_trunc('month', date AT TIME ZONE 'America/Sao_Paulo') =
                  date_trunc('month', (make_date(:year, :month, 1) - interval '1 month') AT TIME ZONE 'America/Sao_Paulo')
        """)

        prev_month_total = db.execute(prev_month_query, {
            "user_id": str(user_id),
            "year": year,
            "month": month
        }).scalar()

        return {
            "daily_data": [{"day": row.day, "cumulative": row.cumulative} for row in daily_results],
            "previous_month_total": Decimal(prev_month_total or 0)
        }

analytics_service = AnalyticsService()