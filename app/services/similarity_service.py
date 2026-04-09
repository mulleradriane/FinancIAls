from decimal import Decimal
from typing import List, Dict, Any
from uuid import UUID
from difflib import SequenceMatcher
from datetime import date
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

            # 2. Amount check (Decimal with 0.01 tolerance)
            # Use absolute values for comparison as transactions might be negative (EXPENSE)
            # while recurring expense master records might be stored as positive.
            if abs(abs(Decimal(str(tx.amount))) - abs(Decimal(str(re.amount)))) > Decimal("0.01"):
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
                "transaction_amount": abs(Decimal(str(tx.amount))),
                "recurring_expense_id": str(re.id),
                "recurring_description": re.description,
                "recurring_amount": abs(Decimal(str(re.amount))),
                "similarity": round(similarity, 2)
            })

    return matches


def check_recurring_for_preview(db: Session, user_id: UUID, parsed_rows) -> Dict[int, Dict[str, Any]]:
    """
    For each parsed row, check if it matches an active recurring expense
    that hasn't been linked yet in the same month/year.
    Returns a dict of {row_index: {recurring_description, similarity}}.
    """
    results = db.execute(
        select(RecurringExpense, Category)
        .join(Category, RecurringExpense.category_id == Category.id)
        .filter(RecurringExpense.user_id == user_id, RecurringExpense.active == True)
    ).all()

    recurring_data = [(re_obj, cat) for re_obj, cat in results]
    matches: Dict[int, Dict[str, Any]] = {}

    for row in parsed_rows:
        if row.nature == 'TRANSFER':
            continue

        for re_obj, cat in recurring_data:
            # Amount check (1% tolerance or R$0.02)
            row_abs = abs(Decimal(str(row.amount)))
            re_abs = abs(Decimal(str(re_obj.amount)))
            tolerance = max(Decimal("0.02"), re_abs * Decimal("0.01"))
            if abs(row_abs - re_abs) > tolerance:
                continue

            # Description similarity
            s1 = row.description.lower().strip()
            s2 = re_obj.description.lower().strip()
            similarity = SequenceMatcher(None, s1, s2).ratio()
            if not ((s1 in s2 or s2 in s1) or similarity >= 0.75):
                continue

            # Check if already linked in same month/year
            existing = db.execute(
                select(TransactionModel.id).filter(
                    TransactionModel.user_id == user_id,
                    TransactionModel.recurring_expense_id == re_obj.id,
                    func.extract('month', TransactionModel.date) == row.date.month,
                    func.extract('year', TransactionModel.date) == row.date.year,
                    TransactionModel.deleted_at == None,
                )
            ).scalar()

            if existing:
                continue

            matches[row.row_index] = {
                'recurring_description': re_obj.description,
                'similarity': round(similarity, 2),
            }
            break

    return matches
