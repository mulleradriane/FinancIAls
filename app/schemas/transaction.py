from __future__ import annotations
from pydantic import BaseModel, ConfigDict, condecimal
from uuid import UUID
import datetime
from decimal import Decimal
from app.schemas.category import Category
from app.models.recurring_expense import RecurringType, FrequencyType


# 🔹 Tipo decimal alinhado com o banco (Numeric(12,2))
AmountDecimal = condecimal(max_digits=12, decimal_places=2)


class TransactionBase(BaseModel):
    description: str
    category_id: UUID
    amount: AmountDecimal
    date: datetime.date
    recurring_expense_id: UUID | None = None
    installment_number: int | None = None
    account_id: UUID | None = None


class TransactionCreate(TransactionBase):
    pass


class UnifiedTransactionCreate(BaseModel):
    description: str
    category_id: UUID
    amount: AmountDecimal
    date: datetime.date
    account_id: UUID
    is_recurring: bool = False
    recurring_type: RecurringType | None = None
    frequency: FrequencyType | None = None
    total_installments: int | None = None


class TransactionUpdate(BaseModel):
    description: str | None = None
    category_id: UUID | None = None
    amount: AmountDecimal | None = None
    date: datetime.date | None = None
    recurring_expense_id: UUID | None = None
    installment_number: int | None = None


class Transaction(TransactionBase):
    id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime | None = None
    deleted_at: datetime.datetime | None = None
    category: Category | None = None

    model_config = ConfigDict(from_attributes=True)
