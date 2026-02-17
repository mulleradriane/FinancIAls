from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.account import account as crud_account
from app.schemas.account import Account, AccountCreate, AccountUpdate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Account)
def create_account(obj_in: AccountCreate, db: Session = Depends(get_db)):
    return crud_account.create(db, obj_in=obj_in)

@router.get("/", response_model=List[Account])
def read_accounts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_account.get_multi_with_balance(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=Account)
def read_account(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_account.get_with_balance(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return db_obj

@router.put("/{id}", response_model=Account)
def update_account(id: UUID, obj_in: AccountUpdate, db: Session = Depends(get_db)):
    db_obj = crud_account.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud_account.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Account)
def delete_account(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_account.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud_account.remove(db, id=id)
