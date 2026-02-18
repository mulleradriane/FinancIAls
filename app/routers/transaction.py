from typing import List
from uuid import UUID
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.transaction import transaction as crud_transaction
from app.schemas.transaction import Transaction, TransactionCreate, TransactionUpdate, UnifiedTransactionCreate, UnifiedTransactionResponse
from app.core.database import get_db
from app.services.transaction_service import create_unified_transaction

router = APIRouter()

@router.post("/", response_model=Transaction)
def create_transaction(obj_in: UnifiedTransactionCreate, db: Session = Depends(get_db)):
    return create_unified_transaction(db, obj_in=obj_in)

@router.get("/", response_model=List[UnifiedTransactionResponse])
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    account_id: UUID | None = None,
    category_id: UUID | None = None,
    start_date: datetime.date | None = None,
    end_date: datetime.date | None = None,
    db: Session = Depends(get_db)
):
    return crud_transaction.get_unified(
        db,
        skip=skip,
        limit=limit,
        account_id=account_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/suggest/", response_model=TransactionUpdate)
def suggest_transaction(description: str, db: Session = Depends(get_db)):
    t = crud_transaction.get_suggestion(db, description=description)
    if not t:
        raise HTTPException(status_code=404, detail="No previous transaction found")
    return t

@router.get("/{id}", response_model=Transaction)
def read_transaction(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_transaction.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_obj

@router.put("/{id}", response_model=Transaction)
def update_transaction(id: UUID, obj_in: TransactionUpdate, db: Session = Depends(get_db)):
    db_obj = crud_transaction.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return crud_transaction.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Transaction)
def delete_transaction(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_transaction.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return crud_transaction.remove(db, id=id)
