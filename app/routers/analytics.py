from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.analytics import analytics_service
from app.schemas.analytics import (
    OperationalMonthly, SavingsRate, AssetsLiabilities, AccountBalance,
    BurnRate, NetWorth, DailyExpensesResponse, SankeyResponse
)
from app.schemas.goals import GoalProgress
from app.schemas.forecast import ForecastRead
from app.routers.auth import get_current_user
from app.models.user import User
from typing import List
from decimal import Decimal

router = APIRouter()

@router.get("/operational-monthly", response_model=List[OperationalMonthly])
def get_operational_monthly(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_operational_monthly(db, user_id=current_user.id)

@router.get("/savings-rate", response_model=List[SavingsRate])
def get_savings_rate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_savings_rate(db, user_id=current_user.id)

@router.get("/burn-rate", response_model=BurnRate)
def get_burn_rate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = analytics_service.get_burn_rate(db, user_id=current_user.id)
    return BurnRate(**data)

@router.get("/net-worth", response_model=NetWorth)
def get_net_worth(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    val = analytics_service.get_net_worth(db, user_id=current_user.id)
    return NetWorth(net_worth=val)

@router.get("/assets-liabilities", response_model=List[AssetsLiabilities])
def get_assets_liabilities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_assets_liabilities(db, user_id=current_user.id)

@router.get("/account-balances", response_model=List[AccountBalance])
def get_account_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_account_balances(db, user_id=current_user.id)

@router.get("/goals-progress", response_model=List[GoalProgress])
def get_goals_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_goals_progress(db, user_id=current_user.id)

@router.get("/forecast", response_model=ForecastRead)
def get_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_forecast(db, user_id=current_user.id)

@router.get("/daily-expenses", response_model=DailyExpensesResponse)
def get_daily_expenses(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_daily_expenses(db, user_id=current_user.id, year=year, month=month)

@router.get("/sankey", response_model=SankeyResponse)
def get_sankey_data(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return analytics_service.get_sankey_data(db, user_id=current_user.id, year=year, month=month)
