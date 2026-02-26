import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, Boolean, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class FrequencyType(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"

class RecurringType(str, enum.Enum):
    subscription = "subscription"
    installment = "installment"

class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description = Column(String, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(Enum(RecurringType), nullable=False, default=RecurringType.subscription)
    frequency = Column(Enum(FrequencyType), nullable=True)
    total_installments = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=False)
    active = Column(Boolean, default=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
    category = relationship("Category")
    transactions = relationship("Transaction", back_populates="recurring_expense")
    account = relationship("Account")
