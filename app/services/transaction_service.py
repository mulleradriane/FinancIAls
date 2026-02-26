from sqlalchemy.orm import Session
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
import uuid
from app.crud.transaction import transaction as crud_transaction
from app.crud.recurring_expense import recurring_expense as crud_recurring_expense
from app.schemas.transaction import UnifiedTransactionCreate, TransactionCreate
from app.schemas.recurring_expense import RecurringExpenseCreate
from app.models.recurring_expense import RecurringType
from app.models.transaction import TransactionNature
from uuid import UUID

def create_unified_transaction(db: Session, obj_in: UnifiedTransactionCreate, user_id: UUID):
    if not obj_in.is_recurring:
        # Handle Transfer and Investment (Dual Entry)
        if obj_in.nature in [TransactionNature.TRANSFER, TransactionNature.INVESTMENT] and obj_in.to_account_id:
            group_id = uuid.uuid4()

            # 1. Outflow (Source Account)
            source_in = TransactionCreate(
                description=obj_in.description,
                category_id=obj_in.category_id,
                amount=-abs(obj_in.amount), # Ensure negative
                nature=obj_in.nature,
                date=obj_in.date,
                account_id=obj_in.account_id,
                transfer_group_id=group_id
            )
            source_trans = crud_transaction.create_with_user(db, obj_in=source_in, user_id=user_id)

            # 2. Inflow (Destination Account)
            dest_in = TransactionCreate(
                description=obj_in.description,
                category_id=obj_in.category_id,
                amount=abs(obj_in.amount), # Ensure positive
                nature=obj_in.nature,
                date=obj_in.date,
                account_id=obj_in.to_account_id,
                transfer_group_id=group_id
            )
            crud_transaction.create_with_user(db, obj_in=dest_in, user_id=user_id)

            return source_trans

        # Normal transaction (Income, Expense, System Adjustment)
        # For Income, ensure amount is positive. For Expense, ensure it is negative.
        final_amount = obj_in.amount
        if obj_in.nature == TransactionNature.EXPENSE:
            final_amount = -abs(obj_in.amount)
        elif obj_in.nature == TransactionNature.INCOME:
            final_amount = abs(obj_in.amount)

        transaction_in = TransactionCreate(
            description=obj_in.description,
            category_id=obj_in.category_id,
            amount=final_amount,
            nature=obj_in.nature,
            date=obj_in.date,
            account_id=obj_in.account_id
        )
        return crud_transaction.create_with_user(db, obj_in=transaction_in, user_id=user_id)

    # Calculate end_date for installments
    end_date = None
    if obj_in.recurring_type == RecurringType.installment and obj_in.total_installments:
        end_date = obj_in.date + relativedelta(months=obj_in.total_installments - 1)

    # Create RecurringExpense master record
    recurring_in = RecurringExpenseCreate(
        description=obj_in.description,
        category_id=obj_in.category_id,
        amount=obj_in.amount,
        type=obj_in.recurring_type,
        frequency=obj_in.frequency,
        total_installments=obj_in.total_installments,
        current_installment=1 if obj_in.recurring_type == RecurringType.installment else None,
        start_date=obj_in.date,
        end_date=end_date,
        active=True,
        account_id=obj_in.account_id
    )
    db_recurring = crud_recurring_expense.create_with_user(db, obj_in=recurring_in, user_id=user_id)

    # Create associated transactions
    if obj_in.recurring_type == RecurringType.installment:
        num_installments = obj_in.total_installments or 1
        # Treat input amount as TOTAL value and divide it
        total_amount = Decimal(str(obj_in.amount))

        # Calculate base installment amount rounded to 2 decimal places
        base_installment = (total_amount / Decimal(str(num_installments))).quantize(Decimal("0.00"))

        # Calculate the difference due to rounding
        total_calculated = base_installment * Decimal(str(num_installments))
        difference = total_amount - total_calculated

        first_transaction = None
        for i in range(1, num_installments + 1):
            # Add the difference to the first installment
            current_installment_amount = base_installment
            if i == 1:
                current_installment_amount += difference

            # Calculate date for each installment (monthly)
            installment_date = obj_in.date + relativedelta(months=i-1)
            transaction_in = TransactionCreate(
                description=f"{obj_in.description} ({i}/{num_installments})",
                category_id=obj_in.category_id,
                amount=-abs(current_installment_amount), # Recurring usually expense
                nature=obj_in.nature,
                date=installment_date,
                recurring_expense_id=db_recurring.id,
                installment_number=i,
                account_id=obj_in.account_id
            )
            db_transaction = crud_transaction.create_with_user(db, obj_in=transaction_in, user_id=user_id)
            if i == 1:
                first_transaction = db_transaction
        return first_transaction
    else:
        # Subscription: Create only the first transaction
        transaction_in = TransactionCreate(
            description=obj_in.description,
            category_id=obj_in.category_id,
            amount=-abs(obj_in.amount),
            nature=obj_in.nature,
            date=obj_in.date,
            recurring_expense_id=db_recurring.id,
            account_id=obj_in.account_id
        )
        return crud_transaction.create_with_user(db, obj_in=transaction_in, user_id=user_id)
