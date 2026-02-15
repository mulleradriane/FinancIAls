from pydantic import BaseModel, ConfigDict
from uuid import UUID
import datetime
from decimal import Decimal
from app.models.income import IncomeType

class IncomeBase(BaseModel):
    description: str
    amount: Decimal
    date: datetime.date
    type: IncomeType

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    description: str | None = None
    amount: Decimal | None = None
    date: datetime.date | None = None
    type: IncomeType | None = None

class Income(IncomeBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
