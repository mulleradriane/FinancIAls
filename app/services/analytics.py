from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.analytics import (
    OperationalMonthly, SavingsRate, BurnRate,
    NetWorth, AssetsLiabilities, AccountBalance
)
from typing import List
from decimal import Decimal

class AnalyticsService:
    def get_operational_monthly(self, db: Session) -> List[OperationalMonthly]:
        result = db.execute(text("SELECT * FROM v_operational_monthly")).all()
        return [OperationalMonthly.model_validate(row) for row in result]

    def get_savings_rate(self, db: Session) -> List[SavingsRate]:
        result = db.execute(text("SELECT * FROM v_savings_rate")).all()
        return [SavingsRate.model_validate(row) for row in result]

    def get_burn_rate(self, db: Session) -> dict:
        # Get last 3 months (excluding current)
        last_3m = db.execute(text("""
            SELECT COALESCE(AVG(total_expense), 0)
            FROM v_operational_monthly
            WHERE month >= date_trunc('month', now()) - interval '3 months'
              AND month < date_trunc('month', now())
        """)).scalar() if db.bind.dialect.name == 'postgresql' else db.execute(text("""
            SELECT COALESCE(AVG(total_expense), 0)
            FROM v_operational_monthly
            WHERE month >= date('now', 'start of month', '-3 months')
              AND month < date('now', 'start of month')
        """)).scalar()

        # Get previous 3 months (months -6 to -4)
        prev_3m = db.execute(text("""
            SELECT COALESCE(AVG(total_expense), 0)
            FROM v_operational_monthly
            WHERE month >= date_trunc('month', now()) - interval '6 months'
              AND month < date_trunc('month', now()) - interval '3 months'
        """)).scalar() if db.bind.dialect.name == 'postgresql' else db.execute(text("""
            SELECT COALESCE(AVG(total_expense), 0)
            FROM v_operational_monthly
            WHERE month >= date('now', 'start of month', '-6 months')
              AND month < date('now', 'start of month', '-3 months')
        """)).scalar()

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

    def get_net_worth(self, db: Session) -> Decimal:
        result = db.execute(text("SELECT net_worth FROM v_net_worth")).scalar()
        return Decimal(result or 0)

    def get_assets_liabilities(self, db: Session) -> List[AssetsLiabilities]:
        result = db.execute(text("SELECT * FROM v_assets_liabilities")).all()
        return [AssetsLiabilities.model_validate(row) for row in result]

    def get_account_balances(self, db: Session) -> List[AccountBalance]:
        result = db.execute(text("SELECT id, type, current_balance FROM v_account_balances")).all()
        return [AccountBalance.model_validate(row) for row in result]

analytics_service = AnalyticsService()
