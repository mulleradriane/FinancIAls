from typing import List
from uuid import UUID
from difflib import SequenceMatcher
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.transaction import Transaction as TransactionModel, TransactionNature
from app.models.recurring_expense import RecurringExpense
from app.models.category import Category, CategoryType

def detect_recurring_matches(db: Session, user_id: UUID, transactions: List[TransactionModel]):
    # Get active recurring expenses for the user with their categories
    results = db.execute(
        select(RecurringExpense, Category)
        .join(Category, RecurringExpense.category_id == Category.id)
        .filter(
            RecurringExpense.user_id == user_id,
            RecurringExpense.active == True
        )
    ).all()

    recurring_data = [(re, cat) for re, cat in results]

    matches = []

    for tx in transactions:
        tx_month = tx.date.month
        tx_year = tx.date.year

        # Map transaction nature to category type for comparison
        tx_nature_mapped = None
        if tx.nature == TransactionNature.EXPENSE:
            tx_nature_mapped = CategoryType.expense
        elif tx.nature == TransactionNature.INCOME:
            tx_nature_mapped = CategoryType.income

        if not tx_nature_mapped:
            continue

        for re, cat in recurring_data:
            # 1. Nature check
            if tx_nature_mapped != cat.type:
                continue

            # 2. Amount check (float with 0.01 tolerance)
            # Use absolute values for comparison as transactions might be negative (EXPENSE)
            # while recurring expense master records might be stored as positive.
            if abs(abs(float(tx.amount)) - abs(float(re.amount))) > 0.01:
                continue

            # 3. Description check
            s1 = tx.description.lower().strip()
            s2 = re.description.lower().strip()

            similarity = SequenceMatcher(None, s1, s2).ratio()
            is_match = (s1 in s2 or s2 in s1) or (similarity >= 0.8)

            if not is_match:
                continue

            # 4. Month/Year check: ensure no transaction with this recurring_expense_id
            # already exists in the same month/year
            existing_tx = db.execute(
                select(TransactionModel.id)
                .filter(
                    TransactionModel.user_id == user_id,
                    TransactionModel.recurring_expense_id == re.id,
                    func.extract('month', TransactionModel.date) == tx_month,
                    func.extract('year', TransactionModel.date) == tx_year,
                    TransactionModel.deleted_at == None
                )
            ).scalar()

            if existing_tx:
                continue

            matches.append({
                "transaction_id": str(tx.id),
                "transaction_description": tx.description,
                "transaction_amount": abs(float(tx.amount)),
                "recurring_expense_id": str(re.id),
                "recurring_description": re.description,
                "recurring_amount": abs(float(re.amount)),
                "similarity": round(similarity, 2)
            })

    return matches
