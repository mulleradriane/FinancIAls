from pydantic import BaseModel, ConfigDict
from uuid import UUID
from decimal import Decimal
from typing import Optional, List
from app.models.category import CategoryType

class CategoryBase(BaseModel):
    name: str
    type: CategoryType
    icon: str | None = None
    color: str | None = None
    is_system: bool = False
    monthly_budget: Decimal | None = None
    parent_id: UUID | None = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = None
    type: CategoryType | None = None
    icon: str | None = None
    color: str | None = None
    is_system: bool | None = None
    monthly_budget: Decimal | None = None
    parent_id: UUID | None = None

class Category(CategoryBase):
    id: UUID
    current_spending: Decimal = Decimal(0)
    has_override: bool = False
    # Subcategories are included when fetching the hierarchy
    subcategories: List['Category'] = []

    model_config = ConfigDict(from_attributes=True)

Category.model_rebuild()
