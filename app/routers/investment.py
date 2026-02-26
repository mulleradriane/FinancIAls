from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.investment import investment as crud_investment
from app.schemas.investment import Investment, InvestmentCreate, InvestmentUpdate
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=Investment)
def create_investment(
    obj_in: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_investment.create_with_user(db, obj_in=obj_in, user_id=current_user.id)

@router.get("/", response_model=List[Investment])
def read_investments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_investment.get_multi_by_user(db, user_id=current_user.id, skip=skip, limit=limit)

@router.get("/{id}", response_model=Investment)
def read_investment(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_investment.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Investment not found")
    return db_obj

@router.put("/{id}", response_model=Investment)
def update_investment(
    id: UUID,
    obj_in: InvestmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_investment.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Investment not found")
    return crud_investment.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Investment)
def delete_investment(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_investment.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Investment not found")
    return crud_investment.remove_by_user(db, id=id, user_id=current_user.id)
