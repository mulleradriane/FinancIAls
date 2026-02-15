from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.recurring_expense import recurring_expense as crud_recurring_expense
from app.schemas.recurring_expense import RecurringExpense, RecurringExpenseCreate, RecurringExpenseUpdate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=RecurringExpense)
def create_recurring_expense(obj_in: RecurringExpenseCreate, db: Session = Depends(get_db)):
    return crud_recurring_expense.create(db, obj_in=obj_in)

@router.get("/", response_model=List[RecurringExpense])
def read_recurring_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_recurring_expense.get_multi(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=RecurringExpense)
def read_recurring_expense(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_recurring_expense.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return db_obj

@router.put("/{id}", response_model=RecurringExpense)
def update_recurring_expense(id: UUID, obj_in: RecurringExpenseUpdate, db: Session = Depends(get_db)):
    db_obj = crud_recurring_expense.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return crud_recurring_expense.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=RecurringExpense)
def delete_recurring_expense(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_recurring_expense.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return crud_recurring_expense.remove(db, id=id)
