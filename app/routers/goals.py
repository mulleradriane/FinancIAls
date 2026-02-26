from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.goals import GoalCreate, GoalRead, GoalUpdate
from app.services.goals import goal_service
from app.routers.auth import get_current_user
from app.models.user import User
from typing import List
from uuid import UUID

router = APIRouter()

@router.post("/", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return goal_service.create_goal(db, goal_in, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[GoalRead])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return goal_service.get_goals(db, user_id=current_user.id)

@router.get("/{goal_id}", response_model=GoalRead)
def get_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = goal_service.get_goal(db, goal_id, user_id=current_user.id)
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db_goal

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = goal_service.delete_goal(db, goal_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None
