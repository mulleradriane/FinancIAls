from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.recurring_expense import recurring_expense as crud_recurring_expense
from app.schemas.recurring_expense import RecurringExpense, RecurringExpenseCreate, RecurringExpenseUpdate, RecurringSummary
from app.core.database import get_db
from sqlalchemy import select, func
from app.models.recurring_expense import RecurringExpense as RecurringExpenseModel, RecurringType
from app.models.category import CategoryType
from app.services.financial_engine import financial_engine
from decimal import Decimal

router = APIRouter()

@router.get("/summary", response_model=RecurringSummary)
def get_recurring_summary(db: Session = Depends(get_db)):
    import datetime
    today = datetime.date.today()

    m_totals = financial_engine.get_monthly_totals(db, today.year, today.month)
    current_month_income = m_totals["income"]

    if current_month_income == 0:
        # Fallback for commitment calculation if no income this month
        current_month_income = Decimal(5000)

    recurring_expenses = db.scalars(select(RecurringExpenseModel).filter(RecurringExpenseModel.active == True)).all()

    total_subs = sum(e.amount for e in recurring_expenses if e.type == RecurringType.subscription)
    total_insts = sum((e.amount / (e.total_installments or 1)) for e in recurring_expenses if e.type == RecurringType.installment)
    total_recurring = total_subs + total_insts

    commitment = (float(total_recurring) / float(current_month_income)) * 100 if current_month_income > 0 else 0

    return {
        "total_recurring": total_recurring,
        "total_subscriptions": total_subs,
        "total_installments": total_insts,
        "total_income": current_month_income,
        "commitment_percentage": round(commitment, 1)
    }

@router.post("/", response_model=RecurringExpense)
def create_recurring_expense(obj_in: RecurringExpenseCreate, db: Session = Depends(get_db)):
    return crud_recurring_expense.create(db, obj_in=obj_in)

@router.get("/", response_model=List[RecurringExpense])
def read_recurring_expenses(
    category_type: Optional[CategoryType] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud_recurring_expense.get_multi(db, skip=skip, limit=limit, category_type=category_type)

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

@router.post("/{id}/terminate", response_model=RecurringExpense)
def terminate_recurring_expense(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_recurring_expense.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return crud_recurring_expense.terminate(db, id=id)
