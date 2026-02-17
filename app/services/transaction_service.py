from sqlalchemy.orm import Session
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from app.crud.transaction import transaction as crud_transaction
from app.crud.recurring_expense import recurring_expense as crud_recurring_expense
from app.schemas.transaction import UnifiedTransactionCreate, TransactionCreate
from app.schemas.recurring_expense import RecurringExpenseCreate
from app.models.recurring_expense import RecurringType

def create_unified_transaction(db: Session, obj_in: UnifiedTransactionCreate):
    if not obj_in.is_recurring:
        # Normal transaction
        transaction_in = TransactionCreate(
            description=obj_in.description,
            category_id=obj_in.category_id,
            amount=obj_in.amount,
            date=obj_in.date
        )
        return crud_transaction.create(db, obj_in=transaction_in)

    # Create RecurringExpense master record
    recurring_in = RecurringExpenseCreate(
        description=obj_in.description,
        category_id=obj_in.category_id,
        amount=obj_in.amount,
        type=obj_in.recurring_type,
        frequency=obj_in.frequency,
        total_installments=obj_in.total_installments,
        start_date=obj_in.date,
        active=True
    )
    db_recurring = crud_recurring_expense.create(db, obj_in=recurring_in)

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
                amount=current_installment_amount,
                date=installment_date,
                recurring_expense_id=db_recurring.id,
                installment_number=i
            )
            db_transaction = crud_transaction.create(db, obj_in=transaction_in)
            if i == 1:
                first_transaction = db_transaction
        return first_transaction
    else:
        # Subscription: Create only the first transaction
        transaction_in = TransactionCreate(
            description=obj_in.description,
            category_id=obj_in.category_id,
            amount=obj_in.amount,
            date=obj_in.date,
            recurring_expense_id=db_recurring.id
        )
        return crud_transaction.create(db, obj_in=transaction_in)
