from pydantic import BaseModel, ConfigDict
from uuid import UUID
from decimal import Decimal
from app.models.account import AccountType

class AccountBase(BaseModel):
    name: str
    type: AccountType

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None

class Account(AccountBase):
    id: UUID
    balance: Decimal = Decimal(0)

    model_config = ConfigDict(from_attributes=True)
