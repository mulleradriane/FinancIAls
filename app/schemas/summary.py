from pydantic import BaseModel
from decimal import Decimal
from typing import Dict

class MonthlySummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    total_invested: Decimal
    balance: Decimal
    expenses_by_category: Dict[str, Decimal]

class YearlySummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    total_invested: Decimal
    balance: Decimal
