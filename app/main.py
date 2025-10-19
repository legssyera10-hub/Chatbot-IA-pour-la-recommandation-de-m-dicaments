# app/main.py
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase

from .auth import get_current_user
from .db import get_db, ensure_indexes, now_utc

# ⚠️ importe les routers existants
from .auth import router as auth_router
from .chat import router as chat_router

app = FastAPI(title="Medical Chatbot (non-diagnostic)", version="1.0.0")

# CORS — autorise le front (localhost & 127.0.0.1)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Enregistre les routers fournis par les modules
# -------------------------------------------------
app.include_router(auth_router)
app.include_router(chat_router)

# ------------------- Startup -------------------
@app.on_event("startup")
async def on_startup():
    # Vérif DB/index
    async for db in get_db():
        await ensure_indexes(db)
        break

    # 🔎 DIAGNOSTIC : imprime la liste des routes au démarrage
    print("=== FASTAPI ROUTES LOADED ===")
    for r in app.routes:
        methods = getattr(r, "methods", None)
        if methods:
            print(f"{sorted(methods)}  {r.path}")
        else:
            print(f"[no-methods] {r.path}")
    print("=== END ROUTE LIST ===")

# ------------------- Endpoints génériques -------------------
@app.get("/")
async def root():
    return {"ok": True}

@app.get("/health")
async def health():
    return {"status": "ok"}

# ============================================================
#  (Re)Déclare /chat/new et /chat/close au niveau app principale
#  => tags=["chat"] pour qu’ils s’affichent dans la section “chat”
#  => include_in_schema=True pour forcer Swagger
# ============================================================

# Input/Output models pour /chat/close
class CloseChatIn(BaseModel):
    chat_id: Optional[str] = None

class CloseChatOut(BaseModel):
    closed: bool
    error: Optional[str] = None

# NEW CHAT
@app.post("/chat/new", tags=["chat"], include_in_schema=True)
@app.post("/chat/new/", tags=["chat"], include_in_schema=True)
async def new_chat_endpoint(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    user: Annotated[dict, Depends(get_current_user)],
    close_previous: bool = True,
) -> dict:
    uid = str(user["_id"])
    if close_previous:
        await db["chats"].find_one_and_update(
            {"user_id": uid, "closed": {"$ne": True}},
            {"$set": {"closed": True}},
            sort=[("timestamp", -1)],
        )
    new_chat = {
        "user_id": uid,
        "messages": [],
        "timestamp": now_utc(),
        "closed": False,
    }
    res = await db["chats"].insert_one(new_chat)
    return {"chat_id": str(res.inserted_id)}

# CLOSE CHAT
@app.post("/chat/close",  response_model=CloseChatOut, tags=["chat"], include_in_schema=True)
@app.post("/chat/close/", response_model=CloseChatOut, tags=["chat"], include_in_schema=True)
async def close_chat_endpoint(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    user: Annotated[dict, Depends(get_current_user)],
    payload: Optional[CloseChatIn] = None,
    chat_id: Optional[str] = Query(None),
) -> CloseChatOut:
    uid = str(user["_id"])
    cid = (payload.chat_id if (payload and payload.chat_id) else chat_id)

    if cid:
        try:
            oid = ObjectId(cid)
        except Exception:
            return CloseChatOut(closed=False, error="chat_id invalide")

        result = await db["chats"].update_one(
            {"_id": oid, "user_id": uid, "closed": {"$ne": True}},
            {"$set": {"closed": True}},
        )
        return CloseChatOut(closed=(result.modified_count == 1))

    doc = await db["chats"].find_one_and_update(
        {"user_id": uid, "closed": {"$ne": True}},
        {"$set": {"closed": True}},
        sort=[("timestamp", -1)],
    )
    return CloseChatOut(closed=doc is not None)
