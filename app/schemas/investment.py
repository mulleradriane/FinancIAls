from pydantic import BaseModel, ConfigDict
from uuid import UUID
import datetime
from decimal import Decimal

class InvestmentBase(BaseModel):
    date: datetime.date
    amount: Decimal
    description: str | None = None

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentUpdate(BaseModel):
    date: datetime.date | None = None
    amount: Decimal | None = None
    description: str | None = None

class Investment(InvestmentBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
