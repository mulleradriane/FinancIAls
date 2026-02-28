from pydantic import BaseModel, ConfigDict
from uuid import UUID
from decimal import Decimal
from typing import Optional

class CategoryOverrideBase(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    monthly_budget: Optional[Decimal] = None

class CategoryOverrideCreate(CategoryOverrideBase):
    pass

class CategoryOverride(CategoryOverrideBase):
    id: UUID
    user_id: UUID
    category_id: UUID

    model_config = ConfigDict(from_attributes=True)
