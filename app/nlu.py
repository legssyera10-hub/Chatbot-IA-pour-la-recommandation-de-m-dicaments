# app/nlu.py
import re
import unicodedata
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Set, Tuple


# ---------- utils ----------
def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def _norm(s: str) -> str:
    s = s.strip().lower()
    s = _strip_accents(s)
    return re.sub(r"\s+", " ", s)


# ---------- sorties ----------
@dataclass
class NLUResult:
    age: Optional[int] = None
    symptoms: List[str] = field(default_factory=list)
    negated_symptoms: List[str] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    duration_days: Optional[float] = None
    severity: Optional[str] = None  # "mild" | "moderate" | "severe"
    red_flags: List[str] = field(default_factory=list)
    raw_text: str = ""


# ---------- lexiques simples ----------
SYMPTOM_LEXICON: Dict[str, List[str]] = {
    "fièvre": ["fievre", "temperature", "temperature elevee"],
    "maux de tête": ["mal de tete", "cephalee", "migraine"],
    "toux": ["toux seche", "toux grasse"],
    "rhume": ["nez bouche", "rhinite", "ecoulement nasal"],
    "grippe": [],
    "nausée": ["nausee", "envie de vomir"],
    "vomissement": ["vomissements"],
    "mal de gorge": ["gorge", "angine", "douleur a la gorge", "douleur gorge"],
    "douleur musculaire": ["courbatures", "myalgie"],
    "diarrhée": ["diarrhee"],
    "douleur": ["douleurs"],
}

RED_FLAG_PATTERNS: List[str] = [
    "douleur thoracique",
    "oppression thoracique",
    "difficulte a respirer",
    "difficulté à respirer",
    "essoufflement severe",
    "essoufflement sévère",
    "paralysie",
    "faiblesse d un cote",
    "faiblesse d'un côté",
    "confusion soudaine",
    "perte de connaissance",
    "saignement abondant",
]

DURATION_UNITS = {
    "heure": 1/24.0, "heures": 1/24.0, "h": 1/24.0,
    "jour": 1.0, "jours": 1.0, "j": 1.0,
    "semaine": 7.0, "semaines": 7.0, "sem": 7.0,
    "mois": 30.0,
}

SEVERITY_MAP: Dict[str, str] = {
    "legere": "mild", "légère": "mild", "leger": "mild", "léger": "mild",
    "moderee": "moderate", "modérée": "moderate", "modere": "moderate",
    "forte": "severe", "intense": "severe", "severe": "severe", "sévère": "severe",
}


# ---------- détecteurs ----------
def _detect_age(texts: List[str]) -> Optional[int]:
    patt = re.compile(r"(?<!\d)(\d{1,3})\s*(ans|an|yo|year|years?)", re.I)
    for t in reversed(texts):
        m = patt.search(_norm(t))
        if m:
            age = int(m.group(1))
            if 0 < age < 130:
                return age
    return None

def _detect_allergies(texts: List[str]) -> List[str]:
    patt = re.compile(r"allerg\w+\s*(?:a|à|au|aux)?\s*([a-z0-9\-]+)", re.I)
    found: Set[str] = set()
    for t in texts:
        for m in patt.finditer(_norm(t)):
            found.add(m.group(1))
    return sorted(found)

def _detect_duration_days(texts: List[str]) -> Optional[float]:
    patt = re.compile(
        r"(depuis|pendant|il y a)\s*(\d{1,3})\s*(heures?|h|jours?|j|semaines?|sem|mois)",
        re.I,
    )
    for t in reversed(texts):
        m = patt.search(_norm(t))
        if m:
            val = float(m.group(2))
            unit = m.group(3).lower()
            return val * DURATION_UNITS.get(unit, 1.0)
    return None

def _detect_severity(texts: List[str]) -> Optional[str]:
    s = _norm(" ".join(texts))
    for k, v in SEVERITY_MAP.items():
        if re.search(rf"\b{k}\b", s):
            return v
    return None

def _detect_symptoms_and_negations(texts: List[str]) -> Tuple[Set[str], Set[str]]:
    s = _norm(" ".join(texts))
    positives: Set[str] = set()
    negated: Set[str] = set()

    # pour chaque canon + synonymes
    canon_to_syns: Dict[str, List[str]] = {canon: [canon] + syns for canon, syns in SYMPTOM_LEXICON.items()}

    NEG_TEMPLATES = [
        r"pas de {x}\b", r"aucun(?:e)? {x}\b", r"sans {x}\b", r"ni {x}\b",
        r"ne\s+\w+\s+pas\s+(?:de\s+)?{x}\b",
    ]

    for canon, variants in canon_to_syns.items():
        for var in variants:
            var_re = re.escape(_norm(var))
            # négation ?
            if any(re.search(tpl.format(x=var_re), s) for tpl in NEG_TEMPLATES):
                negated.add(canon)
            # mention positive ?
            if re.search(rf"\b{var_re}\b", s):
                positives.add(canon)

    positives -= negated
    return positives, negated

def _detect_red_flags(texts: List[str]) -> List[str]:
    s = _norm(" ".join(texts))
    return [rf for rf in RED_FLAG_PATTERNS if rf in s]


# ---------- point d'entrée ----------
def parse_texts(texts: List[str]) -> NLUResult:
    """
    Analyse une liste de messages (contexte court + message courant)
    et retourne un NLUResult structuré.
    """
    age = _detect_age(texts)
    allergies = _detect_allergies(texts)
    duration = _detect_duration_days(texts)
    severity = _detect_severity(texts)
    positives, neg = _detect_symptoms_and_negations(texts)
    red = _detect_red_flags(texts)

    return NLUResult(
        age=age,
        symptoms=sorted(list(positives)),
        negated_symptoms=sorted(list(neg)),
        allergies=allergies,
        duration_days=duration,
        severity=severity,
        red_flags=red,
        raw_text=_norm(" ".join(texts)),
    )
