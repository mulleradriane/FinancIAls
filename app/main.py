from fastapi import FastAPI
from app.routers.api import api_router
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(api_router)

@app.get("/")
def root():
    return {"message": "Welcome to FinancIAls API"}
