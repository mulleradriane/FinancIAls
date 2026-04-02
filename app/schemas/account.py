from pydantic import BaseModel, ConfigDict
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from typing import Optional
from app.models.account import AccountType, InvoiceStatus


class AccountBase(BaseModel):
    name: str
    type: AccountType
    initial_balance: Decimal = Decimal(0)
    initial_balance_date: date
    closing_day: int | None = None
    due_day: int | None = None
    credit_limit: Decimal | None = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    initial_balance: Decimal | None = None
    initial_balance_date: date | None = None
    current_balance: Decimal | None = None
    closing_day: int | None = None
    due_day: int | None = None
    credit_limit: Decimal | None = None


class Account(AccountBase):
    id: UUID
    balance: Decimal = Decimal(0)
    is_default: bool

    # Invoice fields (somente relevantes para cartao_credito)
    invoice_status: InvoiceStatus = InvoiceStatus.open
    invoice_closed_at: Optional[datetime] = None
    invoice_snapshot_amount: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class CurrentInvoiceResponse(BaseModel):
    """Resposta do endpoint GET /accounts/{id}/current-invoice"""
    account_id: UUID
    account_name: str
    invoice_status: InvoiceStatus
    invoice_amount: Decimal          # Valor calculado das transações da janela
    snapshot_amount: Optional[Decimal]  # Valor no fechamento (quando closed)
    period_start: date               # Início da janela da fatura
    period_end: date                 # Fim da janela (hoje ou closing_day)
    closing_day: Optional[int]
    due_day: Optional[int]
    days_to_close: Optional[int]     # None se já fechada
    credit_limit: Optional[Decimal]
    available_limit: Optional[Decimal]
    invoice_closed_at: Optional[datetime]
