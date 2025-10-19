import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

from .db import get_db
from .models import UserCreate, TokenResponse

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "change_me_please_very_secret")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "120"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# >>> objet requis par main.py
router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(sub: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MIN)
    to_encode = {"sub": sub, "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
) -> dict:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise cred_exc
    except jwt.PyJWTError:
        raise cred_exc

    user = await db["users"].find_one({"username": username})
    if not user:
        raise cred_exc
    return user


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(data: UserCreate, db: Annotated[AsyncIOMotorDatabase, Depends(get_db)]):
    existing = await db["users"].find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=409, detail="Ce nom d'utilisateur existe déjà.")
    await db["users"].insert_one(
        {
            "username": data.username,
            "password_hash": hash_password(data.password),
            "created_at": datetime.now(timezone.utc),
        }
    )
    token = create_access_token(sub=data.username)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
):
    user = await db["users"].find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect.")
    token = create_access_token(sub=form_data.username)
    return TokenResponse(access_token=token)
