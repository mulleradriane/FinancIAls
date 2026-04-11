from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.models.feedback import Feedback
from app.models.user import User as UserModel
from app.schemas.feedback import FeedbackCreate, FeedbackOut
from app.routers.auth import get_current_user

router = APIRouter()


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
    return fb


@router.get("/", response_model=List[FeedbackOut])
def list_feedbacks(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    results = db.scalars(
        select(Feedback).order_by(Feedback.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return results
