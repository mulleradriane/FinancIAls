import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinancIAls"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/financials")

    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))
    INVITE_CODE: Optional[str] = os.getenv("INVITE_CODE")

    # Email / feedback
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.office365.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    FEEDBACK_EMAIL_FROM: Optional[str] = os.getenv("FEEDBACK_EMAIL_FROM")
    FEEDBACK_EMAIL_TO: Optional[str] = os.getenv("FEEDBACK_EMAIL_TO")

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
