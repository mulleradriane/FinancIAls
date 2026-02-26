from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.analytics import (
    OperationalMonthly, SavingsRate, BurnRate,
    NetWorth, AssetsLiabilities, AccountBalance
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

analytics_service = AnalyticsService()