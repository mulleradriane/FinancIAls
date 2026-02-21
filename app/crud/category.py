from typing import Any, Dict, Union
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate

class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    def create(self, db: Session, *, obj_in: CategoryCreate) -> Category:
        # Prevent manual creation of category with system-reserved name (case-insensitive)
        if obj_in.name.strip().lower() == "ajuste de saldo":
            raise HTTPException(
                status_code=400,
                detail="A categoria 'Ajuste de Saldo' é reservada ao sistema."
            )

        # Prevent setting is_system via API
        obj_in_data = obj_in.model_dump()
        obj_in_data["is_system"] = False

        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: Category, obj_in: Union[CategoryUpdate, Dict[str, Any]]
    ) -> Category:
        if db_obj.is_system:
            raise HTTPException(
                status_code=400,
                detail="Categorias de sistema não podem ser editadas."
            )

        # Check if they are trying to rename another category to "Ajuste de Saldo" (case-insensitive)
        if isinstance(obj_in, dict):
            name = obj_in.get("name")
            is_system = obj_in.get("is_system")
        else:
            name = obj_in.name
            is_system = obj_in.is_system

        if name and name.strip().lower() == "ajuste de saldo":
            raise HTTPException(
                status_code=400,
                detail="O nome 'Ajuste de Saldo' é reservado ao sistema."
            )

        # Prevent setting is_system via API
        if isinstance(obj_in, dict):
            if "is_system" in obj_in:
                obj_in["is_system"] = False
        else:
            obj_in.is_system = False

        return super().update(db, db_obj=db_obj, obj_in=obj_in)

    def remove(self, db: Session, *, id: Any) -> Category:
        obj = db.query(Category).get(id)
        if obj and obj.is_system:
            raise HTTPException(
                status_code=400,
                detail="Categorias de sistema não podem ser removidas."
            )
        return super().remove(db, id=id)

category = CRUDCategory(Category)
