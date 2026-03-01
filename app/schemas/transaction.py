from __future__ import annotations
from pydantic import BaseModel, ConfigDict, condecimal
from uuid import UUID
import datetime
from decimal import Decimal
from app.schemas.category import Category
from app.models.recurring_expense import RecurringType, FrequencyType
from app.models.transaction import TransactionNature
import enum

# 🔹 Tipo decimal alinhado com o banco (Numeric(12,2))
AmountDecimal = condecimal(max_digits=12, decimal_places=2)


class TransactionBase(BaseModel):
    description: str
    category_id: UUID | None = None
    amount: AmountDecimal
    nature: TransactionNature
    date: datetime.date
    recurring_expense_id: UUID | None = None
    installment_number: int | None = None
    account_id: UUID | None = None
    transfer_group_id: UUID | None = None


class TransactionCreate(TransactionBase):
    pass


class TransferCreate(BaseModel):
    description: str
    amount: AmountDecimal
    date: datetime.date
    from_account_id: UUID
    to_account_id: UUID


class UnifiedTransactionCreate(BaseModel):
    description: str
    category_id: UUID | None = None
    amount: AmountDecimal
    nature: TransactionNature
    date: datetime.date
    account_id: UUID
    to_account_id: UUID | None = None
    is_recurring: bool = False
    recurring_type: RecurringType | None = None
    frequency: FrequencyType | None = None
    total_installments: int | None = None


class TransactionUpdate(BaseModel):
    description: str | None = None
    category_id: UUID | None = None
    amount: AmountDecimal | None = None
    nature: TransactionNature | None = None
    date: datetime.date | None = None
    recurring_expense_id: UUID | None = None
    installment_number: int | None = None
    account_id: UUID | None = None
    transfer_group_id: UUID | None = None


class Transaction(TransactionBase):
    id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime | None = None
    deleted_at: datetime.datetime | None = None
    category: Category | None = None

    model_config = ConfigDict(from_attributes=True)


class UnifiedTransactionResponse(BaseModel):
    id: UUID
    description: str | None = None
    amount: AmountDecimal
    nature: TransactionNature
    date: datetime.date
    category_name: str | None = None
    category_icon: str | None = None
    category_color: str | None = None
    category_is_system: bool = False
    is_transfer: bool = False
    installment_number: int | None = None
    account_name: str | None = None
    account_type: str | None = None
    # For transfers, we might want to know from/to names in the response
    from_account_name: str | None = None
    to_account_name: str | None = None
    # Recurring indicators
    is_recurring: bool = False
    recurring_type: str | None = None
    total_installments: int | None = None

    model_config = ConfigDict(from_attributes=True)
