from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.category import category as crud_category
from app.schemas.category import Category, CategoryCreate, CategoryUpdate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Category)
def create_category(obj_in: CategoryCreate, db: Session = Depends(get_db)):
    return crud_category.create(db, obj_in=obj_in)

@router.get("/", response_model=List[Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_category.get_multi(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=Category)
def read_category(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_category.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_obj

@router.put("/{id}", response_model=Category)
def update_category(id: UUID, obj_in: CategoryUpdate, db: Session = Depends(get_db)):
    db_obj = crud_category.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Category not found")
    return crud_category.update(db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=Category)
def delete_category(id: UUID, db: Session = Depends(get_db)):
    db_obj = crud_category.get(db, id=id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Category not found")
    return crud_category.remove(db, id=id)
