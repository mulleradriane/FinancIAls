from typing import List, Optional, Union, Any, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.category_override import CategoryOverride
from app.schemas.category_override import CategoryOverrideCreate, CategoryOverrideBase

class CRUDCategoryOverride(CRUDBase[CategoryOverride, CategoryOverrideCreate, CategoryOverrideBase]):
    def get_by_user_and_category(self, db: Session, *, user_id: UUID, category_id: UUID) -> Optional[CategoryOverride]:
        return db.scalar(
            select(CategoryOverride).filter(
                CategoryOverride.user_id == user_id,
                CategoryOverride.category_id == category_id
            )
        )

    def get_all_for_user(self, db: Session, *, user_id: UUID) -> List[CategoryOverride]:
        return db.scalars(
            select(CategoryOverride).filter(CategoryOverride.user_id == user_id)
        ).all()

    def upsert(self, db: Session, *, user_id: UUID, category_id: UUID, obj_in: Union[CategoryOverrideCreate, Dict[str, Any]]) -> CategoryOverride:
        db_obj = self.get_by_user_and_category(db, user_id=user_id, category_id=category_id)

        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        # Filter only fields valid for CategoryOverride
        valid_fields = ["name", "icon", "color", "monthly_budget"]
        filtered_data = {k: v for k, v in update_data.items() if k in valid_fields}

        if db_obj:
            return self.update(db, db_obj=db_obj, obj_in=filtered_data)

        db_obj = CategoryOverride(**filtered_data, user_id=user_id, category_id=category_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, *, user_id: UUID, category_id: UUID) -> bool:
        db_obj = self.get_by_user_and_category(db, user_id=user_id, category_id=category_id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

def apply_override(category: Any, override: Optional[CategoryOverride]) -> dict:
    # Convert category to dict if it's an object
    if hasattr(category, "to_dict"):
        result = category.to_dict()
    elif hasattr(category, "__dict__"):
        result = {
            "id": category.id,
            "name": category.name,
            "type": category.type,
            "icon": category.icon,
            "color": category.color,
            "is_system": category.is_system,
            "monthly_budget": category.monthly_budget,
            "current_spending": getattr(category, "current_spending", 0)
        }
    else:
        result = dict(category)

    result["has_override"] = False

    if override:
        result["has_override"] = True
        if override.name is not None:
            result["name"] = override.name
        if override.icon is not None:
            result["icon"] = override.icon
        if override.color is not None:
            result["color"] = override.color
        if override.monthly_budget is not None:
            result["monthly_budget"] = override.monthly_budget

    return result

category_override = CRUDCategoryOverride(CategoryOverride)
