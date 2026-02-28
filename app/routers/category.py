from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.crud.category import category as crud_category
from app.crud.category_override import category_override as crud_category_override, apply_override
from app.schemas.category import Category, CategoryCreate, CategoryUpdate
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=Category)
def create_category(
    obj_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud_category.create_with_user(db, obj_in=obj_in, user_id=current_user.id)

@router.get("/", response_model=List[Category])
def read_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    categories = crud_category.get_multi_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    overrides = crud_category_override.get_all_for_user(db, user_id=current_user.id)
    override_map = {o.category_id: o for o in overrides}

    return [apply_override(c, override_map.get(c.id)) for c in categories]

@router.get("/{id}", response_model=Category)
def read_category(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_category.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Category not found")

    override = crud_category_override.get_by_user_and_category(db, user_id=current_user.id, category_id=id)
    return apply_override(db_obj, override)

@router.put("/{id}", response_model=Category)
def update_category(
    id: UUID,
    obj_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_category.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Category not found")

    if db_obj.is_system:
        override = crud_category_override.upsert(
            db,
            user_id=current_user.id,
            category_id=id,
            obj_in=obj_in.model_dump(exclude_unset=True)
        )
        return apply_override(db_obj, override)

    updated_obj = crud_category.update(db, db_obj=db_obj, obj_in=obj_in)
    return apply_override(updated_obj, None)

@router.delete("/{id}/override")
def delete_category_override(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_category.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Category not found")

    if not db_obj.is_system:
        raise HTTPException(status_code=400, detail="Somente categorias de sistema podem ter personalizações removidas.")

    removed = crud_category_override.delete(db, user_id=current_user.id, category_id=id)
    return {"success": True, "removed": removed}

@router.delete("/{id}", response_model=Category)
def delete_category(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_obj = crud_category.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Category not found")
    return crud_category.remove_by_user(db, id=id, user_id=current_user.id)
