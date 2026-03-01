from typing import List, Optional
from uuid import UUID
from datetime import datetime
import datetime as dt
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, text, update
from app.crud.base import CRUDBase
from app.models.transaction import Transaction, TransactionNature
from app.models.recurring_expense import RecurringExpense
from app.models.account import Account
from app.models.category import Category, CategoryType
from app.schemas.transaction import TransactionCreate, TransactionUpdate, UnifiedTransactionResponse

class CRUDTransaction(CRUDBase[Transaction, TransactionCreate, TransactionUpdate]):
    def create_with_user(self, db: Session, *, obj_in: TransactionCreate, user_id: UUID) -> Transaction:
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_user(self, db: Session, id: UUID, user_id: UUID) -> Optional[Transaction]:
        return db.scalars(
            select(Transaction)
            .filter(Transaction.id == id, Transaction.user_id == user_id, Transaction.deleted_at == None)
            .options(joinedload(Transaction.category))
        ).first()

    def get_multi_by_user(self, db: Session, *, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Transaction]:
        return db.scalars(
            select(Transaction)
            .filter(Transaction.user_id == user_id, Transaction.deleted_at == None)
            .options(joinedload(Transaction.category))
            .order_by(Transaction.date.desc())
            .offset(skip)
            .limit(limit)
        ).all()

    def remove_by_user(self, db: Session, *, id: UUID, user_id: UUID) -> Optional[Transaction]:
        obj = self.get_by_user(db, id, user_id)
        if obj:
            now = datetime.now()

            # If it belongs to a transfer group, delete all related transactions
            if obj.transfer_group_id:
                db.execute(
                    update(Transaction)
                    .where(Transaction.transfer_group_id == obj.transfer_group_id)
                    .where(Transaction.user_id == user_id)
                    .where(Transaction.deleted_at == None)
                    .values(deleted_at=now)
                )
            else:
                db.execute(
                    update(Transaction)
                    .where(Transaction.id == id)
                    .where(Transaction.user_id == user_id)
                    .where(Transaction.deleted_at == None)
                    .values(deleted_at=now)
                )

            db.commit()
            db.refresh(obj)
        return obj

    def get_unified(
        self,
        db: Session,
        *,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        account_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        start_date: Optional[dt.date] = None,
        end_date: Optional[dt.date] = None,
        search: Optional[str] = None
    ) -> List[UnifiedTransactionResponse]:
        # Get Transactions
        query = select(Transaction).filter(Transaction.user_id == user_id, Transaction.deleted_at == None)

        if account_id:
            query = query.filter(Transaction.account_id == account_id)
        if category_id:
            query = query.filter(Transaction.category_id == category_id)
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        if search:
            query = query.filter(Transaction.description.ilike(f"%{search}%"))

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
                nature=t.nature,
                date=t.date,
                category_name=t.category.name if t.category else "Sem Categoria",
                category_icon=t.category.icon if t.category else "💰",
                category_color=t.category.color if t.category else "#666666",
                category_is_system=t.category.is_system if t.category else False,
                is_transfer=(t.nature == TransactionNature.TRANSFER),
                installment_number=t.installment_number,
                account_name=t.account.name if t.account else "Sem Conta",
                account_type=t.account.type.value if t.account else None,
                is_recurring=t.recurring_expense_id is not None,
                recurring_type=t.recurring_expense.type.value if t.recurring_expense else None,
                total_installments=t.recurring_expense.total_installments if t.recurring_expense else None
            ))

        return unified_list

    def get_unique_descriptions(self, db: Session, user_id: UUID) -> List[str]:
        result = db.execute(
            select(Transaction.description)
            .filter(Transaction.user_id == user_id, Transaction.deleted_at == None)
            .distinct()
            .order_by(Transaction.description)
        ).all()
        return [r[0] for r in result]

    def get_suggestion(self, db: Session, description: str, user_id: UUID) -> Optional[Transaction]:
        return db.scalars(
            select(Transaction)
            .filter(
                Transaction.description.ilike(description),
                Transaction.user_id == user_id,
                Transaction.deleted_at == None
            )
            .order_by(Transaction.date.desc())
            .limit(1)
        ).first()

transaction = CRUDTransaction(Transaction)
