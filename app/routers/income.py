from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.income import income as crud_income
from app.schemas.income import Income, IncomeCreate, IncomeUpdate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Income)
def create_income(obj_in: IncomeCreate, db: Session = Depends(get_db)):
    return crud_income.create(db, obj_in=obj_in)

@router.get("/", response_model=List[Income])
def read_incomes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_income.get_multi(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=Income)
def read_income(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_income.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Income not found")
    return db_obj

@router.put("/{id}", response_model=Income)
def update_income(id: UUID, obj_in: IncomeUpdate, db: Session = Depends(get_db)):
    db_obj = crud_income.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Income not found")
    return crud_income.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Income)
def delete_income(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_income.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Income not found")
    return crud_income.remove(db, id=id)
