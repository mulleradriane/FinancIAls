from pydantic import BaseModel
from decimal import Decimal
from typing import Dict, List
import datetime

class CashFlowDay(BaseModel):
    date: datetime.date
    income: Decimal
    expense: Decimal
    balance: Decimal

class TopTransaction(BaseModel):
    description: str
    amount: Decimal
    date: datetime.date
    category_name: str

class MonthlySummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    total_invested: Decimal
    balance: Decimal
    expenses_by_category: Dict[str, Decimal]
    top_transactions: List[TopTransaction] = []

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

class NetWorthHistory(BaseModel):
    month: str
    value: Decimal

class NetWorthData(BaseModel):
    total_accounts: Decimal
    total_investments: Decimal
    total_debts: Decimal
    net_worth: Decimal
    history: List[NetWorthHistory] = []
