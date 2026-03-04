import sys
import os
from datetime import date
from sqlalchemy import select, func

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.account import Account, AccountType
from app.models.transaction import Transaction, TransactionNature
from app.models.balance_history import BalanceHistory
from app.crud.transaction import transaction as crud_transaction
from app.schemas.transaction import TransactionCreate

def test_balance_history_update():
    # Setup: Use the dev database
    db = SessionLocal()
    try:
        # 1. Create a dummy user
        user = db.scalar(select(User).filter(User.username == "testuser"))
        if not user:
            user = User(username="testuser", hashed_password="pw")
            db.add(user)
            db.commit()
            db.refresh(user)

        # 2. Create an account
        account = Account(
            name="Test Account",
            type=AccountType.banco,
            initial_balance=1000,
            initial_balance_date=date(2024, 1, 1),
            user_id=user.id
        )
        db.add(account)
        db.commit()
        db.refresh(account)

        # Check if initial history was created (it's in CRUDAccount.create_with_user, but here I added manually)
        # Actually I should use CRUDAccount to test properly.
        from app.crud.account import account as crud_account
        from app.schemas.account import AccountCreate

        acc_in = AccountCreate(name="CRUD Account", type=AccountType.banco, initial_balance=2000)
        acc_obj = crud_account.create_with_user(db, obj_in=acc_in, user_id=user.id)

        history = db.scalar(select(BalanceHistory).filter(BalanceHistory.account_id == acc_obj.id, BalanceHistory.date == date.today()))
        assert history is not None
        assert history.balance == 2000
        print(f"Initial balance history recorded: {history.balance}")

        # 3. Create a transaction using CRUD
        trans_in = TransactionCreate(
            description="Test Trans",
            amount=-500,
            nature=TransactionNature.EXPENSE,
            date=date.today(),
            account_id=acc_obj.id
        )
        crud_transaction.create_with_user(db, obj_in=trans_in, user_id=user.id)

        db.refresh(history)
        print(f"Balance history after transaction: {history.balance}")
        assert history.balance == 1500

        # 4. Update transaction
        trans = db.scalar(select(Transaction).filter(Transaction.account_id == acc_obj.id))
        from app.schemas.transaction import TransactionUpdate
        crud_transaction.update(db, db_obj=trans, obj_in=TransactionUpdate(amount=-200))

        db.refresh(history)
        print(f"Balance history after update: {history.balance}")
        assert history.balance == 1800

        # 5. Delete transaction
        crud_transaction.remove_by_user(db, id=trans.id, user_id=user.id)
        db.refresh(history)
        print(f"Balance history after delete: {history.balance}")
        assert history.balance == 2000

        print("Backend Bug 2 Verification Successful!")

    finally:
        db.rollback() # Don't persist test data
        db.close()

if __name__ == "__main__":
    test_balance_history_update()
