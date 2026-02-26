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
    def get_multi_by_user(
        self, db: Session, *, user_id: UUID, skip: int = 0, limit: int = 100, category_type: Optional[CategoryType] = None
    ) -> List[RecurringExpense]:
        query = select(self.model).options(
            joinedload(RecurringExpense.category),
            joinedload(RecurringExpense.transactions)
        ).filter(RecurringExpense.user_id == user_id, RecurringExpense.active == True)

        if category_type:
            query = query.join(Category).filter(Category.type == category_type)

        return db.scalars(
            query.offset(skip).limit(limit)
        ).unique().all()

    def remove_by_user(self, db: Session, *, id: UUID, user_id: UUID) -> Optional[RecurringExpense]:
        obj = self.get_by_user(db, id, user_id)
        if obj:
            # Delete ALL transactions associated with this recurring expense
            db.execute(
                delete(Transaction).where(Transaction.recurring_expense_id == id, Transaction.user_id == user_id)
            )
            # Delete the recurring expense itself
            db.delete(obj)
            db.commit()
        return obj

    def terminate_by_user(self, db: Session, *, id: UUID, user_id: UUID) -> Optional[RecurringExpense]:
        obj = self.get_by_user(db, id, user_id)
        if obj:
            # Delete only FUTURE transactions
            today = datetime.date.today()
            db.execute(
                delete(Transaction).where(
                    Transaction.recurring_expense_id == id,
                    Transaction.user_id == user_id,
                    Transaction.date > today
                )
            )
            # Mark as inactive
            obj.active = False
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def get_summary(self, db: Session, *, user_id: UUID) -> dict:
        from app.models.category import CategoryType
        from app.services.financial_engine import financial_engine
        from decimal import Decimal

        recurrings = db.scalars(
            select(RecurringExpense).filter(RecurringExpense.user_id == user_id, RecurringExpense.active == True)
        ).all()

        total_subscriptions = Decimal(0)
        total_installments = Decimal(0)

        for r in recurrings:
            if r.type == "subscription":
                # Convert annual to monthly for summary if needed, but usually we just sum what's in 'amount'
                # assuming 'amount' is the monthly impact.
                total_subscriptions += r.amount
            elif r.type == "installment":
                total_installments += r.amount

        total_recurring = total_subscriptions + total_installments

        # Calculate average income from last 3 months
        today = datetime.date.today()
        avg_income = Decimal(0)
        for i in range(1, 4):
            # Calculate for previous 3 closed months
            d = today - datetime.timedelta(days=today.day) # Last day of previous month
            for _ in range(i-1):
                d = d - datetime.timedelta(days=d.day)

            monthly = financial_engine.get_monthly_totals(db, d.year, d.month, user_id=user_id)
            avg_income += monthly["income"]

        avg_income = avg_income / 3 if avg_income > 0 else Decimal(0)

        commitment_percentage = 0
        if avg_income > 0:
            commitment_percentage = round((total_recurring / avg_income) * 100)

        return {
            "total_recurring": total_recurring,
            "total_subscriptions": total_subscriptions,
            "total_installments": total_installments,
            "commitment_percentage": commitment_percentage
        }

recurring_expense = CRUDRecurringExpense(RecurringExpense)
