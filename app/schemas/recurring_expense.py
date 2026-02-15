from pydantic import BaseModel, ConfigDict
from uuid import UUID
import datetime
from decimal import Decimal
from app.models.recurring_expense import FrequencyType
from app.schemas.category import Category

class RecurringExpenseBase(BaseModel):
    description: str
    category_id: UUID
    amount: Decimal
    frequency: FrequencyType
    start_date: datetime.date
    active: bool = True

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpenseUpdate(BaseModel):
    description: str | None = None
    category_id: UUID | None = None
    amount: Decimal | None = None
    frequency: FrequencyType | None = None
    start_date: datetime.date | None = None
    active: bool | None = None

class RecurringExpense(RecurringExpenseBase):
    id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime | None = None
    category: Category | None = None

    model_config = ConfigDict(from_attributes=True)
