from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.models.category import CategoryType

class CategoryBase(BaseModel):
    name: str
    type: CategoryType
    icon: str | None = None
    color: str | None = None
    is_system: bool = False

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = None
    type: CategoryType | None = None
    icon: str | None = None
    color: str | None = None
    is_system: bool | None = None

class Category(CategoryBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
