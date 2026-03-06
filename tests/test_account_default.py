import pytest
from uuid import uuid4
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.account import Account, AccountType
from app.schemas.account import AccountCreate
from app.crud.account import account as crud_account
from app.models.user import User

# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_accounts.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_user(db):
    user = User(id=uuid4(), username=f"test_{uuid4()}", hashed_password="hashed")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_create_first_account_sets_default(db, test_user):
    account_in = AccountCreate(
        name="First Account",
        type=AccountType.banco,
        initial_balance=Decimal("100"),
        initial_balance_date="2024-01-01"
    )
    account = crud_account.create_with_user(db, obj_in=account_in, user_id=test_user.id)
    assert account.is_default is True

def test_create_second_account_not_default(db, test_user):
    # Create first
    account_in1 = AccountCreate(name="1", type=AccountType.banco, initial_balance=Decimal("0"), initial_balance_date="2024-01-01")
    crud_account.create_with_user(db, obj_in=account_in1, user_id=test_user.id)

    # Create second
    account_in2 = AccountCreate(name="2", type=AccountType.banco, initial_balance=Decimal("0"), initial_balance_date="2024-01-01")
    account2 = crud_account.create_with_user(db, obj_in=account_in2, user_id=test_user.id)

    assert account2.is_default is False

def test_set_default_account(db, test_user):
    account_in1 = AccountCreate(name="1", type=AccountType.banco, initial_balance=Decimal("0"), initial_balance_date="2024-01-01")
    acc1 = crud_account.create_with_user(db, obj_in=account_in1, user_id=test_user.id)

    account_in2 = AccountCreate(name="2", type=AccountType.banco, initial_balance=Decimal("0"), initial_balance_date="2024-01-01")
    acc2 = crud_account.create_with_user(db, obj_in=account_in2, user_id=test_user.id)

    assert acc1.is_default is True
    assert acc2.is_default is False

    crud_account.set_default(db, account_id=acc2.id, user_id=test_user.id)

    db.refresh(acc1)
    db.refresh(acc2)

    assert acc1.is_default is False
    assert acc2.is_default is True
