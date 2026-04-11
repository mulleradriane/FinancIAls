from pydantic import BaseModel, Field
from typing import Optional
import datetime
import uuid


class FeedbackCreate(BaseModel):
    page: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    message: str = Field(..., min_length=1, max_length=2000)


class FeedbackOut(BaseModel):
    id: uuid.UUID
    username: Optional[str]
    page: Optional[str]
    rating: Optional[int]
    message: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
