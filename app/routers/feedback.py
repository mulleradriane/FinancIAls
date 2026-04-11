import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.models.feedback import Feedback
from app.models.user import User as UserModel
from app.schemas.feedback import FeedbackCreate, FeedbackOut
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def _send_email_notification(feedback: Feedback) -> None:
    """Send email notification for new feedback. Silently skips if not configured."""
    if not settings.FEEDBACK_EMAIL_TO:
        return

    try:
        stars = "★" * (feedback.rating or 0) + "☆" * (5 - (feedback.rating or 0))
        page = feedback.page or "—"
        username = feedback.username or "anônimo"

        body = f"""
<html><body style="font-family: sans-serif; color: #333;">
  <h2 style="color: #f59e0b;">💬 Novo feedback — FinancIAls</h2>
  <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
    <tr><td style="padding: 6px 12px; font-weight: bold;">Usuário</td><td style="padding: 6px 12px;">{username}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding: 6px 12px; font-weight: bold;">Página</td><td style="padding: 6px 12px;">{page}</td></tr>
    <tr><td style="padding: 6px 12px; font-weight: bold;">Nota</td><td style="padding: 6px 12px;">{stars} ({feedback.rating or "sem nota"})</td></tr>
  </table>
  <div style="margin-top: 16px; padding: 12px 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
    <p style="margin: 0; white-space: pre-wrap;">{feedback.message}</p>
  </div>
</body></html>
"""

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[FinancIAls] Feedback de {username}" + (f" — {stars}" if feedback.rating else "")
        msg["From"] = settings.FEEDBACK_EMAIL_FROM or settings.FEEDBACK_EMAIL_TO
        msg["To"] = settings.FEEDBACK_EMAIL_TO
        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.ehlo()
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(msg["From"], [msg["To"]], msg.as_string())

        logger.info("Feedback email sent to %s", settings.FEEDBACK_EMAIL_TO)
    except Exception as exc:
        logger.warning("Failed to send feedback email: %s", exc)


@router.post("/", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    fb = Feedback(
        user_id=current_user.id,
        username=current_user.username,
        page=payload.page,
        rating=payload.rating,
        message=payload.message,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    _send_email_notification(fb)
    return fb


@router.get("/", response_model=List[FeedbackOut])
def list_feedbacks(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Admin endpoint — returns all feedbacks ordered by newest first."""
    results = db.scalars(
        select(Feedback).order_by(Feedback.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return results
