from sqlalchemy.orm import Session
from app.models.goal import Goal
from app.schemas.goals import GoalCreate
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class GoalService:
    def create_goal(self, db: Session, goal_in: GoalCreate, user_id: UUID) -> Goal:
        if goal_in.target_date <= goal_in.start_date:
            raise ValueError("Target date must be after start date")
        if goal_in.target_amount <= 0:
            raise ValueError("Target amount must be greater than zero")

        db_goal = Goal(**goal_in.model_dump(), user_id=user_id)
        db.add(db_goal)
        db.commit()
        db.refresh(db_goal)
        return db_goal

    def get_goals(self, db: Session, user_id: UUID) -> List[Goal]:
        return db.query(Goal).filter(Goal.user_id == user_id, Goal.deleted_at == None).all()

    def get_goal(self, db: Session, goal_id: UUID, user_id: UUID) -> Optional[Goal]:
        return db.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user_id,
            Goal.deleted_at == None
        ).first()

    def delete_goal(self, db: Session, goal_id: UUID, user_id: UUID) -> bool:
        db_goal = self.get_goal(db, goal_id, user_id)
        if not db_goal:
            return False
        db_goal.deleted_at = datetime.now()
        db.commit()
        return True

goal_service = GoalService()
