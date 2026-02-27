from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List

class OperationalMonthly(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month: date
    total_income: Decimal
    total_expense: Decimal
    net_result: Decimal

class SavingsRate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month: date
    total_income: Decimal
    total_expense: Decimal
    net_result: Decimal
    savings_rate: float

class BurnRate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    avg_monthly_expense_last_3m: Decimal
    previous_3m_avg: Decimal
    trend: str  # 'UP', 'DOWN', 'STABLE'

class NetWorth(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    net_worth: Decimal

class AssetsLiabilities(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    classification: str
    total: Decimal

class AccountBalance(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    current_balance: Decimal

class AnalyticsSummary(BaseModel):
    operational_monthly: List[OperationalMonthly]
    savings_rate: List[SavingsRate]
    burn_rate: Decimal
    net_worth: Decimal
    assets_liabilities: List[AssetsLiabilities]

class DailyExpenseEntry(BaseModel):
    day: int
    cumulative: Decimal

class DailyExpensesResponse(BaseModel):
    current_month: List[DailyExpenseEntry]
    previous_month: List[DailyExpenseEntry]

class SankeyNode(BaseModel):
    name: str
    color: Optional[str] = None

class SankeyLink(BaseModel):
    source: int
    target: int
    value: Decimal

class SankeyResponse(BaseModel):
    nodes: List[SankeyNode]
    links: List[SankeyLink]
