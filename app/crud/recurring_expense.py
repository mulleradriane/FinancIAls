from typing import List, Optional
from uuid import UUID
import datetime
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, delete, extract, func
from sqlalchemy.exc import IntegrityError
from app.crud.base import CRUDBase
from app.crud.account import account as crud_account
from app.models.recurring_expense import RecurringExpense
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction
from app.schemas.recurring_expense import RecurringExpenseCreate, RecurringExpenseUpdate

class CRUDRecurringExpense(CRUDBase[RecurringExpense, RecurringExpenseCreate, RecurringExpenseUpdate]):
    def create_with_user(self, db: Session, *, obj_in: RecurringExpenseCreate, user_id: UUID) -> RecurringExpense:
        db_obj = self.model(**obj_in.model_dump(), user_id=user_id)
        db.add(db_obj)
        db.commit()

        # Re-fetch with joinedload to ensure category is loaded
        return db.scalar(
            select(self.model)
            .options(joinedload(RecurringExpense.category))
            .filter(self.model.id == db_obj.id, self.model.user_id == user_id)
        )

    def get_multi_by_user(
        self, db: Session, *, user_id: UUID, skip: int = 0, limit: int = 100, category_type: Optional[CategoryType] = None
    ) -> List[RecurringExpense]:
        query = select(self.model).options(
            joinedload(RecurringExpense.category),
        ).filter(RecurringExpense.user_id == user_id, RecurringExpense.active == True)

        if category_type:
            query = query.join(Category).filter(Category.type == category_type)

        results = db.scalars(
            query.offset(skip).limit(limit)
        ).unique().all()

        # Recalculate current_installment for installments based on elapsed time.
        # Using calendar time instead of transaction count so progress is always
        # accurate even when transactions haven't been linked.
        today = datetime.date.today()
        for r in results:
            if r.type == "installment" and r.start_date and r.total_installments:
                if today < r.start_date:
                    r.current_installment = 0
                else:
                    import calendar as _cal
                    months_diff = (
                        (today.year - r.start_date.year) * 12
                        + (today.month - r.start_date.month)
                    )
                    # Count current month only if the due day has already passed
                    _, last_day = _cal.monthrange(today.year, today.month)
                    effective_due_day = min(r.start_date.day, last_day)
                    if today.day >= effective_due_day:
                        months_diff += 1
                    r.current_installment = min(months_diff, r.total_installments)

        return results

    def remove_by_user(self, db: Session, *, id: UUID, user_id: UUID) -> Optional[RecurringExpense]:
        obj = self.get_by_user(db, id, user_id)
        if obj:
            # Get affected account_ids before deletion
            affected_account_ids = db.scalars(
                select(Transaction.account_id)
                .where(Transaction.recurring_expense_id == id, Transaction.user_id == user_id, Transaction.deleted_at == None)
            ).all()
            affected_account_ids = set(affected_account_ids)
            if obj.account_id:
                affected_account_ids.add(obj.account_id)

            # Delete ALL transactions associated with this recurring expense
            db.execute(
                delete(Transaction).where(Transaction.recurring_expense_id == id, Transaction.user_id == user_id)
            )
            # Delete the recurring expense itself
            db.delete(obj)
            db.commit()

            # Update balance history for all affected accounts
            for acc_id in affected_account_ids:
                balance = crud_account.get_balance(db, acc_id)
                crud_account._record_history(db, acc_id, balance)

        return obj

    def terminate_by_user(self, db: Session, *, id: UUID, user_id: UUID) -> Optional[RecurringExpense]:
        obj = self.get_by_user(db, id, user_id)
        if obj:
            # Get affected account_ids before deletion
            affected_account_ids = db.scalars(
                select(Transaction.account_id)
                .where(
                    Transaction.recurring_expense_id == id,
                    Transaction.user_id == user_id,
                    Transaction.date > datetime.date.today(),
                    Transaction.deleted_at == None
                )
            ).all()
            affected_account_ids = set(affected_account_ids)
            if obj.account_id:
                affected_account_ids.add(obj.account_id)

            # Delete only FUTURE transactions
            today = datetime.date.today()
            db.execute(
                delete(Transaction).where(
                    Transaction.recurring_expense_id == id,
                    Transaction.user_id == user_id,
                    Transaction.date > today
                )
            )
            # Mark as inactive
            obj.active = False
            db.add(obj)
            db.commit()

            # Update balance history for all affected accounts
            for acc_id in affected_account_ids:
                balance = crud_account.get_balance(db, acc_id)
                crud_account._record_history(db, acc_id, balance)

            # Re-fetch with joinedload after commit to ensure category is loaded and object is not expired
            obj = db.scalar(
                select(self.model)
                .options(joinedload(RecurringExpense.category))
                .filter(self.model.id == id, self.model.user_id == user_id)
            )
        return obj

    def propagate_changes(self, db: Session, *, db_obj: RecurringExpense, apply_from: datetime.date, user_id: UUID) -> List[Transaction]:
        # Reset apply_from to the 1st of the month
        first_day_apply_from = apply_from.replace(day=1)

        # Calculate monthly amount
        amount = abs(db_obj.amount)
        monthly_amount = amount
        if db_obj.type == "installment" and db_obj.total_installments and db_obj.total_installments > 0:
            monthly_amount = (amount / Decimal(str(db_obj.total_installments))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Fetch transactions to update
        transactions = db.scalars(
            select(Transaction)
            .where(
                Transaction.recurring_expense_id == db_obj.id,
                Transaction.user_id == user_id,
                Transaction.date >= first_day_apply_from,
                Transaction.deleted_at == None
            )
        ).all()

        import calendar
        for t in transactions:
            # Update fields
            t.description = db_obj.description
            t.category_id = db_obj.category_id
            t.account_id = db_obj.account_id

            # Apply amount with original sign
            is_negative = t.amount < 0
            t.amount = -monthly_amount if is_negative else monthly_amount

            # Recalculate date if start_date day changed
            new_day = db_obj.start_date.day
            if t.date.day != new_day:
                _, last_day_of_t_month = calendar.monthrange(t.date.year, t.date.month)
                t.date = t.date.replace(day=min(new_day, last_day_of_t_month))

            db.add(t)

        db.commit()

        # Update balance history for affected account (one or more)
        affected_account_ids = {t.account_id for t in transactions}
        if db_obj.account_id:
            affected_account_ids.add(db_obj.account_id)

        for acc_id in affected_account_ids:
            if acc_id:
                balance = crud_account.get_balance(db, acc_id)
                crud_account._record_history(db, acc_id, balance)

        return transactions

    def update_by_user(self, db: Session, *, db_obj: RecurringExpense, obj_in: RecurringExpenseUpdate, user_id: UUID) -> RecurringExpense:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.add(db_obj)
        db.commit()

        # Re-fetch with joinedload to ensure category is loaded and avoid DetachedInstanceError
        return db.scalar(
            select(self.model)
            .options(joinedload(RecurringExpense.category))
            .filter(self.model.id == db_obj.id, self.model.user_id == user_id)
        )

    def generate_future_transactions(self, db: Session, *, user_id: UUID) -> int:
        """
        Gera transações futuras para recorrências ativas (tipo subscription).
        Cobre mês atual + 2 meses à frente.

        Deduplicação em duas camadas:
        1. Por recurring_expense_id + mês/ano  → transações já geradas pelo sistema
        2. Por description + account_id + mês/ano → transações lançadas manualmente
           ou criadas antes desta lógica (sem recurring_expense_id preenchido)

        Se encontrar uma transação pela camada 2, vincula o recurring_expense_id
        para que verificações futuras usem a camada 1 (mais eficiente).

        Usa extract('year') e extract('month') em vez de date_trunc para evitar
        falsos negativos quando a data da transação existente difere da data
        calculada pelo gerador dentro do mesmo mês.
        """
        from app.models.transaction import Transaction, TransactionNature
        import calendar
        from dateutil.relativedelta import relativedelta

        MONTHS_TO_GENERATE_AHEAD = 3  # mês atual + 2 meses à frente
        today = datetime.date.today()
        target_months = [today.replace(day=1) + relativedelta(months=i) for i in range(MONTHS_TO_GENERATE_AHEAD)]

        recurrings = db.scalars(
            select(RecurringExpense)
            .options(joinedload(RecurringExpense.category))
            .filter(
                RecurringExpense.user_id == user_id,
                RecurringExpense.active == True,
                RecurringExpense.type == "subscription",
            )
        ).unique().all()

        created_count = 0
        affected_account_ids = set()
        needs_commit = False

        for r in recurrings:
            for target_month_start in target_months:
                # Verifica se a recorrência se aplica a este mês
                if target_month_start < r.start_date.replace(day=1):
                    continue
                if r.end_date and target_month_start > r.end_date:
                    continue
                if r.frequency == "yearly" and r.start_date.month != target_month_start.month:
                    continue

                t_year  = target_month_start.year
                t_month = target_month_start.month

                # ── Camada 1: por recurring_expense_id + mês/ano ──────────────
                exists = db.scalar(
                    select(Transaction.id).filter(
                        Transaction.recurring_expense_id == r.id,
                        Transaction.user_id == user_id,
                        func.extract('year',  Transaction.date) == t_year,
                        func.extract('month', Transaction.date) == t_month,
                        Transaction.deleted_at == None,
                    )
                )
                if exists:
                    continue

                # ── Camada 2: por description + account + mês/ano ─────────────
                orphan_id = None
                if r.account_id:
                    orphan_id = db.scalar(
                        select(Transaction.id).filter(
                            Transaction.description == r.description,
                            Transaction.account_id  == r.account_id,
                            Transaction.user_id     == user_id,
                            func.extract('year',  Transaction.date) == t_year,
                            func.extract('month', Transaction.date) == t_month,
                            Transaction.deleted_at == None,
                        )
                    )

                if orphan_id:
                    # Vincula ao recurring_expense_id sem criar duplicata
                    db.execute(
                        Transaction.__table__.update()
                        .where(Transaction.id == orphan_id)
                        .values(recurring_expense_id=r.id)
                    )
                    needs_commit = True
                    continue

                # ── Cria nova transação ────────────────────────────────────────
                _, last_day = calendar.monthrange(t_year, t_month)
                t_date = target_month_start.replace(day=min(r.start_date.day, last_day))

                nature = TransactionNature.EXPENSE
                if r.category and r.category.type == CategoryType.income:
                    nature = TransactionNature.INCOME

                amount = -abs(r.amount) if nature == TransactionNature.EXPENSE else abs(r.amount)

                new_t = Transaction(
                    description=r.description,
                    amount=amount,
                    date=t_date,
                    nature=nature,
                    account_id=r.account_id,
                    category_id=r.category_id,
                    recurring_expense_id=r.id,
                    user_id=user_id,
                )
                db.add(new_t)
                created_count += 1
                needs_commit = True
                if r.account_id:
                    affected_account_ids.add(r.account_id)

        if needs_commit:
            try:
                db.commit()
            except IntegrityError:
                # Requisições paralelas podem tentar criar a mesma transação simultaneamente.
                # O índice único uq_recurring_transaction_month bloqueia a duplicata —
                # rollback silencioso é o comportamento correto aqui.
                db.rollback()
                return 0

        for acc_id in affected_account_ids:
            balance = crud_account.get_balance(db, acc_id)
            crud_account._record_history(db, acc_id, balance)

        return created_count


    def get_upcoming(self, db: Session, *, user_id: UUID, days: int = 7) -> list[dict]:
        """Retorna transações de recorrências nos próximos `days` dias (incluindo hoje)."""
        today = datetime.date.today()
        end_date = today + datetime.timedelta(days=days)

        rows = db.execute(
            select(
                Transaction.id,
                Transaction.description,
                Transaction.amount,
                Transaction.date,
                Transaction.nature,
                Category.name.label("category_name"),
                Category.color.label("category_color"),
                Category.icon.label("category_icon"),
                RecurringExpense.id.label("recurring_expense_id"),
            )
            .join(RecurringExpense, Transaction.recurring_expense_id == RecurringExpense.id)
            .outerjoin(Category, RecurringExpense.category_id == Category.id)
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= today,
                Transaction.date <= end_date,
                Transaction.deleted_at.is_(None),
                Transaction.recurring_expense_id.isnot(None),
            )
            .order_by(Transaction.date.asc())
        ).all()

        return [
            {
                "transaction_id": str(row.id),
                "description": row.description,
                "amount": row.amount,
                "date": row.date.isoformat(),
                "days_until": (row.date - today).days,
                "nature": row.nature.value,
                "category_name": row.category_name or "Sem Categoria",
                "category_color": row.category_color or "#64748b",
                "category_icon": row.category_icon or "💰",
                "recurring_expense_id": str(row.recurring_expense_id),
            }
            for row in rows
        ]

    def get_summary(self, db: Session, *, user_id: UUID) -> dict:
        from app.services.financial_engine import financial_engine

        today = datetime.date.today()
        first_day_of_month = today.replace(day=1)
        import calendar
        last_day_of_month = today.replace(day=calendar.monthrange(today.year, today.month)[1])

        recurrings = db.scalars(
            select(RecurringExpense).options(
                selectinload(RecurringExpense.transactions),
                joinedload(RecurringExpense.category)
            ).join(Category)
            .filter(
                RecurringExpense.user_id == user_id,
                RecurringExpense.active == True,
                Category.type == CategoryType.expense
            )
        ).unique().all()

        total_subscriptions = Decimal(0)
        total_installments = Decimal(0)

        subscriptions_paid = Decimal(0)
        subscriptions_total = Decimal(0)
        installments_paid = Decimal(0)
        installments_total = Decimal(0)

        for r in recurrings:
            # Monthly impact calculation
            amount = abs(r.amount)
            if r.type == "subscription":
                total_subscriptions += amount

                # Current month performance
                # A subscription is "predicted" if it has a frequency that lands it in this month
                # For simplicity, we assume monthly subscriptions always land in the month.
                # Yearly subscriptions only if start_date month matches today's month.
                is_this_month = True
                if r.frequency == "yearly" and r.start_date.month != today.month:
                    is_this_month = False

                if is_this_month:
                    subscriptions_total += amount
                    # Paid if there is a transaction this month with date <= today
                    has_paid = any(first_day_of_month <= t.date <= today and t.deleted_at is None for t in r.transactions)
                    if has_paid:
                        subscriptions_paid += amount

            elif r.type == "installment":
                # Monthly value for installments
                monthly_val = amount
                if r.total_installments and r.total_installments > 0:
                    monthly_val = (amount / Decimal(str(r.total_installments))).quantize(Decimal("0.01"))

                total_installments += monthly_val

                # For installments, check which one falls into this month
                this_month_trans = [t for t in r.transactions if first_day_of_month <= t.date <= last_day_of_month and t.deleted_at is None]
                if this_month_trans:
                    installments_total += sum(abs(t.amount) for t in this_month_trans)
                    paid_trans = [t for t in this_month_trans if t.date <= today]
                    installments_paid += sum(abs(t.amount) for t in paid_trans)

        total_recurring = total_subscriptions + total_installments

        # Calculate average income from last 3 months
        avg_income = Decimal(0)
        for i in range(1, 4):
            # Calculate for previous 3 closed months
            d = first_day_of_month - datetime.timedelta(days=1) # Last day of previous month
            # Go back i-1 more months
            for _ in range(i-1):
                d = d.replace(day=1) - datetime.timedelta(days=1)

            monthly = financial_engine.get_monthly_totals(db, d.year, d.month, user_id=user_id)
            avg_income += monthly["income"]

        avg_income = avg_income / 3 if avg_income > 0 else Decimal(0)

        commitment_percentage = 0
        if avg_income > 0:
            commitment_percentage = round((total_recurring / avg_income) * 100)

        return {
            "total_recurring": total_recurring,
            "total_subscriptions": total_subscriptions,
            "total_installments": total_installments,
            "subscriptions_paid": subscriptions_paid,
            "subscriptions_total": subscriptions_total,
            "installments_paid": installments_paid,
            "installments_total": installments_total,
            "total_income": avg_income,
            "commitment_percentage": commitment_percentage
        }

recurring_expense = CRUDRecurringExpense(RecurringExpense)
