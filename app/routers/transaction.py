from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.transaction import transaction as crud_transaction
from app.schemas.transaction import Transaction, TransactionCreate, TransactionUpdate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Transaction)
def create_transaction(obj_in: TransactionCreate, db: Session = Depends(get_db)):
    return crud_transaction.create(db, obj_in=obj_in)

@router.get("/", response_model=List[Transaction])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_transaction.get_multi(db, skip=skip, limit=limit)

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
