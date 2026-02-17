from sqlalchemy.orm import Session
from sqlalchemy import extract, func, select
from app.models.transaction import Transaction
from app.models.income import Income
from app.models.investment import Investment
from app.models.category import Category, CategoryType
from app.schemas.summary import MonthlySummary, YearlySummary, DashboardData, DashboardChartData
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta

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

    def get_dashboard_data(self, db: Session) -> DashboardData:
        today = date.today()

        # Current Balance (Total Income - Total Expenses - Total Invested)
        total_income_all = db.scalar(select(func.sum(Income.amount))) or Decimal(0)
        total_expenses_all = db.scalar(
            select(func.sum(Transaction.amount))
            .join(Category)
            .filter(Category.type == CategoryType.expense, Transaction.deleted_at == None)
        ) or Decimal(0)
        total_invested_all = db.scalar(select(func.sum(Investment.amount))) or Decimal(0)

        current_balance = total_income_all - total_expenses_all - total_invested_all

        # Monthly Data
        monthly_summary = self.get_monthly_summary(db, today.year, today.month)

        # Chart Data (Last 6 months)
        chart_data = []
        month_names_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

        for i in range(5, -1, -1):
            d = today - relativedelta(months=i)
            month_name = month_names_pt[d.month - 1]

            # Monthly Income for this specific month
            m_income = db.scalar(
                select(func.sum(Income.amount)).filter(
                    extract('year', Income.date) == d.year,
                    extract('month', Income.date) == d.month
                )
            ) or Decimal(0)

            # Monthly Expenses for this specific month
            m_expenses = db.scalar(
                select(func.sum(Transaction.amount)).join(Category).filter(
                    extract('year', Transaction.date) == d.year,
                    extract('month', Transaction.date) == d.month,
                    Category.type == CategoryType.expense,
                    Transaction.deleted_at == None
                )
            ) or Decimal(0)

            chart_data.append(DashboardChartData(
                month=month_name,
                income=m_income,
                expenses=m_expenses
            ))

        return DashboardData(
            current_balance=current_balance,
            monthly_income=monthly_summary.total_income,
            monthly_expenses=monthly_summary.total_expenses,
            chart_data=chart_data
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
