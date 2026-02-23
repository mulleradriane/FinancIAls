import pytest
import uuid
import os
import subprocess
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.account import Account, AccountType
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction, TransactionNature
from app.services.analytics import analytics_service
import sqlalchemy as sa

# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_analytics.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    # Views logic mirror (SQLite compatible)
    db.execute(text("DROP VIEW IF EXISTS v_assets_liabilities;"))
    db.execute(text("DROP VIEW IF EXISTS v_net_worth;"))
    db.execute(text("DROP VIEW IF EXISTS v_burn_rate;"))
    db.execute(text("DROP VIEW IF EXISTS v_savings_rate;"))
    db.execute(text("DROP VIEW IF EXISTS v_operational_monthly;"))
    db.execute(text("DROP VIEW IF EXISTS v_account_balances;"))

    db.execute(text("""
    CREATE VIEW v_account_balances AS
    SELECT
        a.id,
        a.type,
        a.initial_balance +
        COALESCE(
            SUM(
                CASE
                    WHEN t.date >= a.initial_balance_date
                     AND t.deleted_at IS NULL
                    THEN t.amount
                    ELSE 0
                END
            ), 0
        ) AS current_balance
    FROM accounts a
    LEFT JOIN transactions t ON a.id = t.account_id
    GROUP BY a.id, a.type, a.initial_balance, a.initial_balance_date;
    """))

    db.execute(text("""
    CREATE VIEW v_operational_monthly AS
    SELECT
        strftime('%Y-%m-01', date) AS month,
        SUM(CASE WHEN nature = 'INCOME' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN nature = 'EXPENSE' THEN -amount ELSE 0 END) AS total_expense,
        SUM(
            CASE
                WHEN nature IN ('INCOME','EXPENSE')
                THEN amount
                ELSE 0
            END
        ) AS net_result
    FROM transactions
    WHERE deleted_at IS NULL
    GROUP BY 1;
    """))

    db.execute(text("""
    CREATE VIEW v_savings_rate AS
    SELECT
        month,
        total_income,
        total_expense,
        net_result,
        CASE
            WHEN total_income > 0
            THEN ROUND(CAST(net_result AS FLOAT) / CAST(total_income AS FLOAT), 4)
            ELSE 0
        END AS savings_rate
    FROM v_operational_monthly;
    """))

    db.execute(text("""
    CREATE VIEW v_burn_rate AS
    SELECT
        COALESCE(AVG(total_expense), 0) AS avg_monthly_expense_last_3m
    FROM v_operational_monthly
    WHERE month >= date('now', 'start of month', '-3 months')
      AND month < date('now', 'start of month');
    """))

    db.execute(text("""
    CREATE VIEW v_net_worth AS
    SELECT COALESCE(SUM(current_balance), 0) AS net_worth FROM v_account_balances;
    """))

    db.execute(text("""
    CREATE VIEW v_assets_liabilities AS
    SELECT
        CASE
            WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                THEN 'asset'
            WHEN type IN ('cartao_credito','outros_passivos')
                THEN 'liability'
            ELSE 'other'
        END AS classification,
        SUM(
            CASE
                WHEN type IN ('banco','investimento','carteira','poupanca','outros_ativos')
                    THEN current_balance
                WHEN type IN ('cartao_credito','outros_passivos')
                    THEN -current_balance
                ELSE 0
            END
        ) AS total
    FROM v_account_balances
    GROUP BY 1;
    """))

    db.commit()
    db.close()

    yield

    if os.path.exists("./test_analytics.db"):
        os.remove("./test_analytics.db")

@pytest.fixture
def db():
    session = TestingSessionLocal()
    session.query(Transaction).delete()
    session.query(Account).delete()
    session.commit()
    try:
        yield session
    finally:
        session.close()

def test_accounting_consistency(db):
    acc_id1 = uuid.uuid4()
    acc_id2 = uuid.uuid4()
    acc_asset = Account(
        id=acc_id1, name="Bank", type=AccountType.banco,
        initial_balance=Decimal("1000.00"), initial_balance_date=date.today()
    )
    acc_liability = Account(
        id=acc_id2, name="Card", type=AccountType.cartao_credito,
        initial_balance=Decimal("0.00"), initial_balance_date=date.today()
    )
    db.add_all([acc_asset, acc_liability])
    db.commit()

    t1 = Transaction(id=uuid.uuid4(), description="S", amount=Decimal("2000.00"), nature=TransactionNature.INCOME, date=date.today(), account_id=acc_id1)
    t2 = Transaction(id=uuid.uuid4(), description="E", amount=Decimal("-500.00"), nature=TransactionNature.EXPENSE, date=date.today(), account_id=acc_id1)
    t3 = Transaction(id=uuid.uuid4(), description="D", amount=Decimal("-300.00"), nature=TransactionNature.EXPENSE, date=date.today(), account_id=acc_id2)
    db.add_all([t1, t2, t3])
    db.commit()

    net_worth = analytics_service.get_net_worth(db)
    assets_liabilities = analytics_service.get_assets_liabilities(db)

    assert net_worth == Decimal("2200.00")
    assets = sum(al.total for al in assets_liabilities if al.classification == 'asset')
    liabilities = sum(al.total for al in assets_liabilities if al.classification == 'liability')
    assert assets == Decimal("2500.00")
    assert liabilities == Decimal("300.00")
    assert assets - liabilities == net_worth

def test_deleted_at_exclusion(db):
    acc_id = uuid.uuid4()
    acc = Account(id=acc_id, name="B", type=AccountType.banco, initial_balance=Decimal("1000.00"), initial_balance_date=date.today())
    db.add(acc)
    db.commit()

    t1 = Transaction(id=uuid.uuid4(), description="Valid", amount=Decimal("500.00"), nature=TransactionNature.INCOME, date=date.today(), account_id=acc_id)
    t2 = Transaction(id=uuid.uuid4(), description="Deleted", amount=Decimal("1000.00"), nature=TransactionNature.INCOME, date=date.today(), account_id=acc_id, deleted_at=sa.func.now())
    db.add_all([t1, t2])
    db.commit()

    balances = analytics_service.get_account_balances(db)
    acc_balance = next(b for b in balances if b.id.replace("-", "") == acc_id.hex)
    assert acc_balance.current_balance == Decimal("1500.00")

def test_initial_balance_date_respect(db):
    past_date = date.today() - timedelta(days=10)
    today = date.today()
    acc_id = uuid.uuid4()
    acc = Account(id=acc_id, name="B", type=AccountType.banco, initial_balance=Decimal("1000.00"), initial_balance_date=today)
    db.add(acc)
    db.commit()

    t_past = Transaction(id=uuid.uuid4(), description="Past", amount=Decimal("500.00"), nature=TransactionNature.INCOME, date=past_date, account_id=acc_id)
    t_today = Transaction(id=uuid.uuid4(), description="Today", amount=Decimal("200.00"), nature=TransactionNature.INCOME, date=today, account_id=acc_id)
    db.add_all([t_past, t_today])
    db.commit()

    balances = analytics_service.get_account_balances(db)
    acc_balance = next(b for b in balances if b.id.replace("-", "") == acc_id.hex)
    assert acc_balance.current_balance == Decimal("1200.00")

def test_investment_exclusion_from_operational(db):
    acc_id = uuid.uuid4()
    acc = Account(id=acc_id, name="B", type=AccountType.banco, initial_balance=Decimal("0.00"), initial_balance_date=date(2024,1,1))
    db.add(acc)
    db.commit()

    t_inc = Transaction(id=uuid.uuid4(), description="I", amount=Decimal("1000.00"), nature=TransactionNature.INCOME, date=date(2024, 1, 15), account_id=acc_id)
    t_exp = Transaction(id=uuid.uuid4(), description="E", amount=Decimal("-400.00"), nature=TransactionNature.EXPENSE, date=date(2024, 1, 20), account_id=acc_id)
    t_inv = Transaction(id=uuid.uuid4(), description="Inv", amount=Decimal("-500.00"), nature=TransactionNature.INVESTMENT, date=date(2024, 1, 25), account_id=acc_id)
    db.add_all([t_inc, t_exp, t_inv])
    db.commit()

    monthly = analytics_service.get_operational_monthly(db)
    jan = next(m for m in monthly if m.month == date(2024,1,1))
    assert jan.total_income == Decimal("1000.00")
    assert jan.total_expense == Decimal("400.00")
    assert jan.net_result == Decimal("600.00")

def test_burn_rate_three_months_exclusion(db):
    acc_id = uuid.uuid4()
    acc = Account(id=acc_id, name="B", type=AccountType.banco, initial_balance=Decimal("0.00"), initial_balance_date=date(2023,1,1))
    db.add(acc)
    db.commit()

    today = date.today()
    first_of_current = today.replace(day=1)

    m1 = (first_of_current - timedelta(days=15)).replace(day=1)
    m2 = (m1 - timedelta(days=15)).replace(day=1)
    m3 = (m2 - timedelta(days=15)).replace(day=1)

    t_curr = Transaction(id=uuid.uuid4(), description="Curr", amount=Decimal("-1000.00"), nature=TransactionNature.EXPENSE, date=today, account_id=acc_id)
    t1 = Transaction(id=uuid.uuid4(), description="M1", amount=Decimal("-300.00"), nature=TransactionNature.EXPENSE, date=m1 + timedelta(days=5), account_id=acc_id)
    t2 = Transaction(id=uuid.uuid4(), description="M2", amount=Decimal("-600.00"), nature=TransactionNature.EXPENSE, date=m2 + timedelta(days=5), account_id=acc_id)
    t3 = Transaction(id=uuid.uuid4(), description="M3", amount=Decimal("-900.00"), nature=TransactionNature.EXPENSE, date=m3 + timedelta(days=5), account_id=acc_id)

    db.add_all([t_curr, t1, t2, t3])
    db.commit()

    burn_rate_data = analytics_service.get_burn_rate(db)
    assert burn_rate_data["avg_monthly_expense_last_3m"] == Decimal("600.00")
