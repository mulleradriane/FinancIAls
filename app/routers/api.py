from fastapi import APIRouter
from app.routers import category, transaction, recurring_expense, summary, account, analytics

api_router = APIRouter()
api_router.include_router(category.router, prefix="/categories", tags=["categories"])
api_router.include_router(transaction.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(recurring_expense.router, prefix="/recurring-expenses", tags=["recurring-expenses"])
api_router.include_router(summary.router, prefix="/summary", tags=["summary"])
api_router.include_router(account.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
