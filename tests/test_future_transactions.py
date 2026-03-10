import pytest
import uuid
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.account import Account, AccountType
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction, TransactionNature
from app.crud.transaction import transaction as crud_transaction
from app.schemas.transaction import TransactionCreate

# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_future.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    import os
    if os.path.exists("./test_future.db"):
        os.remove("./test_future.db")

@pytest.fixture
def db():
    session = TestingSessionLocal()
    # Clean up in order of dependencies
    session.query(Transaction).delete()
    session.query(Category).delete()
    session.query(Account).delete()
    session.query(User).delete()
    session.commit()
    try:
        yield session
    finally:
        session.close()

def test_get_unified_filters_future_transactions(db):
    # Setup user
    user_id = uuid.uuid4()
    user = User(id=user_id, username="testuser", display_name="Test User", hashed_password="pw")
    db.add(user)
    db.commit()

    # Setup: Create a past transaction and a future transaction
    today = date.today()
    past_date = today - timedelta(days=1)
    future_date = today + timedelta(days=1)

    account_id = uuid.uuid4()
    account = Account(
        id=account_id,
        name="Test Account",
        type=AccountType.banco,
        user_id=user_id,
        initial_balance=Decimal("1000.00"),
        initial_balance_date=past_date
    )
    db.add(account)

    category_id = uuid.uuid4()
    category = Category(
        id=category_id,
        name="Test Category",
        type=CategoryType.expense,
        user_id=user_id,
        icon="💰",
        color="#000000"
    )
    db.add(category)
    db.commit()

    crud_transaction.create_with_user(
        db,
        obj_in=TransactionCreate(
            description="Past Transaction",
            amount=Decimal("-10.00"),
            nature=TransactionNature.EXPENSE,
            date=past_date,
            account_id=account_id,
            category_id=category_id
        ),
        user_id=user_id
    )

    crud_transaction.create_with_user(
        db,
        obj_in=TransactionCreate(
            description="Future Transaction",
            amount=Decimal("-20.00"),
            nature=TransactionNature.EXPENSE,
            date=future_date,
            account_id=account_id,
            category_id=category_id
        ),
        user_id=user_id
    )

    # Test 1: include_future=False (default)
    result = crud_transaction.get_unified(db, user_id=user_id, include_future=False)
    items = result["items"]
    descriptions = [t.description for t in items]
    assert "Past Transaction" in descriptions
    assert "Future Transaction" not in descriptions
    assert len(items) == 1
    # Check totals (expense should be 10.00, but amount is stored as negative)
    # Backend returns Decimal or float? Read crud says Decimal("0.00")
    assert result["total_expense"] == Decimal("-10.00")
    assert result["total_income"] == Decimal("0.00")

    # Test 2: include_future=True
    result = crud_transaction.get_unified(db, user_id=user_id, include_future=True)
    items = result["items"]
    descriptions = [t.description for t in items]
    assert "Past Transaction" in descriptions
    assert "Future Transaction" in descriptions
    assert len(items) == 2
    # Check totals (10 + 20 = 30)
    assert result["total_expense"] == Decimal("-30.00")
    assert result["total_income"] == Decimal("0.00")
