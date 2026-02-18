from typing import List, Optional
from uuid import UUID
import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, delete
from app.crud.base import CRUDBase
from app.models.recurring_expense import RecurringExpense
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction
from app.schemas.recurring_expense import RecurringExpenseCreate, RecurringExpenseUpdate

class CRUDRecurringExpense(CRUDBase[RecurringExpense, RecurringExpenseCreate, RecurringExpenseUpdate]):
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, category_type: Optional[CategoryType] = None
    ) -> List[RecurringExpense]:
        query = select(self.model).options(
            joinedload(RecurringExpense.category),
            joinedload(RecurringExpense.transactions)
        ).filter(RecurringExpense.active == True)

        if category_type:
            query = query.join(Category).filter(Category.type == category_type)

        return db.scalars(
            query.offset(skip).limit(limit)
        ).unique().all()

    def remove(self, db: Session, *, id: UUID) -> Optional[RecurringExpense]:
        obj = db.get(self.model, id)
        if obj:
            # Delete ALL transactions associated with this recurring expense
            db.execute(
                delete(Transaction).where(Transaction.recurring_expense_id == id)
            )
            # Delete the recurring expense itself
            db.delete(obj)
            db.commit()
        return obj

    def terminate(self, db: Session, *, id: UUID) -> Optional[RecurringExpense]:
        obj = db.get(self.model, id)
        if obj:
            # Delete only FUTURE transactions
            today = datetime.date.today()
            db.execute(
                delete(Transaction).where(
                    Transaction.recurring_expense_id == id,
                    Transaction.date > today
                )
            )
            # Mark as inactive
            obj.active = False
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

recurring_expense = CRUDRecurringExpense(RecurringExpense)
