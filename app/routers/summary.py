from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.summary import summary_service
from app.schemas.summary import MonthlySummary, YearlySummary, DashboardData, CashFlowDay, NetWorthData
from app.core.database import get_db
from typing import List

router = APIRouter()

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(db: Session = Depends(get_db)):
    return summary_service.get_dashboard_data(db)

@router.get("/month", response_model=MonthlySummary)
def get_monthly_summary(year: int, month: int, db: Session = Depends(get_db)):
    return summary_service.get_monthly_summary(db, year=year, month=month)

@router.get("/year", response_model=YearlySummary)
def get_yearly_summary(year: int, db: Session = Depends(get_db)):
    return summary_service.get_yearly_summary(db, year=year)

@router.get("/cash-flow", response_model=List[CashFlowDay])
def get_cash_flow(db: Session = Depends(get_db)):
    return summary_service.get_cash_flow(db)

@router.get("/net-worth", response_model=NetWorthData)
def get_net_worth(db: Session = Depends(get_db)):
    return summary_service.get_net_worth(db)
