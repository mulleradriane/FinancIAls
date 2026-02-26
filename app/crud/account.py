from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, delete
from app.crud.base import CRUDBase
from app.models.account import Account
from app.models.balance_history import BalanceHistory
from app.models.transaction import Transaction, TransactionNature
from app.models.recurring_expense import RecurringExpense
from app.models.category import Category, CategoryType
from app.schemas.account import AccountCreate, AccountUpdate
from decimal import Decimal
from datetime import date

class CRUDAccount(CRUDBase[Account, AccountCreate, AccountUpdate]):
    def create_with_user(self, db: Session, *, obj_in: AccountCreate, user_id: UUID) -> Account:
        db_obj = Account(
            name=obj_in.name,
            type=obj_in.type,
            initial_balance=obj_in.initial_balance,
            initial_balance_date=obj_in.initial_balance_date or date.today(),
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        balance = self.get_balance(db, db_obj.id)
        self._record_history(db, db_obj.id, balance)

        return db_obj

    def update(self, db: Session, *, db_obj: Account, obj_in: AccountUpdate | dict) -> Account:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        current_balance_input = update_data.pop("current_balance", None)

        updated_obj = super().update(db, db_obj=db_obj, obj_in=update_data)

        if current_balance_input is not None:
            actual_balance = self.get_balance(db, db_obj.id)
            diff = Decimal(str(current_balance_input)) - actual_balance

            if diff != 0:
                # System adjustment category is SHARED (no user_id)
                category = db.scalar(
                    select(Category).filter(
                        Category.name == "Ajuste de Saldo",
                        Category.is_system == True
                    )
                )

                if not category:
                    category = Category(
                        name="Ajuste de Saldo",
                        type=CategoryType.income,
                        is_system=True,
                        user_id=None
                    )
                    db.add(category)
                    db.commit()
                    db.refresh(category)

                adjustment = Transaction(
                    description="Ajuste de Saldo",
                    amount=diff,
                    date=date.today(),
                    category_id=category.id,
                    account_id=db_obj.id,
                    nature=TransactionNature.SYSTEM_ADJUSTMENT,
                    user_id=db_obj.user_id
                )
                db.add(adjustment)

                db.commit()

        new_balance = self.get_balance(db, db_obj.id)
        self._record_history(db, db_obj.id, new_balance)

        return updated_obj

    def _record_history(self, db: Session, account_id: UUID, balance: Decimal):
        today = date.today()
        history = db.scalar(
            select(BalanceHistory).filter(
                BalanceHistory.account_id == account_id,
                BalanceHistory.date == today
            )
        )
        if history:
            history.balance = balance
        else:
            history = BalanceHistory(
                account_id=account_id,
                balance=balance,
                date=today
            )
            db.add(history)
        db.commit()

    def get_with_balance(self, db: Session, id: UUID, user_id: UUID) -> Optional[Account]:
        account = self.get_by_user(db, id, user_id)
        if account:
            account.balance = self.get_balance(db, id)
        return account

    def get_multi_with_balance(self, db: Session, *, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Account]:
        accounts = self.get_multi_by_user(db, user_id=user_id, skip=skip, limit=limit)
        for account in accounts:
            account.balance = self.get_balance(db, account.id)
        return accounts

    def remove_by_user(self, db: Session, *, id: UUID, user_id: UUID) -> Optional[Account]:
        obj = self.get_by_user(db, id, user_id)
        if obj:
            db.execute(
                delete(RecurringExpense).where(RecurringExpense.account_id == id)
            )
            db.delete(obj)
            db.commit()
        return obj

    def get_balance(self, db: Session, account_id: UUID) -> Decimal:
        from app.services.financial_engine import financial_engine
        return financial_engine.get_account_balance(db, account_id)

account = CRUDAccount(Account)
