from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str
    display_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    invite_code: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    display_name: Optional[str] = None
    password: Optional[str] = None

class User(UserBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
