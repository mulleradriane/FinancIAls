from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.transaction import Transaction
from app.models.recurring_expense import RecurringExpense
from app.models.transfer import Transfer
from app.models.account import Account
from app.schemas.transaction import TransactionCreate, TransactionUpdate, UnifiedTransactionResponse

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    def get(self, db: Session, id: UUID) -> Optional[Transaction]:
        return db.scalars(
            select(Transaction)
            .filter(Transaction.id == id, Transaction.deleted_at == None)
            .options(joinedload(Transaction.category))
        ).first()

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Transaction]:
        return db.scalars(
            select(Transaction)
            .filter(Transaction.deleted_at == None)
            .options(joinedload(Transaction.category))
            .order_by(Transaction.date.desc())
            .offset(skip)
            .limit(limit)
        ).all()

    def remove(self, db: Session, *, id: UUID) -> Optional[Transaction]:
        obj = db.get(Transaction, id)
        if obj:
            obj.deleted_at = datetime.now()
            db.add(obj)
            db.commit()
            db.refresh(obj)
        return obj

    def get_unified(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        account_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        start_date: Optional[datetime.date] = None,
        end_date: Optional[datetime.date] = None
    ) -> List[UnifiedTransactionResponse]:
        # Get Transactions
        query = select(Transaction).filter(Transaction.deleted_at == None)

        if account_id:
            query = query.filter(Transaction.account_id == account_id)
        if category_id:
            query = query.filter(Transaction.category_id == category_id)
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        transactions = db.scalars(
            query.options(
                joinedload(Transaction.category),
                joinedload(Transaction.account),
                joinedload(Transaction.recurring_expense)
            )
            .order_by(Transaction.date.desc())
            .offset(skip)
            .limit(limit)
        ).all()

        unified_list = []
        for t in transactions:
            unified_list.append(UnifiedTransactionResponse(
                id=t.id,
                description=t.description,
                amount=t.amount,
                date=t.date,
                category_name=t.category.name if t.category else "Sem Categoria",
                category_icon=t.category.icon if t.category else "💰",
                category_color=t.category.color if t.category else "#666666",
                is_transfer=False,
                installment_number=t.installment_number,
                account_name=t.account.name if t.account else "Sem Conta",
                account_type=t.account.type if t.account else None,
                is_recurring=t.recurring_expense_id is not None,
                recurring_type=t.recurring_expense.type.value if t.recurring_expense else None,
                total_installments=t.recurring_expense.total_installments if t.recurring_expense else None
            ))

        # Get Transfers
        # For transfers, we only filter by account_id and dates. Category filtering doesn't apply directly.
        if not category_id:
            query_tr = select(Transfer)
            if account_id:
                query_tr = query_tr.filter((Transfer.from_account_id == account_id) | (Transfer.to_account_id == account_id))
            if start_date:
                query_tr = query_tr.filter(Transfer.date >= start_date)
            if end_date:
                query_tr = query_tr.filter(Transfer.date <= end_date)

            transfers = db.scalars(
                query_tr.options(joinedload(Transfer.from_account), joinedload(Transfer.to_account))
                .order_by(Transfer.date.desc())
                .offset(skip)
                .limit(limit)
            ).all()

            for tr in transfers:
                # Entry for the source account (outgoing)
                if not account_id or tr.from_account_id == account_id:
                    unified_list.append(UnifiedTransactionResponse(
                        id=tr.id,
                        description=tr.description or "Transferência",
                        amount=tr.amount * -1,
                        date=tr.date,
                        category_name=f"Transferência para {tr.to_account.name}",
                        is_transfer=True,
                        account_name=tr.from_account.name,
                        account_type=tr.from_account.type,
                        from_account_name=tr.from_account.name,
                        to_account_name=tr.to_account.name
                    ))
                # Entry for the destination account (incoming)
                if not account_id or tr.to_account_id == account_id:
                    unified_list.append(UnifiedTransactionResponse(
                        id=tr.id,
                        description=tr.description or "Transferência",
                        amount=tr.amount,
                        date=tr.date,
                        category_name=f"Recebido de {tr.from_account.name}",
                        is_transfer=True,
                        account_name=tr.to_account.name,
                        account_type=tr.to_account.type,
                        from_account_name=tr.from_account.name,
                        to_account_name=tr.to_account.name
                    ))

        # Re-sort combined list by date desc
        unified_list.sort(key=lambda x: x.date, reverse=True)

        return unified_list[:limit]

    def get_unique_descriptions(self, db: Session) -> List[str]:
        result = db.execute(
            select(Transaction.description)
            .filter(Transaction.deleted_at == None)
            .distinct()
            .order_by(Transaction.description)
        ).all()
        return [r[0] for r in result]

    def get_suggestion(self, db: Session, description: str) -> Optional[Transaction]:
        return db.scalars(
            select(Transaction)
            .filter(Transaction.description.ilike(description), Transaction.deleted_at == None)
            .order_by(Transaction.date.desc())
            .limit(1)
        ).first()

transaction = CRUDTransaction(Transaction)
