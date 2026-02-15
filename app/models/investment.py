import uuid
from sqlalchemy import Column, String, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Investment(Base):
    __tablename__ = "investments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=True)
