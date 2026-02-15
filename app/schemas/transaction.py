from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from uuid import UUID
import datetime
from decimal import Decimal
from app.models.transaction import NecessityType
from app.schemas.category import Category

class TransactionBase(BaseModel):
    description: str
    location: str | None = None
    category_id: UUID
    amount: Decimal
    date: datetime.date
    necessity: NecessityType
    payment_method: str

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    description: str | None = None
    location: str | None = None
    category_id: UUID | None = None
    amount: Decimal | None = None
    date: datetime.date | None = None
    necessity: NecessityType | None = None
    payment_method: str | None = None

class Transaction(TransactionBase):
    id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime | None = None
    deleted_at: datetime.datetime | None = None
    category: Category | None = None

    model_config = ConfigDict(from_attributes=True)
