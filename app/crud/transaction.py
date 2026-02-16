from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.crud.base import CRUDBase
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate

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

transaction = CRUDTransaction(Transaction)
