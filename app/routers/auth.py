from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import select
import re

from app.core.database import get_db
from app.core.config import settings
from app.schemas.user import User, UserCreate, UserUpdate
from app.schemas.auth import Token, TokenData, Login
from app.models.user import User as UserModel
from app.services.auth import (
    create_access_token,
    verify_password,
    get_password_hash,
    ALGORITHM
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> UserModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    user = db.scalar(select(UserModel).filter(UserModel.username == token_data.username))
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=User)
def register(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate
) -> Any:
    # Validate Invite Code if configured
    if settings.INVITE_CODE and user_in.invite_code != settings.INVITE_CODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de convite inválido"
        )

    # Validate Username
    if not re.match(r"^[a-zA-Z0-9_]+$", user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome de usuário deve conter apenas letras, números e underscores"
        )
    if len(user_in.username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome de usuário deve ter pelo menos 3 caracteres"
        )

    # Validate Password
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve ter pelo menos 6 caracteres"
        )

    # Check if user already exists
    user = db.scalar(select(UserModel).filter(UserModel.username == user_in.username))
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este nome de usuário já está em uso",
        )

    db_obj = UserModel(
        username=user_in.username,
        display_name=user_in.display_name,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db),
    login_in: Login = None
) -> Any:
    user = db.scalar(select(UserModel).filter(UserModel.username == login_in.username))
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.username, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(get_current_user),
) -> Any:
    return current_user

@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Update current user.
    """
    if user_in.username:
        # Validate Username format
        if not re.match(r"^[a-zA-Z0-9_]+$", user_in.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome de usuário deve conter apenas letras, números e underscores"
            )
        if len(user_in.username) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome de usuário deve ter pelo menos 3 caracteres"
            )

        # Check if new username is already taken by someone else
        if user_in.username != current_user.username:
            user = db.scalar(select(UserModel).filter(UserModel.username == user_in.username))
            if user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este nome de usuário já está em uso",
                )
            current_user.username = user_in.username

    if user_in.display_name:
        current_user.display_name = user_in.display_name

    if user_in.password:
        # Validate Password
        if len(user_in.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A senha deve ter pelo menos 6 caracteres"
            )
        current_user.hashed_password = get_password_hash(user_in.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/config")
def get_auth_config():
    return {
        "invite_required": bool(settings.INVITE_CODE)
    }
