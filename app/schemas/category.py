from pydantic import BaseModel, ConfigDict
from uuid import UUID
from decimal import Decimal
from app.models.category import CategoryType

class CategoryBase(BaseModel):
    name: str
    type: CategoryType
    icon: str | None = None
    color: str | None = None
    is_system: bool = False
    monthly_budget: Decimal | None = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = None
    type: CategoryType | None = None
    icon: str | None = None
    color: str | None = None
    is_system: bool | None = None
    monthly_budget: Decimal | None = None

class Category(CategoryBase):
    id: UUID
    current_spending: Decimal = Decimal(0)
    has_override: bool = False

    model_config = ConfigDict(from_attributes=True)
