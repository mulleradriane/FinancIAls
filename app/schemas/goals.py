from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from typing import Optional
from uuid import UUID
from decimal import Decimal
from app.models.goal import GoalType

class GoalBase(BaseModel):
    name: str
    target_amount: Decimal = Field(gt=0)
    start_date: date
    target_date: date
    goal_type: GoalType = GoalType.SAVINGS

    @field_validator('target_date')
    @classmethod
    def validate_dates(cls, v: date, info):
        if 'start_date' in info.data and v <= info.data['start_date']:
            raise ValueError('target_date must be greater than start_date')
        return v

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = Field(None, gt=0)
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    goal_type: Optional[GoalType] = None

    @field_validator('target_date')
    @classmethod
    def validate_dates(cls, v: date, info):
        if 'start_date' in info.data and info.data['start_date'] and v <= info.data['start_date']:
            raise ValueError('target_date must be greater than start_date')
        return v

class GoalRead(GoalBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class GoalProgress(BaseModel):
    id: UUID
    name: str
    target_amount: Decimal
    goal_type: GoalType
    start_date: date
    target_date: date
    current_amount: Decimal
    percentage_completed: float
    remaining_amount: Decimal
    days_remaining: int
    on_track: bool

    class Config:
        from_attributes = True
