from typing import Any, Dict, Union, List, Optional
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func, text
from app.crud.base import CRUDBase
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction, TransactionNature
from app.schemas.category import CategoryCreate, CategoryUpdate
from decimal import Decimal

class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    def create_with_user(self, db: Session, *, obj_in: CategoryCreate, user_id: UUID) -> Category:
        # Prevent manual creation of category with system-reserved name (case-insensitive)
        if obj_in.name.strip().lower() == "ajuste de saldo":
            raise HTTPException(
                status_code=400,
                detail="A categoria 'Ajuste de Saldo' é reservada ao sistema."
            )

        # Prevent setting is_system via API
        obj_in_data = obj_in.model_dump()
        obj_in_data["is_system"] = False

        db_obj = self.model(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_user(self, db: Session, id: UUID, user_id: UUID) -> Optional[Category]:
        return db.scalar(
            select(Category).filter(
                Category.id == id,
                or_(Category.user_id == user_id, Category.is_system == True)
            )
        )

    def get_multi_by_user(self, db: Session, *, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Category]:
        categories = db.scalars(
            select(Category)
            .filter(or_(Category.user_id == user_id, Category.is_system == True))
            .order_by(Category.is_system.desc(), Category.name)
            .offset(skip)
            .limit(limit)
        ).all()

        # Calculate current spending for each category
        # Filter: nature=EXPENSE, non-deleted, current month in America/Sao_Paulo
        spending_query = select(
            Transaction.category_id,
            func.sum(func.abs(Transaction.amount)).label("total")
        ).filter(
            Transaction.user_id == user_id,
            Transaction.nature == TransactionNature.EXPENSE,
            Transaction.deleted_at == None,
            func.date_trunc('month', Transaction.date.op('AT TIME ZONE')('America/Sao_Paulo')) ==
            func.date_trunc('month', func.now().op('AT TIME ZONE')('America/Sao_Paulo'))
        ).group_by(Transaction.category_id)

        spending_results = db.execute(spending_query).all()
        spending_map = {row.category_id: row.total for row in spending_results}

        for cat in categories:
            cat.current_spending = spending_map.get(cat.id, Decimal(0))

        return categories

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
        else:
            name = obj_in.name

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
            if hasattr(obj_in, 'is_system'):
                obj_in.is_system = False

        return super().update(db, db_obj=db_obj, obj_in=obj_in)

    def remove_by_user(self, db: Session, *, id: UUID, user_id: UUID) -> Category:
        obj = self.get_by_user(db, id, user_id)
        if not obj:
            return None
        if obj.is_system:
            raise HTTPException(
                status_code=400,
                detail="Categorias de sistema não podem ser removidas."
            )
        return super().remove(db, id=id)

category = CRUDCategory(Category)
