from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.summary import summary_service
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
    return summary_service.get_dashboard_data(db, user_id=current_user.id)

@router.get("/month")
def get_month_summary(
    year: int = Query(..., description="Ano"),
    month: int = Query(..., description="Mês"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resumo detalhado de um mês específico"""
    return summary_service.get_monthly_summary(db, year, month, user_id=current_user.id)

@router.get("/net-worth")
def get_net_worth_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resumo do Patrimônio Líquido"""
    return summary_service.get_net_worth(db, user_id=current_user.id)

@router.get("/cash-flow-summary")
def get_cash_flow_summary(
    months: int = Query(6, description="Quantidade de meses para análise"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Evolução do Fluxo de Caixa"""
    return summary_service.get_cash_flow_summary(db, user_id=current_user.id, months=months)
