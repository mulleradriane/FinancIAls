from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.crud.base import CRUDBase
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.income import Income
from app.models.investment import Investment
from app.models.transfer import Transfer
from app.models.category import Category, CategoryType
from app.schemas.account import AccountCreate, AccountUpdate
from decimal import Decimal

class CRUDAccount(CRUDBase[Account, AccountCreate, AccountUpdate]):
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

    def get_balance(self, db: Session, account_id: UUID) -> Decimal:
        incomes = db.scalar(
            select(func.sum(Income.amount))
            .filter(Income.account_id == account_id)
        ) or Decimal(0)

        expenses = db.scalar(
            select(func.sum(Transaction.amount))
            .join(Category)
            .filter(
                Transaction.account_id == account_id,
                Transaction.deleted_at == None,
                Category.type == CategoryType.expense
            )
        ) or Decimal(0)

        trans_income = db.scalar(
            select(func.sum(Transaction.amount))
            .join(Category)
            .filter(
                Transaction.account_id == account_id,
                Transaction.deleted_at == None,
                Category.type == CategoryType.income
            )
        ) or Decimal(0)

        investments = db.scalar(
            select(func.sum(Investment.amount))
            .filter(Investment.account_id == account_id)
        ) or Decimal(0)

        transfers_to = db.scalar(
            select(func.sum(Transfer.amount))
            .filter(Transfer.to_account_id == account_id)
        ) or Decimal(0)

        transfers_from = db.scalar(
            select(func.sum(Transfer.amount))
            .filter(Transfer.from_account_id == account_id)
        ) or Decimal(0)

        return incomes + trans_income - expenses - investments + transfers_to - transfers_from

account = CRUDAccount(Account)
