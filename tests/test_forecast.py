import pytest
from datetime import date, timedelta
from app.core.database import SessionLocal, engine, Base
from app.services.analytics import analytics_service
from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionNature
from sqlalchemy import text
from decimal import Decimal

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        # Clear tables for clean test
        session.execute(text("DELETE FROM transactions"))
        session.execute(text("DELETE FROM accounts"))
        session.commit()
        yield session
    finally:
        session.close()

def get_first_of_month(d):
    return d.replace(day=1)

def sub_months(d, m):
    # Rough but correct for 1st of month
    res = d.replace(day=1)
    for _ in range(m):
        res = (res - timedelta(days=1)).replace(day=1)
    return res

def create_test_data(db, initial_balance, monthly_net, months=3):
    account = Account(
        name="Test Account",
        type=AccountType.banco,
        initial_balance=Decimal(str(initial_balance)),
        initial_balance_date=date(2025, 1, 1) # Far enough in the past
    )
    db.add(account)
    db.commit()

    today = date.today()

    for i in range(1, months + 1):
        month_date = sub_months(today, i)

        if monthly_net >= 0:
            income = monthly_net
            expense = 0
        else:
            income = 0
            expense = monthly_net

        if income != 0:
            db.add(Transaction(
                description=f"Inc {i}",
                amount=Decimal(str(income)),
                nature=TransactionNature.INCOME,
                date=month_date + timedelta(days=5),
                account_id=account.id
            ))
        if expense != 0:
            db.add(Transaction(
                description=f"Exp {i}",
                amount=Decimal(str(expense)),
                nature=TransactionNature.EXPENSE,
                date=month_date + timedelta(days=10),
                account_id=account.id
            ))

    db.commit()
    return account

def test_forecast_positive_growth(db_session):
    # Initial 10000, monthly +2000 for 3 months.
    # Net worth = 10000 + 3*2000 = 16000.
    # Avg last 3 months = 2000.
    create_test_data(db_session, 10000, 2000, months=3)

    forecast = analytics_service.get_forecast(db_session)

    assert forecast.current_net_worth == Decimal("16000")
    assert forecast.avg_monthly_result_last_3m == Decimal("2000")
    assert forecast.projected_3m == Decimal("16000") + (Decimal("2000") * 3) # 22000
    assert forecast.months_until_zero is None

def test_forecast_negative_risk(db_session):
    # Initial 10000, monthly -2000 for 3 months.
    # Net worth = 10000 - 3*2000 = 4000.
    # Avg last 3 months = -2000.
    create_test_data(db_session, 10000, -2000, months=3)

    forecast = analytics_service.get_forecast(db_session)

    assert forecast.current_net_worth == Decimal("4000")
    assert forecast.avg_monthly_result_last_3m == Decimal("-2000")
    assert forecast.projected_3m == Decimal("4000") + (Decimal("-2000") * 3) # -2000
    # 4000 / 2000 = 2 months until zero
    assert forecast.months_until_zero == Decimal("2")

def test_forecast_stagnation(db_session):
    create_test_data(db_session, 5000, 0, months=3)
    forecast = analytics_service.get_forecast(db_session)
    assert forecast.avg_monthly_result_last_3m == Decimal("0")
    assert forecast.months_until_zero is None

def test_forecast_already_zero_with_negative_result(db_session):
    # Current net worth already negative
    create_test_data(db_session, 0, -1000, months=3)
    forecast = analytics_service.get_forecast(db_session)
    assert forecast.current_net_worth == Decimal("-3000")
    assert forecast.months_until_zero == Decimal("0")
    assert forecast.projected_date_of_zero == date.today()
