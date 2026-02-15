from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.summary import summary_service
from app.schemas.summary import MonthlySummary, YearlySummary
from app.core.database import get_db

router = APIRouter()

@router.get("/month", response_model=MonthlySummary)
def get_monthly_summary(year: int, month: int, db: Session = Depends(get_db)):
    return summary_service.get_monthly_summary(db, year=year, month=month)

@router.get("/year", response_model=YearlySummary)
def get_yearly_summary(year: int, db: Session = Depends(get_db)):
    return summary_service.get_yearly_summary(db, year=year)
