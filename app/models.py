# app/models.py
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ---------- Auth ----------
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


# ---------- Chat (IO) ----------
class ChatMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatRoleMessage(BaseModel):
    role: Literal["user", "bot"]
    text: str


class ChatHistoryItem(BaseModel):
    chat_id: str
    messages: List[ChatRoleMessage]
    timestamp: str


class ChatHistoryResponse(BaseModel):
    items: List[ChatHistoryItem]


# ---------- Médicaments (schéma logique en DB) ----------
class Medication(BaseModel):
    name: str
    brands: List[str] = []
    indications: List[str] = []
    contraindications: List[str] = []
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    dosage: Optional[str] = None
