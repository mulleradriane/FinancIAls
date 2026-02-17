from pydantic import BaseModel
from decimal import Decimal
from typing import Dict, List

class MonthlySummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    total_invested: Decimal
    balance: Decimal
    expenses_by_category: Dict[str, Decimal]

class DashboardChartData(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal

class DashboardData(BaseModel):
    current_balance: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal
    chart_data: List[DashboardChartData]

class YearlySummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    total_invested: Decimal
    balance: Decimal
