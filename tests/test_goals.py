import pytest
from datetime import date, timedelta
from app.models.goal import GoalType
from app.core.database import SessionLocal, engine, Base
from app.services.goals import goal_service
from app.schemas.goals import GoalCreate
from sqlalchemy import text
from pydantic import ValidationError
from decimal import Decimal

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        # Clear goals table for clean test
        session.execute(text("DELETE FROM financial_goals"))
        session.commit()
        yield session
    finally:
        session.close()

def test_create_goal_valid(db_session):
    goal_in = GoalCreate(
        name="Test Goal",
        target_amount=Decimal("1000.0"),
        start_date=date.today(),
        target_date=date.today() + timedelta(days=30),
        goal_type=GoalType.SAVINGS
    )
    goal = goal_service.create_goal(db_session, goal_in)
    assert goal.name == "Test Goal"
    assert goal.target_amount == Decimal("1000.0")

def test_create_goal_invalid_dates(db_session):
    with pytest.raises(ValidationError):
        GoalCreate(
            name="Invalid Date Goal",
            target_amount=Decimal("1000.0"),
            start_date=date.today(),
            target_date=date.today() - timedelta(days=1),
            goal_type=GoalType.SAVINGS
        )

def test_soft_delete_goal(db_session):
    goal_in = GoalCreate(
        name="Delete Me",
        target_amount=Decimal("500.0"),
        start_date=date.today(),
        target_date=date.today() + timedelta(days=10),
        goal_type=GoalType.SAVINGS
    )
    goal = goal_service.create_goal(db_session, goal_in)
    goal_id = str(goal.id)

    goal_service.delete_goal(db_session, goal.id)

    deleted_goal = goal_service.get_goal(db_session, goal.id)
    assert deleted_goal is None

    # Verify it's still in DB but has deleted_at
    # In SQLite, UUIDs might be stored as strings. We'll try both with and without hyphens if needed.
    # But usually SQLAlchemy's str(uuid) works.
    result = db_session.execute(
        text("SELECT deleted_at FROM financial_goals WHERE id = :id"),
        {"id": goal_id}
    ).fetchone()

    # If not found, try without hyphens
    if result is None:
        result = db_session.execute(
            text("SELECT deleted_at FROM financial_goals WHERE id = :id"),
            {"id": goal_id.replace("-", "")}
        ).fetchone()

    assert result is not None
    assert result[0] is not None

def test_v_goal_progress_logic(db_session):
    goal_in = GoalCreate(
        name="Progress Goal",
        target_amount=Decimal("10000.0"),
        start_date=date.today() - timedelta(days=10),
        target_date=date.today() + timedelta(days=10),
        goal_type=GoalType.SAVINGS
    )
    goal = goal_service.create_goal(db_session, goal_in)
    goal_id = str(goal.id)

    result = db_session.execute(
        text("SELECT * FROM v_goal_progress WHERE id = :id"),
        {"id": goal_id}
    ).fetchone()

    if result is None:
        result = db_session.execute(
            text("SELECT * FROM v_goal_progress WHERE id = :id"),
            {"id": goal_id.replace("-", "")}
        ).fetchone()

    assert result is not None
    # target_amount is index 2
    assert Decimal(str(result[2])) == Decimal("10000.0")

def test_goal_percentage_calculation(db_session):
    from app.models.account import Account, AccountType

    # Clean up
    db_session.execute(text("DELETE FROM transactions"))
    db_session.execute(text("DELETE FROM accounts"))
    db_session.commit()

    account = Account(
        name="Test Bank",
        type=AccountType.banco,
        initial_balance=Decimal("5000.0"),
        initial_balance_date=date.today() - timedelta(days=30)
    )
    db_session.add(account)
    db_session.commit()

    goal_in = GoalCreate(
        name="50% Goal",
        target_amount=Decimal("10000.0"),
        start_date=date.today() - timedelta(days=5),
        target_date=date.today() + timedelta(days=5),
        goal_type=GoalType.SAVINGS
    )
    goal = goal_service.create_goal(db_session, goal_in)
    goal_id = str(goal.id)

    result = db_session.execute(
        text("SELECT percentage_completed, on_track FROM v_goal_progress WHERE id = :id"),
        {"id": goal_id}
    ).fetchone()

    if result is None:
        result = db_session.execute(
            text("SELECT percentage_completed, on_track FROM v_goal_progress WHERE id = :id"),
            {"id": goal_id.replace("-", "")}
        ).fetchone()

    assert result is not None
    assert Decimal(str(result[0])) == Decimal("50.0")
    assert result[1] in [1, True]
