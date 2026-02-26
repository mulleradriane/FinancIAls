from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.financial_engine import financial_engine
from app.routers.auth import get_current_user
from app.models.user import User
from datetime import date
from typing import Optional

router = APIRouter()

@router.get("/")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resumo geral para o Dashboard"""
    today = date.today()

    available_balance = financial_engine.calculate_available_balance(db, user_id=current_user.id)
    net_worth_data = financial_engine.calculate_net_worth(db, user_id=current_user.id)
    monthly_totals = financial_engine.get_monthly_totals(db, today.year, today.month, user_id=current_user.id)
    cash_flow = financial_engine.get_cash_flow_evolution(db, user_id=current_user.id)

    return {
        "available_balance": available_balance,
        "assets": net_worth_data["assets"],
        "liabilities": net_worth_data["liabilities"],
        "net_worth": net_worth_data["net_worth"],
        "monthly_income": monthly_totals["income"],
        "monthly_expense": monthly_totals["expense"],
        "monthly_result": monthly_totals["result"],
        "cash_flow_evolution": cash_flow
    }

@router.get("/month")
def get_month_summary(
    year: int = Query(..., description="Ano"),
    month: int = Query(..., description="Mês"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resumo detalhado de um mês específico"""
    return financial_engine.get_monthly_totals(db, year, month, user_id=current_user.id)

@router.get("/net-worth")
def get_net_worth_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resumo do Patrimônio Líquido"""
    return financial_engine.calculate_net_worth(db, user_id=current_user.id)

@router.get("/cash-flow-summary")
def get_cash_flow_summary(
    months: int = Query(6, description="Quantidade de meses para análise"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Evolução do Fluxo de Caixa"""
    return financial_engine.get_cash_flow_evolution(db, user_id=current_user.id, months=months)
