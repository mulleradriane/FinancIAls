from pydantic import BaseModel, ConfigDict
from uuid import UUID
from decimal import Decimal
from app.models.account import AccountType

class AccountBase(BaseModel):
    name: str
    type: AccountType

class AccountCreate(AccountBase):
    initial_balance: Decimal = Decimal(0)

class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    current_balance: Decimal | None = None

class Account(AccountBase):
    id: UUID
    balance: Decimal = Decimal(0)

    model_config = ConfigDict(from_attributes=True)
