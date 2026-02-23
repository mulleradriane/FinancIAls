from sqlalchemy.orm import Session
from sqlalchemy import extract, func, select
from app.models.transaction import Transaction, TransactionNature
from app.models.account import Account, AccountType
from app.models.balance_history import BalanceHistory
from app.models.category import Category, CategoryType
from app.crud.account import account as crud_account
from app.services.financial_engine import financial_engine
from app.schemas.summary import MonthlySummary, YearlySummary, DashboardData, DashboardChartData, CashFlowDay, TopTransaction, NetWorthData, NetWorthHistory, CashFlowSummary
from decimal import Decimal
from datetime import date, timedelta
from typing import List
from dateutil.relativedelta import relativedelta

class SummaryService:
    def get_monthly_summary(self, db: Session, year: int, month: int) -> MonthlySummary:
        totals = financial_engine.get_monthly_totals(db, year, month)
        total_income = totals["income"]
        total_expenses = totals["expense"]

        total_invested = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Transaction.nature == TransactionNature.INVESTMENT,
                Transaction.amount > 0,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        expenses_by_cat = db.execute(
            select(Category.name, func.sum(Transaction.amount))
            .join(Category)
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Transaction.amount < 0,
                Transaction.nature.notin_([
                    TransactionNature.TRANSFER,
                    TransactionNature.INVESTMENT,
                    TransactionNature.SYSTEM_ADJUSTMENT
                ]),
                Transaction.deleted_at == None
            )
            .group_by(Category.name)
        ).all()

        expenses_by_category = {name: abs(amount) for name, amount in expenses_by_cat}

        top_trans_query = (
            select(Transaction, Category.name.label('cat_name'))
            .join(Category)
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Transaction.amount < 0,
                Transaction.nature.notin_([
                    TransactionNature.TRANSFER,
                    TransactionNature.INVESTMENT,
                    TransactionNature.SYSTEM_ADJUSTMENT
                ]),
                Transaction.deleted_at == None
            )
            .order_by(Transaction.amount.asc())
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

        balance = totals["result"]

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
        prev_month_date = today - relativedelta(months=1)

        accounts = crud_account.get_multi_with_balance(db)
        available_balance = financial_engine.calculate_available_balance(db)

        net_worth_data = financial_engine.calculate_net_worth(db)
        total_net_worth = net_worth_data["net_worth"]

        monthly_summary = self.get_monthly_summary(db, today.year, today.month)
        prev_monthly_summary = self.get_monthly_summary(db, prev_month_date.year, prev_month_date.month)

        def calc_variation(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return float(((current - previous) / previous) * 100)

        income_variation = calc_variation(monthly_summary.total_income, prev_monthly_summary.total_income)
        expenses_variation = calc_variation(monthly_summary.total_expenses, prev_monthly_summary.total_expenses)
        balance_variation = calc_variation(monthly_summary.balance, prev_monthly_summary.balance)

        chart_data = []
        month_names_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

        for i in range(5, -1, -1):
            d = today - relativedelta(months=i)
            month_name = month_names_pt[d.month - 1]
            m_totals = financial_engine.get_monthly_totals(db, d.year, d.month)
            chart_data.append(DashboardChartData(
                month=month_name,
                income=abs(m_totals["income"]),
                expenses=abs(m_totals["expense"])
            ))

        return DashboardData(
            available_balance=available_balance,
            total_net_worth=total_net_worth,
            monthly_income=monthly_summary.total_income,
            monthly_expenses=monthly_summary.total_expenses,
            income_variation=income_variation,
            expenses_variation=expenses_variation,
            balance_variation=balance_variation,
            expenses_by_category=monthly_summary.expenses_by_category,
            chart_data=chart_data
        )

    def get_net_worth(self, db: Session) -> NetWorthData:
        accounts = crud_account.get_multi_with_balance(db)

        total_accounts = Decimal(0)
        total_investments = Decimal(0)
        total_debts = Decimal(0)
        total_assets = Decimal(0)
        total_liabilities = Decimal(0)

        allocation = {}

        for acc in accounts:
            type_label = acc.type.value
            allocation[type_label] = allocation.get(type_label, Decimal(0)) + acc.balance

            if acc.type in [AccountType.banco, AccountType.carteira, AccountType.poupanca]:
                total_accounts += acc.balance
            elif acc.type == AccountType.investimento:
                total_investments += acc.balance
            elif acc.type == AccountType.cartao_credito:
                total_debts += acc.balance

            if acc.balance > 0:
                total_assets += acc.balance
            else:
                total_liabilities += abs(acc.balance)

        history = []
        month_names_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        today = date.today()

        all_accounts = db.scalars(select(Account)).all()

        for i in range(5, -1, -1):
            d = today - relativedelta(months=i)
            last_day_of_month = (d + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

            total_at_date = Decimal(0)
            for acc in all_accounts:
                balance_at_date = db.scalar(
                    select(BalanceHistory.balance)
                    .filter(BalanceHistory.account_id == acc.id, BalanceHistory.date <= last_day_of_month)
                    .order_by(BalanceHistory.date.desc())
                    .limit(1)
                )

                if balance_at_date is None:
                    balance_at_date = Decimal(0)

                total_at_date += balance_at_date

            history.append(NetWorthHistory(
                month=month_names_pt[last_day_of_month.month - 1],
                value=total_at_date
            ))

        return NetWorthData(
            total_accounts=total_accounts,
            total_investments=total_investments,
            total_debts=total_debts,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            net_worth=total_assets - total_liabilities,
            allocation=allocation,
            history=history
        )

    def get_cash_flow(self, db: Session) -> List[CashFlowDay]:
        today = date.today()
        end_of_month = (today + relativedelta(months=1)).replace(day=1) - timedelta(days=1)

        accounts = crud_account.get_multi_with_balance(db)
        total_actual_balance = sum((acc.balance for acc in accounts), Decimal(0))

        # future_diff: sum of non-deleted transactions from today onwards
        future_diff = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(Transaction.deleted_at == None, Transaction.date >= today)
        ) or Decimal(0)

        current_balance = total_actual_balance - future_diff

        expenses = db.execute(
            select(Transaction.date, func.sum(Transaction.amount).label('amount'))
            .filter(
                Transaction.amount < 0,
                Transaction.nature.notin_([TransactionNature.TRANSFER, TransactionNature.INVESTMENT, TransactionNature.SYSTEM_ADJUSTMENT]),
                Transaction.deleted_at == None,
                Transaction.date >= today,
                Transaction.date <= end_of_month
            )
            .group_by(Transaction.date)
        ).all()

        daily_data = {}
        d = today
        while d <= end_of_month:
            daily_data[d] = {"income": Decimal(0), "expense": Decimal(0)}
            d += timedelta(days=1)

        trans_incomes = db.execute(
            select(Transaction.date, func.sum(Transaction.amount).label('amount'))
            .filter(
                Transaction.amount > 0,
                Transaction.nature.notin_([TransactionNature.TRANSFER, TransactionNature.INVESTMENT, TransactionNature.SYSTEM_ADJUSTMENT]),
                Transaction.deleted_at == None,
                Transaction.date >= today,
                Transaction.date <= end_of_month
            )
            .group_by(Transaction.date)
        ).all()
        for row in trans_incomes:
            daily_data[row.date]["income"] += row.amount

        for row in expenses:
            daily_data[row.date]["expense"] += abs(row.amount)

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
        total_income = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == year,
                Transaction.amount > 0,
                Transaction.nature.notin_([TransactionNature.TRANSFER, TransactionNature.INVESTMENT, TransactionNature.SYSTEM_ADJUSTMENT]),
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        total_expenses_signed = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == year,
                Transaction.amount < 0,
                Transaction.nature.notin_([TransactionNature.TRANSFER, TransactionNature.INVESTMENT, TransactionNature.SYSTEM_ADJUSTMENT]),
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        total_expenses = abs(total_expenses_signed)

        total_invested = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == year,
                Transaction.nature == TransactionNature.INVESTMENT,
                Transaction.amount > 0,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        balance = total_income + total_expenses_signed

        return YearlySummary(
            total_income=total_income,
            total_expenses=total_expenses,
            total_invested=total_invested,
            balance=balance
        )

    def get_cash_flow_summary(self, db: Session, months: int = 6) -> List[CashFlowSummary]:
        results = financial_engine.get_cash_flow_evolution(db, months)
        return [
            CashFlowSummary(
                month=r["month"],
                income=r["income"],
                expense=r["expense"],
                net=r["net"]
            ) for r in results
        ]

summary_service = SummaryService()
