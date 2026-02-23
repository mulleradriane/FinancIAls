import random
import uuid
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.account import Account, AccountType
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction, TransactionNature

def load_test_data(num_transactions=10000):
    db: Session = SessionLocal()

    # 1. Create Accounts
    account_types = [
        (AccountType.banco, "Banco Principal"),
        (AccountType.carteira, "Carteira"),
        (AccountType.poupanca, "Poupança"),
        (AccountType.investimento, "Corretora"),
        (AccountType.cartao_credito, "Cartão de Crédito"),
    ]
    accounts = []
    for acc_type, name in account_types:
        acc = Account(
            id=uuid.uuid4(),
            name=name,
            type=acc_type,
            initial_balance=Decimal(random.randint(0, 5000)),
            initial_balance_date=date.today() - timedelta(days=200)
        )
        db.add(acc)
        accounts.append(acc)

    # 2. Create Categories
    categories = []
    cat_names = [
        ("Salário", CategoryType.income),
        ("Bônus", CategoryType.income),
        ("Alimentação", CategoryType.expense),
        ("Transporte", CategoryType.expense),
        ("Lazer", CategoryType.expense),
        ("Saúde", CategoryType.expense),
        ("Educação", CategoryType.expense),
        ("Investimento", CategoryType.expense), # Category name, but nature will be INVESTMENT
    ]
    for name, ctype in cat_names:
        cat = Category(
            id=uuid.uuid4(),
            name=name,
            type=ctype,
            is_system=False
        )
        db.add(cat)
        categories.append(cat)

    db.commit()

    # 3. Create Transactions
    natures = [
        TransactionNature.INCOME,
        TransactionNature.EXPENSE,
        TransactionNature.INVESTMENT,
        TransactionNature.TRANSFER
    ]

    start_date = date.today() - timedelta(days=180)

    print(f"Generating {num_transactions} transactions...")

    for i in range(num_transactions):
        nature = random.choices(natures, weights=[10, 70, 10, 10])[0]
        acc = random.choice(accounts)
        cat = random.choice(categories)

        trans_date = start_date + timedelta(days=random.randint(0, 180))
        amount = Decimal(random.uniform(10, 1000)).quantize(Decimal("0.01"))

        if nature == TransactionNature.INCOME:
            signed_amount = amount
        elif nature == TransactionNature.EXPENSE:
            signed_amount = -amount
        elif nature == TransactionNature.INVESTMENT:
            # Dual entry for investment usually involves a transfer or expense
            # Simplified: just one entry for this test
            signed_amount = -amount if acc.type != AccountType.investimento else amount
        elif nature == TransactionNature.TRANSFER:
            signed_amount = -amount # Simplified
        else:
            signed_amount = -amount

        trans = Transaction(
            id=uuid.uuid4(),
            description=f"Transaction {i}",
            category_id=cat.id,
            account_id=acc.id,
            amount=signed_amount,
            nature=nature,
            date=trans_date
        )
        db.add(trans)

        if i % 1000 == 0:
            db.commit()
            print(f"Progress: {i}/{num_transactions}")

    db.commit()
    print("Finished generating test data.")
    db.close()

if __name__ == "__main__":
    load_test_data()
