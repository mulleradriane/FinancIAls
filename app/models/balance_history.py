import uuid
from sqlalchemy import Column, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class BalanceHistory(Base):
    __tablename__ = "balance_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)
    balance = Column(Numeric(12, 2), nullable=False)
    date = Column(Date, nullable=False)

    account = relationship("Account")
