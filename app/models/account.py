import uuid
from sqlalchemy import Column, String, Enum, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AccountType(str, enum.Enum):
    wallet = "carteira"
    bank = "banco"
    savings = "poupanca"
    investment = "investimento"
    credit_card = "cartao_credito"

class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(Enum(AccountType), nullable=False, default=AccountType.bank)
    initial_balance = Column(Numeric(12, 2), nullable=False, default=0)
    initial_balance_date = Column(Date, nullable=False, server_default=func.current_date())

    transactions = relationship("Transaction", back_populates="account")
    incomes = relationship("Income", back_populates="account")
    investments = relationship("Investment", back_populates="account")
