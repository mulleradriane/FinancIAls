import uuid
import sqlalchemy as sa
from sqlalchemy import Column, String, Enum, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AccountType(str, enum.Enum):
    banco = "banco"
    carteira = "carteira"
    poupanca = "poupanca"
    investimento = "investimento"
    cartao_credito = "cartao_credito"
    outros_ativos = "outros_ativos"
    outros_passivos = "outros_passivos"


class InvoiceStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(Enum(AccountType), nullable=False, default=AccountType.banco)
    initial_balance = Column(Numeric(12, 2), nullable=False, default=0)
    initial_balance_date = Column(Date, nullable=False, server_default=func.current_date())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Credit card specific
    closing_day = Column(sa.Integer, nullable=True)
    due_day = Column(sa.Integer, nullable=True)
    credit_limit = Column(sa.Numeric(12, 2), nullable=True)
    is_default = Column(sa.Boolean, nullable=False, default=False)

    # Invoice lifecycle (cartao_credito only)
    invoice_status = Column(
        Enum(InvoiceStatus),
        nullable=False,
        default=InvoiceStatus.open,
        server_default='open',
    )
    invoice_closed_at = Column(DateTime(timezone=True), nullable=True)
    # Valor total da fatura no momento do fechamento (snapshot)
    invoice_snapshot_amount = Column(sa.Numeric(12, 2), nullable=True)

    user = relationship("User")
    transactions = relationship("Transaction", back_populates="account")
