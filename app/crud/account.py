from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, delete
from app.crud.base import CRUDBase
from app.models.account import Account
from app.models.balance_history import BalanceHistory
from app.models.transaction import Transaction
from app.models.income import Income
from app.models.investment import Investment
from app.models.transfer import Transfer
from app.models.recurring_expense import RecurringExpense
from app.models.category import Category, CategoryType
from app.schemas.account import AccountCreate, AccountUpdate
from decimal import Decimal
from datetime import date

class CRUDAccount(CRUDBase[Account, AccountCreate, AccountUpdate]):
    def create(self, db: Session, *, obj_in: AccountCreate) -> Account:
        db_obj = Account(
            name=obj_in.name,
            type=obj_in.type,
            initial_balance=obj_in.initial_balance,
            initial_balance_date=obj_in.initial_balance_date or date.today()
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
                # Find adjustment category by name
                category = db.scalar(
                    select(Category).filter(Category.name == "Ajuste de Saldo")
                )

                # If for some reason it doesn't exist (e.g. fresh DB without migrations),
                # we create it as a system category.
                if not category:
                    category = Category(
                        name="Ajuste de Saldo",
                        type=CategoryType.income,
                        is_system=True
                    )
                    db.add(category)
                    db.commit()
                    db.refresh(category)

                if diff > 0:
                    adjustment = Transaction(
                        description="Ajuste de Saldo",
                        amount=diff,
                        date=date.today(),
                        category_id=category.id,
                        account_id=db_obj.id,
                        type="income"
                    )
                    db.add(adjustment)
                else:
                    # diff < 0, need an expense transaction
                    adjustment = Transaction(
                        description="Ajuste de Saldo",
                        amount=abs(diff),
                        date=date.today(),
                        category_id=category.id,
                        account_id=db_obj.id,
                        type="expense"
                    )
                    db.add(adjustment)

                db.commit()

        # Record history snapshot for the current state
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

    def get_with_balance(self, db: Session, id: UUID) -> Optional[Account]:
        account = db.get(Account, id)
        if account:
            account.balance = self.get_balance(db, id)
        return account

    def get_multi_with_balance(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Account]:
        accounts = db.scalars(
            select(Account)
            .offset(skip)
            .limit(limit)
        ).all()
        for account in accounts:
            account.balance = self.get_balance(db, account.id)
        return accounts

    def remove(self, db: Session, *, id: UUID) -> Optional[Account]:
        obj = db.get(Account, id)
        if obj:
            # Delete associated transfers
            db.execute(
                delete(Transfer).where(
                    or_(
                        Transfer.from_account_id == id,
                        Transfer.to_account_id == id
                    )
                )
            )
            # Delete associated recurring expenses
            db.execute(
                delete(RecurringExpense).where(RecurringExpense.account_id == id)
            )
            # Delete the account
            db.delete(obj)
            db.commit()
        return obj

    def get_balance(self, db: Session, account_id: UUID) -> Decimal:
        account = db.get(Account, account_id)
        if not account:
            return Decimal(0)

        initial_balance = account.initial_balance
        start_date = account.initial_balance_date

        incomes = db.scalar(
            select(func.sum(Income.amount))
            .filter(Income.account_id == account_id, Income.date >= start_date)
        ) or Decimal(0)

        expenses = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                Transaction.account_id == account_id,
                Transaction.deleted_at == None,
                Transaction.type == "expense",
                Transaction.date >= start_date
            )
        ) or Decimal(0)

        trans_income = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                Transaction.account_id == account_id,
                Transaction.deleted_at == None,
                Transaction.type == "income",
                Transaction.date >= start_date
            )
        ) or Decimal(0)

        investments = db.scalar(
            select(func.sum(Investment.amount))
            .filter(Investment.account_id == account_id, Investment.date >= start_date)
        ) or Decimal(0)

        transfers_to = db.scalar(
            select(func.sum(Transfer.amount))
            .filter(Transfer.to_account_id == account_id, Transfer.date >= start_date)
        ) or Decimal(0)

        transfers_from = db.scalar(
            select(func.sum(Transfer.amount))
            .filter(Transfer.from_account_id == account_id, Transfer.date >= start_date)
        ) or Decimal(0)

        return initial_balance + incomes + trans_income - expenses - investments + transfers_to - transfers_from

account = CRUDAccount(Account)
