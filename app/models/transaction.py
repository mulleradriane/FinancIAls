import uuid
from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class TransactionNature(str, enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    INVESTMENT = "INVESTMENT"
    TRANSFER = "TRANSFER"
    SYSTEM_ADJUSTMENT = "SYSTEM_ADJUSTMENT"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description = Column(String, nullable=False)
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=True
    )
    amount = Column(Numeric(12, 2), nullable=False)
    nature = Column(Enum(TransactionNature), nullable=False, default=TransactionNature.EXPENSE)
    date = Column(Date, nullable=False)
    transfer_group_id = Column(UUID(as_uuid=True), nullable=True)

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
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    user = relationship("User")
    category = relationship("Category")
    recurring_expense = relationship("RecurringExpense", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
