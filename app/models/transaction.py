import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class TransactionType(str, enum.Enum):
    expense = "expense"
    income = "income"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description = Column(String, nullable=False)
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=False
    )
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(Enum(TransactionType), nullable=False, default=TransactionType.expense)
    date = Column(Date, nullable=False)

    recurring_expense_id = Column(
        UUID(as_uuid=True),
        ForeignKey("recurring_expenses.id"),
        nullable=True
    )
    installment_number = Column(Integer, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    account_id = Column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id"),
        nullable=True
    )

    category = relationship("Category")
    recurring_expense = relationship("RecurringExpense", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
