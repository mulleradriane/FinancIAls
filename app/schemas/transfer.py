from pydantic import BaseModel, ConfigDict, condecimal
from uuid import UUID
import datetime
from decimal import Decimal

AmountDecimal = condecimal(max_digits=12, decimal_places=2)

class TransferBase(BaseModel):
    from_account_id: UUID
    to_account_id: UUID
    amount: AmountDecimal
    date: datetime.date
    description: str | None = None

class TransferCreate(TransferBase):
    pass

class TransferUpdate(BaseModel):
    from_account_id: UUID | None = None
    to_account_id: UUID | None = None
    amount: AmountDecimal | None = None
    date: datetime.date | None = None
    description: str | None = None

class Transfer(TransferBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
