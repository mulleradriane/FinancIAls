from sqlalchemy.orm import Session
from sqlalchemy import extract, func, select
from app.models.transaction import Transaction
from app.models.income import Income
from app.models.investment import Investment
from app.models.account import AccountType
from app.models.category import Category, CategoryType
from app.crud.account import account as crud_account
from app.schemas.summary import MonthlySummary, YearlySummary, DashboardData, DashboardChartData, CashFlowDay, TopTransaction, NetWorthData, NetWorthHistory
from decimal import Decimal
from datetime import date, timedelta
from typing import List
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

        # Transações de Receita (Transaction with category.type == income)
        total_income += db.scalar(
            select(func.sum(Transaction.amount)).join(Category).filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Category.type == CategoryType.income,
                Transaction.deleted_at == None
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

        # Top 5 transactions
        top_trans_query = (
            select(Transaction, Category.name.label('cat_name'))
            .join(Category)
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Category.type == CategoryType.expense,
                Transaction.deleted_at == None
            )
            .order_by(Transaction.amount.desc())
            .limit(5)
        )
        top_trans_results = db.execute(top_trans_query).all()
        top_transactions = [
            TopTransaction(
                description=row.Transaction.description,
                amount=row.Transaction.amount,
                date=row.Transaction.date,
                category_name=row.cat_name
            ) for row in top_trans_results
        ]

        balance = total_income - total_expenses - total_invested

        return MonthlySummary(
            total_income=total_income,
            total_expenses=total_expenses,
            total_invested=total_invested,
            balance=balance,
            expenses_by_category=expenses_by_category,
            top_transactions=top_transactions
        )

    def get_dashboard_data(self, db: Session) -> DashboardData:
        today = date.today()

        # Current Balance (Soma dos saldos de todas as contas)
        accounts = crud_account.get_multi_with_balance(db)
        current_balance = sum((acc.balance for acc in accounts), Decimal(0))

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

    def get_net_worth(self, db: Session) -> NetWorthData:
        accounts = crud_account.get_multi_with_balance(db)

        total_accounts = Decimal(0)
        total_investments = Decimal(0)
        total_debts = Decimal(0)

        for acc in accounts:
            if acc.type in [AccountType.wallet, AccountType.bank, AccountType.savings]:
                total_accounts += acc.balance
            elif acc.type == AccountType.investment:
                total_investments += acc.balance
            elif acc.type == AccountType.credit_card:
                total_debts += acc.balance

        # Legacy investments
        total_legacy_investments = db.scalar(select(func.sum(Investment.amount))) or Decimal(0)
        total_investments += total_legacy_investments

        # Historical data (Last 6 months)
        history = []
        month_names_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        today = date.today()

        for i in range(5, -1, -1):
            d = today - relativedelta(months=i)
            last_day = (d + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

            h_income = db.scalar(select(func.sum(Income.amount)).filter(Income.date <= last_day)) or Decimal(0)
            h_expenses = db.scalar(
                select(func.sum(Transaction.amount))
                .join(Category)
                .filter(Category.type == CategoryType.expense, Transaction.deleted_at == None, Transaction.date <= last_day)
            ) or Decimal(0)

            history.append(NetWorthHistory(
                month=month_names_pt[last_day.month - 1],
                value=h_income - h_expenses
            ))

        return NetWorthData(
            total_accounts=total_accounts,
            total_investments=total_investments,
            total_debts=total_debts,
            net_worth=total_accounts + total_investments + total_debts,
            history=history
        )

    def get_cash_flow(self, db: Session) -> List[CashFlowDay]:
        today = date.today()
        end_of_month = (today + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

        accounts = crud_account.get_multi_with_balance(db)
        total_actual_balance = sum((acc.balance for acc in accounts), Decimal(0))

        # Para o fluxo de caixa, precisamos do saldo no início de hoje.
        # Subtraímos tudo o que está no banco de hoje em diante para encontrar o ponto de partida.
        future_income = db.scalar(select(func.sum(Income.amount)).filter(Income.date >= today)) or Decimal(0)
        future_trans_income = db.scalar(
            select(func.sum(Transaction.amount))
            .join(Category)
            .filter(Category.type == CategoryType.income, Transaction.deleted_at == None, Transaction.date >= today)
        ) or Decimal(0)
        future_expenses = db.scalar(
            select(func.sum(Transaction.amount))
            .join(Category)
            .filter(Category.type == CategoryType.expense, Transaction.deleted_at == None, Transaction.date >= today)
        ) or Decimal(0)
        future_investments = db.scalar(select(func.sum(Investment.amount)).filter(Investment.date >= today)) or Decimal(0)

        current_balance = total_actual_balance - future_income - future_trans_income + future_expenses + future_investments

        incomes = db.execute(
            select(Income.date, func.sum(Income.amount).label('amount'))
            .filter(Income.date >= today, Income.date <= end_of_month)
            .group_by(Income.date)
        ).all()

        expenses = db.execute(
            select(Transaction.date, func.sum(Transaction.amount).label('amount'))
            .join(Category)
            .filter(Category.type == CategoryType.expense, Transaction.deleted_at == None, Transaction.date >= today, Transaction.date <= end_of_month)
            .group_by(Transaction.date)
        ).all()

        investments = db.execute(
            select(Investment.date, func.sum(Investment.amount).label('amount'))
            .filter(Investment.date >= today, Investment.date <= end_of_month)
            .group_by(Investment.date)
        ).all()

        daily_data = {}
        d = today
        while d <= end_of_month:
            daily_data[d] = {"income": Decimal(0), "expense": Decimal(0)}
            d += timedelta(days=1)

        for row in incomes:
            daily_data[row.date]["income"] += row.amount

        # Também incluir transações do tipo 'income' que não estão no modelo Income
        trans_incomes = db.execute(
            select(Transaction.date, func.sum(Transaction.amount).label('amount'))
            .join(Category)
            .filter(Category.type == CategoryType.income, Transaction.deleted_at == None, Transaction.date >= today, Transaction.date <= end_of_month)
            .group_by(Transaction.date)
        ).all()
        for row in trans_incomes:
            daily_data[row.date]["income"] += row.amount

        for row in expenses:
            daily_data[row.date]["expense"] += row.amount
        for row in investments:
            daily_data[row.date]["expense"] += row.amount

        cash_flow = []
        running_balance = current_balance

        for d in sorted(daily_data.keys()):
            day_income = daily_data[d]["income"]
            day_expense = daily_data[d]["expense"]
            running_balance += day_income - day_expense

            if day_income != 0 or day_expense != 0 or d == today:
                cash_flow.append(CashFlowDay(
                    date=d,
                    income=day_income,
                    expense=day_expense,
                    balance=running_balance
                ))

        return cash_flow

    def get_yearly_summary(self, db: Session, year: int) -> YearlySummary:
        total_income = db.scalar(select(func.sum(Income.amount)).filter(extract('year', Income.date) == year)) or Decimal(0)
        total_expenses = db.scalar(
            select(func.sum(Transaction.amount)).join(Category).filter(
                extract('year', Transaction.date) == year,
                Category.type == CategoryType.expense,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)
        total_invested = db.scalar(select(func.sum(Investment.amount)).filter(extract('year', Investment.date) == year)) or Decimal(0)

        balance = total_income - total_expenses - total_invested

        return YearlySummary(
            total_income=total_income,
            total_expenses=total_expenses,
            total_invested=total_invested,
            balance=balance
        )

summary_service = SummaryService()
