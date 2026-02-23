from sqlalchemy.orm import Session
from sqlalchemy import extract, func, select
from app.models.transaction import Transaction, TransactionNature
from app.models.account import Account, AccountType
from decimal import Decimal
from datetime import date
from typing import Dict, Any, List

class FinancialEngine:
    def get_account_balance(self, db: Session, account_id: Any) -> Decimal:
        """
        Calcula o saldo atual de uma conta:
        initial_balance + SUM(Transaction.amount)
        """
        account = db.get(Account, account_id)
        if not account:
            return Decimal(0)

        initial_balance = account.initial_balance
        start_date = account.initial_balance_date

        total_transactions = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                Transaction.account_id == account_id,
                Transaction.deleted_at == None,
                Transaction.date >= start_date
            )
        ) or Decimal(0)

        return initial_balance + total_transactions

    def calculate_available_balance(self, db: Session) -> Decimal:
        """
        Saldo Disponível (Liquidez): Somatório de contas Banco, Carteira e Poupança.
        """
        accounts = db.scalars(select(Account)).all()
        total = Decimal(0)
        liquid_types = [AccountType.banco, AccountType.carteira, AccountType.poupanca]
        for acc in accounts:
            if acc.type in liquid_types:
                total += self.get_account_balance(db, acc.id)
        return total

    def calculate_net_worth(self, db: Session) -> Dict[str, Decimal]:
        """
        Patrimônio Total: Total Ativos - Total Passivos
        Ativos: Banco, Carteira, Poupança, Investimento, Outros Ativos
        Passivos: Cartão de Crédito, Outros Passivos
        """
        accounts = db.scalars(select(Account)).all()

        assets = Decimal(0)
        liabilities = Decimal(0)

        asset_types = [
            AccountType.banco,
            AccountType.carteira,
            AccountType.poupanca,
            AccountType.investimento,
            AccountType.outros_ativos
        ]
        liability_types = [
            AccountType.cartao_credito,
            AccountType.outros_passivos
        ]

        for acc in accounts:
            balance = self.get_account_balance(db, acc.id)
            if acc.type in asset_types:
                assets += balance
            elif acc.type in liability_types:
                if balance < 0:
                    liabilities += abs(balance)
                else:
                    liabilities -= balance

        return {
            "assets": assets,
            "liabilities": liabilities,
            "net_worth": assets - liabilities
        }

    def get_monthly_totals(self, db: Session, year: int, month: int) -> Dict[str, Decimal]:
        """
        Calcula Totais do Mês: Receitas, Despesas e Resultado.
        """
        # Income
        income = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Transaction.nature == TransactionNature.INCOME,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        # Expense (valor absoluto para exibição)
        expense_sum = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Transaction.nature == TransactionNature.EXPENSE,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)

        return {
            "income": income,
            "expense": abs(expense_sum),
            "result": income + expense_sum  # income (pos) + expense (neg)
        }

    def calculate_operational_expenses(self, db: Session, year: int, month: int) -> Decimal:
        """
        Despesa Operacional: Somatório de nature == 'EXPENSE'
        """
        expense = db.scalar(
            select(func.sum(Transaction.amount))
            .filter(
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
                Transaction.nature == TransactionNature.EXPENSE,
                Transaction.deleted_at == None
            )
        ) or Decimal(0)
        return abs(expense)

    def get_cash_flow_evolution(self, db: Session, months: int = 6) -> List[Dict[str, Any]]:
        """
        Evolução do Fluxo de Caixa (Mês a Mês)
        Retorna: month, income, expense, net
        """
        from dateutil.relativedelta import relativedelta
        today = date.today()
        start_date = (today - relativedelta(months=months - 1)).replace(day=1)

        results = []
        for i in range(months - 1, -1, -1):
            d = today - relativedelta(months=i)
            totals = self.get_monthly_totals(db, d.year, d.month)
            results.append({
                "month": d.strftime("%Y-%m"),
                "income": totals["income"],
                "expense": totals["expense"],
                "net": totals["result"]
            })
        return results

financial_engine = FinancialEngine()
