import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    username = Column(String, nullable=True)
    page = Column(String, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
