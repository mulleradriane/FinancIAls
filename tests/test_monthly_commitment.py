
import pytest
import uuid
from datetime import date, datetime
from decimal import Decimal
import pytz
import calendar
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionNature
from app.models.recurring_expense import RecurringExpense, RecurringType, FrequencyType
from app.models.category import Category, CategoryType
from app.services.analytics import analytics_service

# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_commitment.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    import os
    if os.path.exists("./test_commitment.db"):
        os.remove("./test_commitment.db")

@pytest.fixture
def db():
    session = TestingSessionLocal()
    # Clean up
    session.query(Transaction).delete()
    session.query(Account).delete()
    session.query(User).delete()
    session.commit()
    try:
        yield session
    finally:
        session.close()

def test_get_monthly_commitment(db):
    # Setup user
    user_id = uuid.uuid4()
    user = User(id=user_id, username="testuser", display_name="Test User", hashed_password="pw")
    db.add(user)

    # Setup categories
    cat_income = Category(id=uuid.uuid4(), name="Salário", type=CategoryType.income, user_id=user_id)
    cat_expense = Category(id=uuid.uuid4(), name="Despesa", type=CategoryType.expense, user_id=user_id)
    db.add_all([cat_income, cat_expense])

    # Setup account
    acc_id = uuid.uuid4()
    acc = Account(id=acc_id, name="Main", type=AccountType.banco, initial_balance=Decimal("0.00"), initial_balance_date=date(2020, 1, 1), user_id=user_id)
    db.add(acc)
    db.commit()

    tz = pytz.timezone("America/Sao_Paulo")
    now = datetime.now(tz)
    today = now.date()
    first_day = today.replace(day=1)
    _, last_day_num = calendar.monthrange(today.year, today.month)
    last_day = today.replace(day=last_day_num)

    # 1. Gasto até hoje (EXPENSE, date <= today)
    t1 = Transaction(
        id=uuid.uuid4(), description="Lunch", amount=Decimal("-50.00"),
        nature=TransactionNature.EXPENSE, date=today, account_id=acc_id, user_id=user_id
    )

    # 2. Recorrência futura (EXPENSE, start_date > hoje)
    future_day = min(today.day + 5, last_day_num)
    rec_expense = RecurringExpense(
        id=uuid.uuid4(), description="Netflix", amount=Decimal("40.00"),
        category_id=cat_expense.id, type=RecurringType.subscription, frequency=FrequencyType.monthly,
        start_date=first_day.replace(day=future_day), user_id=user_id, active=True
    )

    # 3. Recorrência de receita (INCOME)
    rec_income = RecurringExpense(
        id=uuid.uuid4(), description="Salary", amount=Decimal("1000.00"),
        category_id=cat_income.id, type=RecurringType.subscription, frequency=FrequencyType.monthly,
        start_date=first_day, user_id=user_id, active=True
    )

    # 4. Expense already occurred but recurring (should be in gasto_ate_hoje, NOT in recorrentes_futuras)
    past_day = max(today.day - 5, 1)
    t4 = Transaction(
        id=uuid.uuid4(), description="Gym", amount=Decimal("-100.00"),
        nature=TransactionNature.EXPENSE, date=first_day.replace(day=past_day), account_id=acc_id, user_id=user_id,
        recurring_expense_id=uuid.uuid4()
    )

    # 5. Non-recurring income (should NOT be in receita_esperada)
    t5 = Transaction(
        id=uuid.uuid4(), description="Gift", amount=Decimal("200.00"),
        nature=TransactionNature.INCOME, date=today, account_id=acc_id, user_id=user_id
    )

    db.add_all([t1, rec_expense, rec_income, t4, t5])
    db.commit()

    commitment = analytics_service.get_monthly_commitment(db, user_id=user_id)

    # gasto_ate_hoje = abs(-50 + -100) = 150
    # recorrentes_futuras = 40 (Netflix has day > today)
    # receita_esperada = 1000 (Salary)
    # percentual = (150 + 40) / 1000 * 100 = 19.0
    # saldo_projetado = 1000 - 150 - 40 = 810

    assert commitment.gasto_ate_hoje == Decimal("150.00")
    assert commitment.recorrentes_futuras == Decimal("40.00")
    assert commitment.receita_esperada == Decimal("1000.00")
    assert commitment.percentual_comprometido == 19.0
    assert commitment.saldo_projetado == Decimal("810.00")
