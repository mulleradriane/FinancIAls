from typing import List, Optional
from uuid import UUID
import datetime
from sqlalchemy.orm import Session, joinedload, selectinload
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
            selectinload(RecurringExpense.transactions)
        ).filter(RecurringExpense.user_id == user_id, RecurringExpense.active == True)

        if category_type:
            query = query.join(Category).filter(Category.type == category_type)

        results = db.scalars(
            query.offset(skip).limit(limit)
        ).unique().all()

        # Update current_installment on the fly for display
        today = datetime.date.today()
        for r in results:
            if r.type == "installment":
                completed = len([t for t in r.transactions if t.date <= today and t.deleted_at is None])
                r.current_installment = completed

        return results

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
        from app.services.financial_engine import financial_engine
        from decimal import Decimal

        today = datetime.date.today()
        first_day_of_month = today.replace(day=1)
        import calendar
        last_day_of_month = today.replace(day=calendar.monthrange(today.year, today.month)[1])

        recurrings = db.scalars(
            select(RecurringExpense).options(
                selectinload(RecurringExpense.transactions)
            ).filter(RecurringExpense.user_id == user_id, RecurringExpense.active == True)
        ).unique().all()

        total_subscriptions = Decimal(0)
        total_installments = Decimal(0)

        subscriptions_paid = Decimal(0)
        subscriptions_total = Decimal(0)
        installments_paid = Decimal(0)
        installments_total = Decimal(0)

        for r in recurrings:
            # Monthly impact calculation
            if r.type == "subscription":
                total_subscriptions += r.amount

                # Current month performance
                # A subscription is "predicted" if it has a frequency that lands it in this month
                # For simplicity, we assume monthly subscriptions always land in the month.
                # Yearly subscriptions only if start_date month matches today's month.
                is_this_month = True
                if r.frequency == "yearly" and r.start_date.month != today.month:
                    is_this_month = False

                if is_this_month:
                    subscriptions_total += r.amount
                    # Paid if there is a transaction this month with date <= today
                    has_paid = any(first_day_of_month <= t.date <= today and t.deleted_at is None for t in r.transactions)
                    if has_paid:
                        subscriptions_paid += r.amount

            elif r.type == "installment":
                total_installments += r.amount

                # For installments, check which one falls into this month
                this_month_trans = [t for t in r.transactions if first_day_of_month <= t.date <= last_day_of_month and t.deleted_at is None]
                if this_month_trans:
                    installments_total += sum(abs(t.amount) for t in this_month_trans)
                    paid_trans = [t for t in this_month_trans if t.date <= today]
                    installments_paid += sum(abs(t.amount) for t in paid_trans)

        total_recurring = total_subscriptions + total_installments

        # Calculate average income from last 3 months
        avg_income = Decimal(0)
        for i in range(1, 4):
            # Calculate for previous 3 closed months
            d = first_day_of_month - datetime.timedelta(days=1) # Last day of previous month
            # Go back i-1 more months
            for _ in range(i-1):
                d = d.replace(day=1) - datetime.timedelta(days=1)

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
            "subscriptions_paid": subscriptions_paid,
            "subscriptions_total": subscriptions_total,
            "installments_paid": installments_paid,
            "installments_total": installments_total,
            "total_income": avg_income,
            "commitment_percentage": commitment_percentage
        }

recurring_expense = CRUDRecurringExpense(RecurringExpense)
