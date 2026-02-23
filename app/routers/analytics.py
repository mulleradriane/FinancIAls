from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.analytics import analytics_service
from app.schemas.analytics import (
    OperationalMonthly, SavingsRate, AssetsLiabilities, AccountBalance,
    BurnRate, NetWorth
)
from app.schemas.goals import GoalProgress
from typing import List
from decimal import Decimal

router = APIRouter()

@router.get("/operational-monthly", response_model=List[OperationalMonthly])
def get_operational_monthly(db: Session = Depends(get_db)):
    return analytics_service.get_operational_monthly(db)

@router.get("/savings-rate", response_model=List[SavingsRate])
def get_savings_rate(db: Session = Depends(get_db)):
    return analytics_service.get_savings_rate(db)

@router.get("/burn-rate", response_model=BurnRate)
def get_burn_rate(db: Session = Depends(get_db)):
    data = analytics_service.get_burn_rate(db)
    return BurnRate(**data)

@router.get("/net-worth", response_model=NetWorth)
def get_net_worth(db: Session = Depends(get_db)):
    val = analytics_service.get_net_worth(db)
    return NetWorth(net_worth=val)

@router.get("/assets-liabilities", response_model=List[AssetsLiabilities])
def get_assets_liabilities(db: Session = Depends(get_db)):
    return analytics_service.get_assets_liabilities(db)

@router.get("/account-balances", response_model=List[AccountBalance])
def get_account_balances(db: Session = Depends(get_db)):
    return analytics_service.get_account_balances(db)

@router.get("/goals-progress", response_model=List[GoalProgress])
def get_goals_progress(db: Session = Depends(get_db)):
    return analytics_service.get_goals_progress(db)
