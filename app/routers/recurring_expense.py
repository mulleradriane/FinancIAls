from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.recurring_expense import recurring_expense as crud_recurring_expense
from app.schemas.recurring_expense import RecurringExpense, RecurringExpenseCreate, RecurringExpenseUpdate
from app.models.category import CategoryType
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=RecurringExpense)
def create_recurring_expense(
    obj_in: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_recurring_expense.create_with_user(db, obj_in=obj_in, user_id=current_user.id)

@router.get("/", response_model=List[RecurringExpense])
def read_recurring_expenses(
    skip: int = 0,
    limit: int = 100,
    category_type: Optional[CategoryType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_recurring_expense.get_multi_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit, category_type=category_type
    )

@router.delete("/{id}", response_model=RecurringExpense)
def delete_recurring_expense(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_recurring_expense.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return crud_recurring_expense.remove_by_user(db, id=id, user_id=current_user.id)

@router.post("/{id}/terminate", response_model=RecurringExpense)
def terminate_recurring_expense(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_recurring_expense.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return crud_recurring_expense.terminate_by_user(db, id=id, user_id=current_user.id)

@router.get("/summary")
def get_recurring_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_recurring_expense.get_summary(db, user_id=current_user.id)
