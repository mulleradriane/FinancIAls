from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.transfer import transfer as crud_transfer
from app.schemas.transfer import Transfer, TransferCreate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Transfer)
def create_transfer(obj_in: TransferCreate, db: Session = Depends(get_db)):
    return crud_transfer.create(db, obj_in=obj_in)

@router.get("/", response_model=List[Transfer])
def read_transfers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_transfer.get_multi(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=Transfer)
def read_transfer(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_transfer.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return db_obj

@router.delete("/{id}", response_model=Transfer)
def delete_transfer(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_transfer.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return crud_transfer.remove(db, id=id)
