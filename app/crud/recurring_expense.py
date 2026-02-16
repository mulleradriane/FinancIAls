from typing import List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.recurring_expense import RecurringExpense
from app.schemas.recurring_expense import RecurringExpenseCreate, RecurringExpenseUpdate

class CRUDRecurringExpense(CRUDBase[RecurringExpense, RecurringExpenseCreate, RecurringExpenseUpdate]):
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[RecurringExpense]:
        return db.scalars(
            select(self.model)
            .options(joinedload(RecurringExpense.category), joinedload(RecurringExpense.transactions))
            .offset(skip)
            .limit(limit)
        ).unique().all()

recurring_expense = CRUDRecurringExpense(RecurringExpense)
