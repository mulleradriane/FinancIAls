from typing import List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
import calendar

from app.crud.account import account as crud_account
from app.schemas.account import Account, AccountCreate, AccountUpdate, CurrentInvoiceResponse
from app.models.account import Account as AccountModel, InvoiceStatus
from app.models.transaction import Transaction, TransactionNature
from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter()


# ── Utilitário: calcula janela da fatura corrente ──────────────────────────────
def _invoice_window(closing_day: int, ref_date: date | None = None) -> tuple[date, date]:
    """
    Retorna (period_start, period_end) da fatura corrente.
    Janela: (closing_day + 1) do mês anterior  →  closing_day do mês atual.
    """
    today = ref_date or date.today()

    # Fim da janela: closing_day do mês atual
    _, last_day = calendar.monthrange(today.year, today.month)
    end_day = min(closing_day, last_day)
    period_end = date(today.year, today.month, end_day)

    # Se hoje já passou do closing_day, a janela é para o próximo mês
    if today.day > closing_day:
        if today.month == 12:
            next_year, next_month = today.year + 1, 1
        else:
            next_year, next_month = today.year, today.month + 1
        _, last_day_next = calendar.monthrange(next_year, next_month)
        period_end = date(next_year, next_month, min(closing_day, last_day_next))

    # Início: dia após o fechamento efetivo do mês anterior ao period_end
    if period_end.month == 1:
        prev_year, prev_month = period_end.year - 1, 12
    else:
        prev_year, prev_month = period_end.year, period_end.month - 1

    _, last_day_prev = calendar.monthrange(prev_year, prev_month)
    effective_closing = min(closing_day, last_day_prev)

    if effective_closing < last_day_prev:
        # O dia seguinte ao fechamento existe no mês anterior
        period_start = date(prev_year, prev_month, effective_closing + 1)
    else:
        # Fechamento caiu no último dia do mês anterior → período começa no dia 1 do mês atual
        period_start = date(period_end.year, period_end.month, 1)

    return period_start, period_end


def _calc_invoice_amount(db: Session, account_id, period_start: date, period_end: date) -> Decimal:
    """Soma todas as despesas (amount < 0) do cartão na janela informada."""
    today = date.today()
    effective_end = min(period_end, today)

    result = db.scalar(
        select(func.sum(Transaction.amount)).filter(
            Transaction.account_id == account_id,
            Transaction.date >= period_start,
            Transaction.date <= effective_end,
            Transaction.amount < 0,
            Transaction.deleted_at.is_(None),
        )
    ) or Decimal(0)

    return abs(result)


# ── CRUD padrão ────────────────────────────────────────────────────────────────
@router.post("/", response_model=Account)
def create_account(
    obj_in: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_account.create_with_user(db, obj_in=obj_in, user_id=current_user.id)


@router.get("/", response_model=List[Account])
def read_accounts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_account.get_multi_with_balance(db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/{id}", response_model=Account)
def read_account(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_obj = crud_account.get_with_balance(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return db_obj


@router.put("/{id}", response_model=Account)
def update_account(
    id: UUID,
    obj_in: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_obj = crud_account.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud_account.update(db, db_obj=db_obj, obj_in=obj_in)


@router.delete("/{id}", response_model=Account)
def delete_account(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_obj = crud_account.get_by_user(db, id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud_account.remove_by_user(db, id=id, user_id=current_user.id)


@router.patch("/{id}/set-default", response_model=Account)
def set_default_account(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_obj = crud_account.set_default(db, account_id=id, user_id=current_user.id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud_account.get_with_balance(db, id=db_obj.id, user_id=current_user.id)


# ── GET /accounts/{id}/current-invoice ────────────────────────────────────────
@router.get("/{id}/current-invoice", response_model=CurrentInvoiceResponse)
def get_current_invoice(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o estado completo da fatura corrente de um cartão de crédito.
    Inclui: valor calculado, status, janela da fatura, dias para fechar,
    limite disponível.
    """
    acc = crud_account.get_by_user(db, id=id, user_id=current_user.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    if acc.type.value != "cartao_credito":
        raise HTTPException(status_code=400, detail="Account is not a credit card")
    if not acc.closing_day:
        raise HTTPException(status_code=400, detail="Account has no closing_day configured")

    today = date.today()
    period_start, period_end = _invoice_window(acc.closing_day)

    invoice_amount = _calc_invoice_amount(db, acc.id, period_start, period_end)

    # Dias para fechar (só relevante se fatura aberta)
    days_to_close: int | None = None
    if acc.invoice_status == InvoiceStatus.open:
        days_to_close = (period_end - today).days
        if days_to_close < 0:
            days_to_close = 0  # já deveria ter fechado — data retroativa

    credit_limit = Decimal(acc.credit_limit) if acc.credit_limit else None
    available_limit = (credit_limit - invoice_amount) if credit_limit else None

    return CurrentInvoiceResponse(
        account_id=acc.id,
        account_name=acc.name,
        invoice_status=acc.invoice_status,
        invoice_amount=invoice_amount,
        snapshot_amount=acc.invoice_snapshot_amount,
        period_start=period_start,
        period_end=period_end,
        closing_day=acc.closing_day,
        due_day=acc.due_day,
        days_to_close=days_to_close,
        credit_limit=credit_limit,
        available_limit=available_limit,
        invoice_closed_at=acc.invoice_closed_at,
    )


# ── POST /accounts/{id}/close-invoice ─────────────────────────────────────────
@router.post("/{id}/close-invoice", response_model=CurrentInvoiceResponse)
def close_invoice(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fecha a fatura corrente do cartão:
    1. Calcula e salva o snapshot do valor da fatura
    2. Marca invoice_status = 'closed'
    3. Registra invoice_closed_at = now()

    O frontend pode chamar este endpoint no dia do fechamento (closing_day).
    Ele é idempotente: se já fechada, retorna os dados sem alterar nada.
    """
    acc = crud_account.get_by_user(db, id=id, user_id=current_user.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    if acc.type.value != "cartao_credito":
        raise HTTPException(status_code=400, detail="Account is not a credit card")
    if not acc.closing_day:
        raise HTTPException(status_code=400, detail="Account has no closing_day configured")

    period_start, period_end = _invoice_window(acc.closing_day)
    invoice_amount = _calc_invoice_amount(db, acc.id, period_start, period_end)

    # Idempotente: já está fechada
    if acc.invoice_status == InvoiceStatus.closed:
        credit_limit = Decimal(acc.credit_limit) if acc.credit_limit else None
        available = (credit_limit - invoice_amount) if credit_limit else None
        return CurrentInvoiceResponse(
            account_id=acc.id,
            account_name=acc.name,
            invoice_status=acc.invoice_status,
            invoice_amount=invoice_amount,
            snapshot_amount=acc.invoice_snapshot_amount,
            period_start=period_start,
            period_end=period_end,
            closing_day=acc.closing_day,
            due_day=acc.due_day,
            days_to_close=None,
            credit_limit=credit_limit,
            available_limit=available,
            invoice_closed_at=acc.invoice_closed_at,
        )

    # Fecha a fatura
    from datetime import timezone
    acc.invoice_status = InvoiceStatus.closed
    acc.invoice_closed_at = datetime.now(timezone.utc)
    acc.invoice_snapshot_amount = invoice_amount
    db.add(acc)
    db.commit()
    db.refresh(acc)

    credit_limit = Decimal(acc.credit_limit) if acc.credit_limit else None
    available = (credit_limit - invoice_amount) if credit_limit else None

    return CurrentInvoiceResponse(
        account_id=acc.id,
        account_name=acc.name,
        invoice_status=InvoiceStatus.closed,
        invoice_amount=invoice_amount,
        snapshot_amount=invoice_amount,
        period_start=period_start,
        period_end=period_end,
        closing_day=acc.closing_day,
        due_day=acc.due_day,
        days_to_close=None,
        credit_limit=credit_limit,
        available_limit=available,
        invoice_closed_at=acc.invoice_closed_at,
    )


# ── POST /accounts/{id}/reopen-invoice ────────────────────────────────────────
@router.post("/{id}/reopen-invoice", response_model=Account)
def reopen_invoice(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reabre uma fatura fechada (ex: lançamento esquecido após o fechamento).
    Limpa o snapshot e volta status para 'open'.
    """
    acc = crud_account.get_by_user(db, id=id, user_id=current_user.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    if acc.type.value != "cartao_credito":
        raise HTTPException(status_code=400, detail="Account is not a credit card")

    acc.invoice_status = InvoiceStatus.open
    acc.invoice_closed_at = None
    acc.invoice_snapshot_amount = None
    db.add(acc)
    db.commit()

    return crud_account.get_with_balance(db, id=acc.id, user_id=current_user.id)


# ── POST /accounts/{id}/next-invoice ──────────────────────────────────────────
@router.post("/{id}/next-invoice", response_model=Account)
def advance_to_next_invoice(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Após o pagamento da fatura, reabre o cartão para o próximo ciclo.
    Equivalente ao reopen-invoice — mantido como alias semântico para o frontend.
    """
    acc = crud_account.get_by_user(db, id=id, user_id=current_user.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    acc.invoice_status = InvoiceStatus.open
    acc.invoice_closed_at = None
    acc.invoice_snapshot_amount = None
    db.add(acc)
    db.commit()

    return crud_account.get_with_balance(db, id=acc.id, user_id=current_user.id)
