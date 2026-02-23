import pytest
import uuid
import os
from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.goal import Goal, GoalType
from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionNature
from app.services.analytics import analytics_service
from app.services.goals import goal_service
from app.schemas.goals import GoalCreate
import sqlalchemy as sa

# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_goals.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    # Mirror Views for SQLite
    db.execute(text("DROP VIEW IF EXISTS v_assets_liabilities;"))
    db.execute(text("DROP VIEW IF EXISTS v_net_worth;"))
    db.execute(text("DROP VIEW IF EXISTS v_account_balances;"))
    db.execute(text("DROP VIEW IF EXISTS v_goal_progress;"))

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
    CREATE VIEW v_net_worth AS
    SELECT COALESCE(SUM(current_balance), 0) AS net_worth FROM v_account_balances;
    """))

    db.execute(text("""
    CREATE VIEW v_goal_progress AS
    WITH current_nw AS (
        SELECT net_worth FROM v_net_worth
    )
    SELECT
        g.id,
        g.name,
        g.target_amount,
        g.goal_type,
        g.start_date,
        g.target_date,
        nw.net_worth AS current_amount,
        CASE
            WHEN g.target_amount > 0 THEN ROUND((CAST(nw.net_worth AS FLOAT) / CAST(g.target_amount AS FLOAT)) * 100, 2)
            ELSE 0
        END AS percentage_completed,
        CASE WHEN g.target_amount - nw.net_worth > 0 THEN g.target_amount - nw.net_worth ELSE 0 END AS remaining_amount,
        CASE WHEN julianday(g.target_date) - julianday('now', 'start of day') > 0 THEN CAST(julianday(g.target_date) - julianday('now', 'start of day') AS INTEGER) ELSE 0 END AS days_remaining,
        CASE
            WHEN date('now') < g.start_date THEN 1
            WHEN date('now') > g.target_date THEN nw.net_worth >= g.target_amount
            ELSE
                nw.net_worth >= (
                    g.target_amount * (
                        (julianday('now', 'start of day') - julianday(g.start_date)) /
                        NULLIF((julianday(g.target_date) - julianday(g.start_date)), 0)
                    )
                )
        END AS on_track
    FROM financial_goals g, current_nw nw
    WHERE g.deleted_at IS NULL;
    """))

    db.commit()
    db.close()

    yield

    if os.path.exists("./test_goals.db"):
        os.remove("./test_goals.db")

@pytest.fixture
def db():
    session = TestingSessionLocal()
    session.query(Goal).delete()
    session.query(Transaction).delete()
    session.query(Account).delete()
    session.commit()
    try:
        yield session
    finally:
        session.close()

def test_goal_crud(db):
    goal_in = GoalCreate(
        name="Test Goal",
        target_amount=Decimal("1000.00"),
        start_date=date.today(),
        target_date=date.today() + timedelta(days=30),
        goal_type=GoalType.SAVINGS
    )
    goal = goal_service.create_goal(db, goal_in)
    assert goal.name == "Test Goal"
    assert goal.id is not None

    goals = goal_service.get_goals(db)
    assert len(goals) == 1

    success = goal_service.delete_goal(db, goal.id)
    assert success is True

    goals = goal_service.get_goals(db)
    assert len(goals) == 0

def test_goal_date_validation():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        GoalCreate(
            name="Invalid Date",
            target_amount=Decimal("1000.00"),
            start_date=date.today(),
            target_date=date.today() - timedelta(days=1),
            goal_type=GoalType.SAVINGS
        )

def test_goal_progress_logic(db):
    # Setup account and net worth
    acc = Account(id=uuid.uuid4(), name="Bank", type=AccountType.banco, initial_balance=Decimal("500.00"), initial_balance_date=date.today())
    db.add(acc)
    db.commit()

    # 1. On Track Goal
    # Start today, target in 10 days, target 1000.
    # After 0 days, expected is 0. Current is 500. 500 >= 0 -> True.
    goal_in = GoalCreate(
        name="Goal 1",
        target_amount=Decimal("1000.00"),
        start_date=date.today(),
        target_date=date.today() + timedelta(days=10),
        goal_type=GoalType.SAVINGS
    )
    goal_service.create_goal(db, goal_in)

    progress = analytics_service.get_goals_progress(db)
    assert len(progress) == 1
    g1 = progress[0]
    assert g1.current_amount == Decimal("500.00")
    assert g1.percentage_completed == 50.0
    assert g1.on_track is True

def test_goal_behind_logic(db):
    # Setup account with 100
    acc = Account(id=uuid.uuid4(), name="Bank", type=AccountType.banco, initial_balance=Decimal("100.00"), initial_balance_date=date.today())
    db.add(acc)
    db.commit()

    # Start 10 days ago, target 10 days from now (total 20 days).
    # Progress expected after 10 days = 50% (10/20).
    # Target 1000. Expected 500. Current is 100. 100 < 500 -> Behind.
    goal = Goal(
        id=uuid.uuid4(),
        name="Goal Behind",
        target_amount=Decimal("1000.00"),
        start_date=date.today() - timedelta(days=10),
        target_date=date.today() + timedelta(days=10),
        goal_type=GoalType.SAVINGS
    )
    db.add(goal)
    db.commit()

    progress = analytics_service.get_goals_progress(db)
    g = progress[0]
    assert g.on_track is False

def test_goal_completed_logic(db):
    acc = Account(id=uuid.uuid4(), name="Bank", type=AccountType.banco, initial_balance=Decimal("1200.00"), initial_balance_date=date.today())
    db.add(acc)
    db.commit()

    goal = Goal(
        id=uuid.uuid4(),
        name="Goal Completed",
        target_amount=Decimal("1000.00"),
        start_date=date.today() - timedelta(days=20),
        target_date=date.today() - timedelta(days=5), # Already past
        goal_type=GoalType.SAVINGS
    )
    db.add(goal)
    db.commit()

    progress = analytics_service.get_goals_progress(db)
    g = progress[0]
    assert g.on_track is True
    assert g.percentage_completed > 100
    assert g.remaining_amount == 0
    assert g.days_remaining == 0

def test_goal_soft_delete_exclusion(db):
    goal = Goal(
        id=uuid.uuid4(),
        name="Deleted Goal",
        target_amount=Decimal("1000.00"),
        start_date=date.today(),
        target_date=date.today() + timedelta(days=10),
        deleted_at=datetime.now()
    )
    db.add(goal)
    db.commit()

    progress = analytics_service.get_goals_progress(db)
    assert len(progress) == 0
