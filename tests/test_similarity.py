import pytest
from uuid import uuid4
from datetime import date
from sqlalchemy.orm import Session
from app.models.transaction import Transaction, TransactionNature
from app.models.recurring_expense import RecurringExpense, RecurringType
from app.models.category import Category, CategoryType
from app.services.similarity_service import detect_recurring_matches
from app.core.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup temporary SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    import os
    if os.path.exists("./test.db"):
        os.remove("./test.db")

def test_detect_recurring_matches(db: Session):
    user_id = uuid4()

    # Setup Category
    category = Category(
        id=uuid4(),
        name="Insurance",
        type=CategoryType.expense,
        user_id=user_id
    )
    db.add(category)

    # Setup Recurring Expense
    recurring = RecurringExpense(
        id=uuid4(),
        description="HDI Seguros",
        category_id=category.id,
        amount=89.00,
        type=RecurringType.subscription,
        start_date=date(2023, 1, 1),
        active=True,
        user_id=user_id
    )
    db.add(recurring)
    db.commit()

    # Test Transaction 1: Exact Match
    tx1 = Transaction(
        id=uuid4(),
        description="HDI Seguros",
        amount=-89.00,
        nature=TransactionNature.EXPENSE,
        date=date(2023, 5, 15),
        user_id=user_id,
        category_id=category.id
    )

    # Test Transaction 2: Similar Description
    tx2 = Transaction(
        id=uuid4(),
        description="HDI SEGUROS SA",
        amount=-89.00,
        nature=TransactionNature.EXPENSE,
        date=date(2023, 6, 10),
        user_id=user_id,
        category_id=category.id
    )

    # Test Transaction 3: Different Amount
    tx3 = Transaction(
        id=uuid4(),
        description="HDI Seguros",
        amount=-90.00,
        nature=TransactionNature.EXPENSE,
        date=date(2023, 7, 5),
        user_id=user_id,
        category_id=category.id
    )

    # Test Transaction 4: Already Linked in Month
    linked_tx = Transaction(
        id=uuid4(),
        description="HDI Seguros",
        amount=-89.00,
        nature=TransactionNature.EXPENSE,
        date=date(2023, 8, 1),
        user_id=user_id,
        category_id=category.id,
        recurring_expense_id=recurring.id
    )
    db.add(linked_tx)
    db.commit()

    tx4 = Transaction(
        id=uuid4(),
        description="HDI Seguros",
        amount=-89.00,
        nature=TransactionNature.EXPENSE,
        date=date(2023, 8, 20),
        user_id=user_id,
        category_id=category.id
    )

    transactions = [tx1, tx2, tx3, tx4]
    matches = detect_recurring_matches(db, user_id, transactions)

    assert len(matches) == 2

    # Match 1 (tx1)
    match1 = next(m for m in matches if m["transaction_id"] == str(tx1.id))
    assert match1["recurring_expense_id"] == str(recurring.id)
    assert match1["similarity"] == 1.0

    # Match 2 (tx2)
    match2 = next(m for m in matches if m["transaction_id"] == str(tx2.id))
    assert match2["recurring_expense_id"] == str(recurring.id)
    assert match2["similarity"] >= 0.8

    # Ensure tx3 and tx4 are NOT in matches
    transaction_ids_in_matches = [m["transaction_id"] for m in matches]
    assert str(tx3.id) not in transaction_ids_in_matches
    assert str(tx4.id) not in transaction_ids_in_matches
