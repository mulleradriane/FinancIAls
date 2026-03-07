
import pytest
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionNature
from app.models.recurring_expense import RecurringExpense, RecurringType
from app.models.category import Category, CategoryType
from app.services.transaction_service import create_unified_transaction
from app.schemas.transaction import UnifiedTransactionCreate

# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_atomic.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    import os
    if os.path.exists("./test_atomic.db"):
        os.remove("./test_atomic.db")

@pytest.fixture
def db():
    session = TestingSessionLocal()
    # Clean up
    session.query(Transaction).delete()
    session.query(RecurringExpense).delete()
    session.query(Account).delete()
    session.query(User).delete()
    session.query(Category).delete()
    session.commit()
    try:
        yield session
    finally:
        session.close()

def test_create_installment_atomic(db):
    # Setup user
    user_id = uuid.uuid4()
    user = User(id=user_id, username="testuser", display_name="Test User", hashed_password="pw")
    db.add(user)

    # Setup category
    cat = Category(id=uuid.uuid4(), name="Compra", type=CategoryType.expense, user_id=user_id)
    db.add(cat)

    # Setup account
    acc_id = uuid.uuid4()
    acc = Account(id=acc_id, name="Main", type=AccountType.banco, initial_balance=Decimal("1000.00"), initial_balance_date=date(2020, 1, 1), user_id=user_id)
    db.add(acc)
    db.commit()

    # Create installment transaction
    obj_in = UnifiedTransactionCreate(
        description="iPhone",
        category_id=cat.id,
        amount=Decimal("3000.00"),
        nature=TransactionNature.EXPENSE,
        date=date(2023, 1, 1),
        account_id=acc_id,
        is_recurring=True,
        recurring_type=RecurringType.installment,
        total_installments=3
    )

    first_trans = create_unified_transaction(db, obj_in, user_id)

    # Verify results
    assert first_trans.description == "iPhone (1/3)"
    assert first_trans.amount == Decimal("-1000.00")

    # Check if RecurringExpense was created
    rec = db.query(RecurringExpense).filter(RecurringExpense.user_id == user_id).first()
    assert rec is not None
    assert rec.total_installments == 3
    assert rec.amount == Decimal("3000.00")

    # Check if all 3 transactions were created
    transactions = db.query(Transaction).filter(Transaction.recurring_expense_id == rec.id).order_by(Transaction.date).all()
    assert len(transactions) == 3
    assert transactions[0].amount == Decimal("-1000.00")
    assert transactions[1].amount == Decimal("-1000.00")
    assert transactions[2].amount == Decimal("-1000.00")
    assert transactions[0].installment_number == 1
    assert transactions[1].installment_number == 2
    assert transactions[2].installment_number == 3

def test_create_installment_rounding_atomic(db):
    # Setup user
    user_id = uuid.uuid4()
    user = User(id=user_id, username="testuser", display_name="Test User", hashed_password="pw")
    db.add(user)

    # Setup category
    cat = Category(id=uuid.uuid4(), name="Compra", type=CategoryType.expense, user_id=user_id)
    db.add(cat)

    # Setup account
    acc_id = uuid.uuid4()
    acc = Account(id=acc_id, name="Main", type=AccountType.banco, initial_balance=Decimal("1000.00"), initial_balance_date=date(2020, 1, 1), user_id=user_id)
    db.add(acc)
    db.commit()

    # 100 / 3 = 33.33 + 33.33 + 33.33 = 99.99. Difference 0.01 should go to first installment.
    obj_in = UnifiedTransactionCreate(
        description="Rounding Test",
        category_id=cat.id,
        amount=Decimal("100.00"),
        nature=TransactionNature.EXPENSE,
        date=date(2023, 1, 1),
        account_id=acc_id,
        is_recurring=True,
        recurring_type=RecurringType.installment,
        total_installments=3
    )

    create_unified_transaction(db, obj_in, user_id)

    rec = db.query(RecurringExpense).filter(RecurringExpense.user_id == user_id).first()
    transactions = db.query(Transaction).filter(Transaction.recurring_expense_id == rec.id).order_by(Transaction.date).all()

    assert len(transactions) == 3
    assert transactions[0].amount == Decimal("-33.34")
    assert transactions[1].amount == Decimal("-33.33")
    assert transactions[2].amount == Decimal("-33.33")
    assert sum(t.amount for t in transactions) == Decimal("-100.00")
