from pydantic import BaseModel, ConfigDict
from uuid import UUID
import datetime
from decimal import Decimal
from app.models.recurring_expense import FrequencyType, RecurringType
from app.schemas.category import Category

class RecurringExpenseBase(BaseModel):
    description: str
    category_id: UUID
    amount: Decimal
    type: RecurringType = RecurringType.subscription
    frequency: FrequencyType | None = None
    total_installments: int | None = None
    start_date: datetime.date
    active: bool = True
    account_id: UUID | None = None

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpenseUpdate(BaseModel):
    description: str | None = None
    category_id: UUID | None = None
    amount: Decimal | None = None
    type: RecurringType | None = None
    frequency: FrequencyType | None = None
    total_installments: int | None = None
    start_date: datetime.date | None = None
    active: bool | None = None

from app.schemas.transaction import Transaction

class RecurringExpense(RecurringExpenseBase):
    id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime | None = None
    category: Category | None = None
    transactions: list[Transaction] = []

    model_config = ConfigDict(from_attributes=True)

class RecurringSummary(BaseModel):
    total_recurring: Decimal
    total_subscriptions: Decimal
    total_installments: Decimal
    total_income: Decimal
    commitment_percentage: float
