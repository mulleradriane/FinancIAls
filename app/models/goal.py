import uuid
import enum
from sqlalchemy import Column, String, Enum, Numeric, Date, DateTime, UUID, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class GoalType(str, enum.Enum):
    SAVINGS = "SAVINGS"
    NET_WORTH = "NET_WORTH"

class Goal(Base):
    __tablename__ = "financial_goals"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(12, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    target_date = Column(Date, nullable=False)
    goal_type = Column(Enum(GoalType), nullable=False, default=GoalType.SAVINGS)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)

    user = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
