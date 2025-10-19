# app/db.py
from datetime import datetime
import os
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, TEXT

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "medchat")

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def now_utc() -> datetime:
    # IMPORTANT : PyMongo attend des datetimes naïfs en UTC (par défaut tz_aware=False)
    # -> on renvoie datetime.utcnow() (naïf) au lieu d'un datetime avec timezone.
    return datetime.utcnow()


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI, uuidRepresentation="standard")
        _db = _client[MONGODB_DB]
    assert _db is not None
    yield _db


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db["users"].create_index([("username", ASCENDING)], unique=True)
    await db["medications"].create_index(
        [("name", TEXT), ("indications", TEXT), ("brands", TEXT)]
    )
    await db["chats"].create_index([("user_id", ASCENDING), ("timestamp", ASCENDING)])
