import uuid
from sqlalchemy import Column, String, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
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

    transactions = relationship("Transaction", back_populates="account")
    incomes = relationship("Income", back_populates="account")
    investments = relationship("Investment", back_populates="account")
