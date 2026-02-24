from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

class ForecastRead(BaseModel):
    current_net_worth: Decimal
    avg_monthly_result_last_3m: Decimal
    projected_3m: Decimal
    projected_6m: Decimal
    projected_12m: Decimal
    months_until_zero: Optional[Decimal] = None
    projected_date_of_zero: Optional[date] = None

    class Config:
        from_attributes = True
