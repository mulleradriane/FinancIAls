from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.transaction import Transaction
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

    def get_unified(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[UnifiedTransactionResponse]:
        # Get Transactions
        transactions = db.scalars(
            select(Transaction)
            .filter(Transaction.deleted_at == None)
            .options(joinedload(Transaction.category), joinedload(Transaction.account))
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
                is_transfer=False,
                installment_number=t.installment_number,
                account_name=t.account.name if t.account else "Sem Conta"
            ))

        # Get Transfers
        transfers = db.scalars(
            select(Transfer)
            .options(joinedload(Transfer.from_account), joinedload(Transfer.to_account))
            .order_by(Transfer.date.desc())
            .offset(skip)
            .limit(limit)
        ).all()

        for tr in transfers:
            # Entry for the source account (outgoing)
            unified_list.append(UnifiedTransactionResponse(
                id=tr.id, # Note: using same ID, might need handling in frontend
                description=tr.description or "Transferência",
                amount=tr.amount * -1,
                date=tr.date,
                category_name=f"Transferência para {tr.to_account.name}",
                is_transfer=True,
                account_name=tr.from_account.name,
                from_account_name=tr.from_account.name,
                to_account_name=tr.to_account.name
            ))
            # Entry for the destination account (incoming)
            unified_list.append(UnifiedTransactionResponse(
                id=tr.id,
                description=tr.description or "Transferência",
                amount=tr.amount,
                date=tr.date,
                category_name=f"Recebido de {tr.from_account.name}",
                is_transfer=True,
                account_name=tr.to_account.name,
                from_account_name=tr.from_account.name,
                to_account_name=tr.to_account.name
            ))

        # Re-sort combined list by date desc
        unified_list.sort(key=lambda x: x.date, reverse=True)

        # Apply limit again on the combined list (optional, but good for consistency)
        return unified_list[:limit]

transaction = CRUDTransaction(Transaction)
