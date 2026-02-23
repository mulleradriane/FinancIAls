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

    def get_burn_rate(self, db: Session) -> Decimal:
        result = db.execute(text("SELECT avg_monthly_expense_last_3m FROM v_burn_rate")).scalar()
        return Decimal(result or 0)

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
