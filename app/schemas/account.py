from pydantic import BaseModel, ConfigDict
from uuid import UUID
from decimal import Decimal
from datetime import date
from app.models.account import AccountType

class AccountBase(BaseModel):
    name: str
    type: AccountType
    initial_balance: Decimal = Decimal(0)
    initial_balance_date: date | None = None

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    initial_balance: Decimal | None = None
    initial_balance_date: date | None = None
    current_balance: Decimal | None = None

class Account(AccountBase):
    id: UUID
    balance: Decimal = Decimal(0)

    model_config = ConfigDict(from_attributes=True)
