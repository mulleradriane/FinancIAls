from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.income import income as crud_income
from app.schemas.income import Income, IncomeCreate, IncomeUpdate
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=Income)
def create_income(
    obj_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_income.create_with_user(db, obj_in=obj_in, user_id=current_user.id)

@router.get("/", response_model=List[Income])
def read_incomes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_income.get_multi_by_user(db, user_id=current_user.id, skip=skip, limit=limit)

@router.get("/{id}", response_model=Income)
def read_income(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_income.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Income not found")
    return db_obj

@router.put("/{id}", response_model=Income)
def update_income(
    id: UUID,
    obj_in: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_income.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Income not found")
    return crud_income.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Income)
def delete_income(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_income.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Income not found")
    return crud_income.remove_by_user(db, id=id, user_id=current_user.id)
