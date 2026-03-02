
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
    # 2. Recorrente futura (EXPENSE, recurring_expense_id != None, date > today)
    rec_id = uuid.uuid4()
    t2 = Transaction(
        id=uuid.uuid4(), description="Netflix", amount=Decimal("-40.00"),
        nature=TransactionNature.EXPENSE, date=last_day, account_id=acc_id, user_id=user_id,
        recurring_expense_id=rec_id
    )
    # 3. Receita esperada (INCOME, recurring_expense_id != None, all month)
    t3 = Transaction(
        id=uuid.uuid4(), description="Salary", amount=Decimal("1000.00"),
        nature=TransactionNature.INCOME, date=first_day, account_id=acc_id, user_id=user_id,
        recurring_expense_id=uuid.uuid4()
    )
    # 4. Expense already occurred but recurring (should be in gasto_ate_hoje, NOT in recorrentes_futuras)
    t4 = Transaction(
        id=uuid.uuid4(), description="Gym", amount=Decimal("-100.00"),
        nature=TransactionNature.EXPENSE, date=first_day, account_id=acc_id, user_id=user_id,
        recurring_expense_id=uuid.uuid4()
    )
    # 5. Non-recurring income (should NOT be in receita_esperada)
    t5 = Transaction(
        id=uuid.uuid4(), description="Gift", amount=Decimal("200.00"),
        nature=TransactionNature.INCOME, date=today, account_id=acc_id, user_id=user_id
    )

    db.add_all([t1, t2, t3, t4, t5])
    db.commit()

    commitment = analytics_service.get_monthly_commitment(db, user_id=user_id)

    # gasto_ate_hoje = abs(-50 + -100) = 150
    # recorrentes_futuras = abs(-40) = 40
    # receita_esperada = abs(1000) = 1000
    # percentual = (150 + 40) / 1000 * 100 = 19.0
    # saldo_projetado = 1000 - 150 - 40 = 810

    assert commitment.gasto_ate_hoje == Decimal("150.00")
    assert commitment.recorrentes_futuras == Decimal("40.00")
    assert commitment.receita_esperada == Decimal("1000.00")
    assert commitment.percentual_comprometido == 19.0
    assert commitment.saldo_projetado == Decimal("810.00")
