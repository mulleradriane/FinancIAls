from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.crud.transaction import transaction as crud_transaction
from app.schemas.transaction import Transaction, TransactionCreate, TransactionUpdate, UnifiedTransactionResponse, UnifiedTransactionCreate
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.transaction_service import create_unified_transaction

router = APIRouter()

@router.post("/", response_model=Transaction)
def create_transaction(
    obj_in: UnifiedTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_unified_transaction(db, obj_in=obj_in, user_id=current_user.id)

@router.get("/", response_model=List[UnifiedTransactionResponse])
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    account_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_transaction.get_unified(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        account_id=account_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/unique-descriptions", response_model=List[str])
def get_unique_descriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_transaction.get_unique_descriptions(db, user_id=current_user.id)

@router.get("/suggestion", response_model=Optional[Transaction])
def get_suggestion(
    description: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_transaction.get_suggestion(db, description=description, user_id=current_user.id)

@router.get("/{id}", response_model=Transaction)
def read_transaction(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_transaction.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_obj

@router.put("/{id}", response_model=Transaction)
def update_transaction(
    id: UUID,
    obj_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_transaction.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return crud_transaction.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Transaction)
def delete_transaction(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_transaction.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return crud_transaction.remove_by_user(db, id=id, user_id=current_user.id)
