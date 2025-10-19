# app/chat.py
from datetime import timedelta
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from .auth import get_current_user
from .db import get_db, now_utc
from .models import (
    ChatMessageIn,
    ChatRoleMessage,
    ChatHistoryResponse,
    ChatHistoryItem,
    Medication,
)
from .nlu import parse_texts

router = APIRouter(prefix="/chat", tags=["chat"])

DISCLAIMER = "Mes réponses sont informatives et ne remplacent pas un avis médical."

# -------------------------------------------------------------------
# app/chat.py (extrait) — remplacement complet de seed_medications_if_empty
async def seed_medications_if_empty(db: AsyncIOMotorDatabase) -> None:
    """
    Upsert des médicaments de base.
    - N'ajoute que ceux qui manquent (pas de doublons).
    - Permet d'enrichir la base même si elle n'est pas vide.
    """
    meds: List[Medication] = [
        # Douleur/fièvre
        Medication(
            name="Paracétamol",
            brands=["Doliprane", "Dafalgan", "Efferalgan"],
            indications=["fièvre", "maux de tête", "douleur"],
            contraindications=["allergie au paracétamol", "maladie hépatique"],
            min_age=6,
            max_age=None,
            dosage="500 mg toutes les 6 h (max 3 g/jour) adulte",
        ),
        Medication(
            name="Ibuprofène",
            brands=["Nurofen", "Advil"],
            indications=["douleur", "fièvre", "douleur musculaire"],
            contraindications=[
                "ulcère", "grossesse", "insuffisance rénale", "allergie ibuprofène"
            ],
            min_age=12,
            max_age=None,
            dosage="200-400 mg toutes les 6-8 h (max 1200 mg/jour) adulte",
        ),

        # Gorge
        Medication(
            name="Pastilles antiseptiques",
            brands=["Strepsils"],
            indications=["mal de gorge"],
            contraindications=["allergie au produit"],
            min_age=6,
            max_age=None,
            dosage="Suivre la notice; ne pas dépasser la dose",
        ),

        # Allergies / rhinite allergique
        Medication(
            name="Antihistaminique (cétirizine/loratadine)",
            brands=["Zyrtec", "Cétirizine", "Clarityne", "Loratadine"],
            indications=["allergie", "rhinite allergique"],
            contraindications=["allergie à l'antihistaminique", "grossesse"],
            min_age=6,
            max_age=None,
            dosage="Cétirizine 10 mg 1x/j adulte; Loratadine 10 mg 1x/j adulte (voir notice enfant)",
        ),

        # Reflux/pyrosis
        Medication(
            name="Antiacides (alginate/antiacide)",
            brands=["Gaviscon", "Maalox"],
            indications=["brûlures d'estomac", "reflux"],
            contraindications=["allergie au produit", "insuffisance rénale sévère (selon produit)"],
            min_age=12,
            max_age=None,
            dosage="Selon notice (après repas et au coucher)",
        ),

        # Diarrhée
        Medication(
            name="Solution de réhydratation orale (SRO)",
            brands=["ORS", "Adiaril"],
            indications=["diarrhée", "vomissement", "déshydratation"],
            contraindications=["vomissements incoercibles nécessitant avis urgent"],
            min_age=0,
            max_age=None,
            dosage="Petites quantités fréquentes; suivre la notice (poids/âge)",
        ),
        Medication(
            name="Diosmectite",
            brands=["Smecta", "Diosmectite"],
            indications=["diarrhée"],
            contraindications=["occlusion intestinale", "allergie au produit"],
            min_age=2,
            max_age=None,
            dosage="Selon notice (poches en suspension)",
        ),
        Medication(
            name="Lopéramide",
            brands=["Imodium", "Loperamide"],
            indications=["diarrhée"],
            contraindications=[
                "fièvre", "sang dans les selles", "colite", "grossesse",
                "enfant <12 ans", "allergie au lopéramide"
            ],
            min_age=12,
            max_age=None,
            dosage="2 mg après chaque selle liquide (max 8 mg/j) adulte; lire notice",
        ),

        # Toux (différencier sèche vs grasse)
        Medication(
            name="Antitussif (dextrométhorphane)",
            brands=["Tussidane", "Vicks sirop DM"],
            indications=["toux sèche"],
            contraindications=[
                "prise d'IMAO", "allergie DM", "enfant <12 ans", "grossesse",
            ],
            min_age=12,
            max_age=None,
            dosage="Selon notice; ne pas associer avec d'autres antitussifs/sédatifs",
        ),
        Medication(
            name="Expectorant (guaifénésine)",
            brands=["Humex Expectorant", "Toplexil Expectorant"],
            indications=["toux grasse"],
            contraindications=["allergie au produit", "enfant <12 ans selon spécialité"],
            min_age=12,
            max_age=None,
            dosage="Selon notice; boire suffisamment d’eau",
        ),

        # Douleurs/Spasmes abdominaux
        Medication(
            name="Antispasmodique (phloroglucinol)",
            brands=["Spasfon"],
            indications=["crampes abdominales", "douleur abdominale"],
            contraindications=["allergie au produit"],
            min_age=6,
            max_age=None,
            dosage="Selon notice",
        ),

        # Nausées
        Medication(
            name="Antinauée (dimenhydrinate)",
            brands=["Mercalm", "Nausicalm"],
            indications=["nausée", "vomissement"],
            contraindications=["glaucome", "allergie", "enfant <6 ans", "grossesse"],
            min_age=6,
            max_age=None,
            dosage="Selon notice; peut provoquer somnolence",
        ),
    ]

    # Upsert (ajoute si absent, n'écrase pas l'existant)
    for m in meds:
        await db["medications"].update_one(
            {"name": m.name},
            {"$setOnInsert": m.model_dump()},
            upsert=True,
        )

# Seed médicaments
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Sessions
# -------------------------------------------------------------------
async def create_new_chat(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    new_chat = {
        "user_id": user_id,
        "messages": [],
        "timestamp": now_utc(),
        "closed": False,
    }
    res = await db["chats"].insert_one(new_chat)
    new_chat["_id"] = res.inserted_id
    return new_chat


async def get_or_create_active_chat(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    """Renvoie la dernière session ouverte (<30min), sinon en crée une nouvelle."""
    thirty_min_ago = now_utc() - timedelta(minutes=30)
    last_open = await db["chats"].find_one(
        {"user_id": user_id, "closed": {"$ne": True}}, sort=[("timestamp", -1)]
    )
    if last_open and last_open.get("timestamp") and last_open["timestamp"] >= thirty_min_ago:
        return last_open
    return await create_new_chat(db, user_id)

# -------------------------------------------------------------------
# Logique de réponse
# -------------------------------------------------------------------
def build_bot_reply(
    known_age: Optional[int],
    found_allergies: List[str],
    found_symptoms: List[str],
    red_flags: List[str],
) -> str:
    if red_flags:
        return (
            "🚑 Symptômes d'alerte détectés. Appelle immédiatement les urgences (15/112) "
            "ou rends-toi au service d'urgence le plus proche. " + DISCLAIMER
        )
    if known_age is None:
        return "Quel âge a la personne concernée ? (ex: 25 ans)"
    if not found_allergies:
        return "Y a-t-il des allergies connues à des médicaments ?"
    if not found_symptoms:
        return "Quels sont les symptômes principaux ? (ex: fièvre, toux, maux de tête)"
    return ""


async def recommend_medication(
    db: AsyncIOMotorDatabase, symptoms: List[str], age: int, allergies: List[str]
) -> Optional[dict]:
    cursor = db["medications"].find({"indications": {"$in": symptoms}})
    candidates: List[dict] = [doc async for doc in cursor]

    def age_ok(m: dict) -> bool:
        min_age = m.get("min_age")
        max_age = m.get("max_age")
        if min_age is not None and age < min_age:
            return False
        if max_age is not None and age > max_age:
            return False
        return True

    def allergies_ok(m: dict) -> bool:
        lower_all = [a.lower() for a in allergies]
        text_fields = " ".join(
            [m.get("name", ""), " ".join(m.get("brands", [])), " ".join(m.get("contraindications", []))]
        ).lower()
        return not any(a in text_fields for a in lower_all)

    filtered = [m for m in candidates if age_ok(m) and allergies_ok(m)]
    return filtered[0] if filtered else None

# -------------------------------------------------------------------
# Modèles d'entrées/sorties pour /new et /close
# -------------------------------------------------------------------
class NewChatOut(BaseModel):
    chat_id: str


class CloseChatIn(BaseModel):
    chat_id: Optional[str] = None


class CloseChatOut(BaseModel):
    closed: bool
    error: Optional[str] = None

# -------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------
@router.post("/message", summary="Handle Message")
async def handle_message(
    payload: ChatMessageIn,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    await seed_medications_if_empty(db)

    chat = await get_or_create_active_chat(db, user_id=str(user["_id"]))
    messages: List[dict] = chat.get("messages", [])
    recent_texts = [m.get("text", "") for m in messages[-5:]] + [payload.message]

    nlu = parse_texts(recent_texts)
    age, allergies, symptoms, red_flags = nlu.age, nlu.allergies, nlu.symptoms, nlu.red_flags

    preliminary = build_bot_reply(age, allergies, symptoms, red_flags)

    if preliminary == "":
        assert age is not None
        rec = await recommend_medication(db, symptoms, age, allergies)
        if rec:
            brands = ", ".join(rec.get("brands", [])) or "—"
            dosage = rec.get("dosage", "Voir notice du médicament.")
            reply = (
                f"Pour {', '.join(symptoms)} chez {age} ans, je peux suggérer **{rec['name']}** "
                f"(marques: {brands}). Posologie: {dosage}.\n\n" + DISCLAIMER
            )
        else:
            reply = (
                "Je n'ai pas trouvé de suggestion médicamenteuse adaptée compte tenu de l'âge/allergies/symptômes. "
                "Consulte un pharmacien ou médecin. " + DISCLAIMER
            )
    else:
        reply = preliminary

    to_push = [{"role": "user", "text": payload.message}, {"role": "bot", "text": reply}]
    await db["chats"].update_one(
        {"_id": chat["_id"]},
        {"$push": {"messages": {"$each": to_push}}, "$set": {"timestamp": now_utc()}},
    )
    return {"reply": reply}


@router.get("/history", response_model=ChatHistoryResponse, summary="History")
async def history(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    user: Annotated[dict, Depends(get_current_user)],
) -> ChatHistoryResponse:
    cursor = db["chats"].find({"user_id": str(user["_id"])}).sort("timestamp", -1)
    items: List[ChatHistoryItem] = []
    async for doc in cursor:
        msgs = [ChatRoleMessage(role=m["role"], text=m["text"]) for m in doc.get("messages", [])]
        items.append(
            ChatHistoryItem(
                chat_id=str(doc["_id"]),
                messages=msgs,
                timestamp=doc["timestamp"].isoformat()
                if hasattr(doc["timestamp"], "isoformat")
                else str(doc["timestamp"]),
            )
        )
    return ChatHistoryResponse(items=items)


# --- new chat (avec et sans slash) ---
@router.post(
    "/new", response_model=NewChatOut, include_in_schema=True, summary="Create New Chat Session"
)
@router.post(
    "/new/", response_model=NewChatOut, include_in_schema=True, summary="Create New Chat Session (slash)"
)
async def create_chat_session(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    user: Annotated[dict, Depends(get_current_user)],
    close_previous: bool = True,
) -> NewChatOut:
    """
    Crée une nouvelle session. Si `close_previous=True`, ferme la dernière session ouverte.
    """
    uid = str(user["_id"])
    if close_previous:
        await db["chats"].find_one_and_update(
            {"user_id": uid, "closed": {"$ne": True}},
            {"$set": {"closed": True}},
            sort=[("timestamp", -1)],
        )
    new_doc = await create_new_chat(db, uid)
    return NewChatOut(chat_id=str(new_doc["_id"]))


# --- close chat (avec et sans slash) ---
@router.post(
    "/close", response_model=CloseChatOut, include_in_schema=True, summary="Close Chat Session"
)
@router.post(
    "/close/", response_model=CloseChatOut, include_in_schema=True, summary="Close Chat Session (slash)"
)
async def close_chat_session(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_db)],
    user: Annotated[dict, Depends(get_current_user)],
    payload: Optional[CloseChatIn] = None,
    chat_id: Optional[str] = Query(None),
) -> CloseChatOut:
    """
    Ferme une session :
    - si `payload.chat_id` (body JSON) ou `chat_id` (query) est fourni, ferme cette session,
    - sinon ferme la dernière session ouverte.
    """
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
