from sqlalchemy.orm import Session
from sqlalchemy import extract, func, select
from app.models.transaction import Transaction
from app.models.income import Income
from app.models.investment import Investment
from app.models.category import Category, CategoryType
from app.schemas.summary import MonthlySummary, YearlySummary
from decimal import Decimal

class SummaryService:
    def get_monthly_summary(self, db: Session, year: int, month: int) -> MonthlySummary:
        # Total Income
        total_income = db.scalar(
            select(func.sum(Income.amount)).filter(
                extract('year', Income.date) == year,
                extract('month', Income.date) == month
            )
        ) or Decimal(0)

        # Total Expenses (Transactions where category.type == expense)
        total_expenses = db.scalar(
            select(func.sum(Transaction.amount)).join(Category).filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Category.type == CategoryType.expense,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        # Total Invested
        total_invested = db.scalar(
            select(func.sum(Investment.amount)).filter(
                extract('year', Investment.date) == year,
                extract('month', Investment.date) == month
            )
        ) or Decimal(0)

        # Expenses by category
        expenses_by_cat = db.execute(
            select(Category.name, func.sum(Transaction.amount))
            .join(Category)
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Category.type == CategoryType.expense,
                Transaction.deleted_at == None
            )
            .group_by(Category.name)
        ).all()

        expenses_by_category = {name: amount for name, amount in expenses_by_cat}

        balance = total_income - total_expenses - total_invested

        return MonthlySummary(
            total_income=total_income,
            total_expenses=total_expenses,
            total_invested=total_invested,
            balance=balance,
            expenses_by_category=expenses_by_category
        )

    def get_yearly_summary(self, db: Session, year: int) -> YearlySummary:
        # Total Income
        total_income = db.scalar(
            select(func.sum(Income.amount)).filter(
                extract('year', Income.date) == year
            )
        ) or Decimal(0)

        # Total Expenses
        total_expenses = db.scalar(
            select(func.sum(Transaction.amount)).join(Category).filter(
                extract('year', Transaction.date) == year,
                Category.type == CategoryType.expense,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        # Total Invested
        total_invested = db.scalar(
            select(func.sum(Investment.amount)).filter(
                extract('year', Investment.date) == year
            )
        ) or Decimal(0)

        balance = total_income - total_expenses - total_invested

        return YearlySummary(
            total_income=total_income,
            total_expenses=total_expenses,
            total_invested=total_invested,
            balance=balance
        )

summary_service = SummaryService()
