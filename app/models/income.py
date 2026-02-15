import uuid
from sqlalchemy import Column, String, Numeric, Date, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class IncomeType(str, enum.Enum):
    salary = "salary"
    extra = "extra"

class Income(Base):
    __tablename__ = "incomes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(Enum(IncomeType), nullable=False)
