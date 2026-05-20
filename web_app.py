"""Application web responsive pour KUME."""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
import importlib.util
import hashlib
import os
from pathlib import Path
import secrets
import uuid

import time
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import config
from calorie_calculator import calories_depensees
from db_manager import DatabaseManager
from exercise_analyzer import ExerciseAnalyzer
from session_logger import SessionLogger
from user_profile import UserProfile
from web_pose_utils import detecter_orientation
from workout_planner import WorkoutExercise, WorkoutPlan, creer_plan_automatique


BASE_DIR = Path(__file__).resolve().parent
DOSSIER_STATIQUES = BASE_DIR / "static"
DOSSIER_EXPORTS = config.DOSSIER_SORTIES


def _split_env_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


DB_PATH = Path(os.getenv("DB_PATH", str(config.DOSSIER_DONNEES / "fitness_data.db")))
CORS_ORIGINS = _split_env_list(os.getenv("CORS_ORIGINS", "")) or [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

DB = DatabaseManager(DB_PATH)

TEMPS_PAR_REP = 3.0
TEMPS_PAR_REP_RAPIDE = 2.2
SESSION_MAX_AGE_SEC = 4 * 60 * 60
NIVEAUX_VALIDES = {"debutant", "intermediaire", "avance"}
SEXES_VALIDES = {"M", "F"}
THEMES = {
    "kume": {
        "key": "kume",
        "label": "KUME",
        "description": "Palette claire, verte et douce inspiree de l univers KUME.",
    }
}
MOIS_FR = [
    "janvier",
    "fevrier",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "aout",
    "septembre",
    "octobre",
    "novembre",
    "decembre",
]
BADGES_MENSUELS = [
    {
        "id": "starter",
        "title": "Decollage",
        "description": "Lancer au moins une seance dans le mois.",
        "metric": "sessions",
        "target": 1.0,
        "icon": "rocket",
        "tone": "accent",
        "unit": "seance",
    },
    {
        "id": "momentum",
        "title": "Rythme",
        "description": "Atteindre 6 seances sur le mois.",
        "metric": "sessions",
        "target": 6.0,
        "icon": "zap",
        "tone": "gold",
        "unit": "seances",
    },
    {
        "id": "consistency",
        "title": "Constante",
        "description": "Cumuler 8 jours actifs dans le mois.",
        "metric": "active_days",
        "target": 8.0,
        "icon": "calendar",
        "tone": "accent",
        "unit": "jours",
    },
    {
        "id": "power",
        "title": "Puissance",
        "description": "Depasser 900 kcal sur le mois.",
        "metric": "calories",
        "target": 900.0,
        "icon": "flame",
        "tone": "secondary",
        "unit": "kcal",
    },
    {
        "id": "mastery",
        "title": "Maitrise",
        "description": "Signer un score de 85/100 ou plus.",
        "metric": "best_score",
        "target": 85.0,
        "icon": "crown",
        "tone": "gold",
        "unit": "/100",
    },
]
EXERCISE_KEY_BY_NAME = {str(infos["nom"]).lower(): cle for cle, infos in config.EXERCICES.items()}

@asynccontextmanager
async def lifespan(application: FastAPI):
    DOSSIER_EXPORTS.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="KUME",
    description=(
        "API haute performance pour le coaching sportif KUME. "
        "Detection de posture MediaPipe temps reel, score qualite, "
        "suivi repetitions, calories, historique et exports complets."
    ),
    version="3.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "auth", "description": "Inscription et connexion"},
        {"name": "users", "description": "Profils et preferences"},
        {"name": "sessions", "description": "Sessions d entrainement live"},
        {"name": "exercises", "description": "Catalogue et conseils d exercices"},
        {"name": "plans", "description": "Planification automatique"},
        {"name": "system", "description": "Sante et metriques systeme"},
    ],
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── Middlewares ──────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)
DOSSIER_DIST = BASE_DIR / "static" / "dist"
if DOSSIER_DIST.exists():
    app.mount("/assets", StaticFiles(directory=DOSSIER_DIST / "assets"), name="assets")
app.mount("/static", StaticFiles(directory=DOSSIER_STATIQUES), name="static")
app.mount("/exports", StaticFiles(directory=DOSSIER_EXPORTS), name="exports")

# ─── Rate limiting en memoire ────────────────────────────────
_rate_store: dict[str, list[float]] = {}
RATE_WINDOW_SEC = 60.0
RATE_MAX_REQUESTS = 240


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window = [t for t in _rate_store.get(client, []) if now - t < RATE_WINDOW_SEC]
    if len(window) >= RATE_MAX_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Trop de requetes. Reessaie dans un instant."},
        )
    window.append(now)
    _rate_store[client] = window
    return await call_next(request)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur. Relance l application."},
    )


class ProfilePayload(BaseModel):
    id: int | None = None
    prenom: str = Field(min_length=1, max_length=50)
    age: int = Field(ge=10, le=90)
    taille_cm: float = Field(ge=120, le=230)
    poids_kg: float = Field(ge=35, le=200)
    sexe: str = "M"
    niveau: str = "debutant"


class RegisterPayload(BaseModel):
    prenom: str = Field(min_length=1, max_length=50)
    email: str = Field(min_length=5, max_length=120)
    mot_de_passe: str = Field(min_length=6, max_length=120)
    age: int = Field(ge=10, le=90)
    taille_cm: float = Field(ge=120, le=230)
    poids_kg: float = Field(ge=35, le=200)
    sexe: str = "M"
    niveau: str = "debutant"
    theme: str = "kume"


class LoginPayload(BaseModel):
    email: str = Field(min_length=5, max_length=120)
    mot_de_passe: str = Field(min_length=6, max_length=120)


class LocalAuthPayload(BaseModel):
    prenom: str = Field(min_length=1, max_length=50)
    niveau: str = "debutant"
    local_id: str = Field(min_length=6, max_length=80)


class ThemePayload(BaseModel):
    theme: str


class PlanExercisePayload(BaseModel):
    cle: str
    mode: str | None = None
    objectif_reps: int | None = Field(default=None, ge=1, le=200)
    objectif_secondes: int | None = Field(default=None, ge=5, le=1800)


class LocalSessionPayload(BaseModel):
    prenom: str | None = None
    niveau: str | None = None


class SessionCreatePayload(BaseModel):
    user_id: int
    plan: list[PlanExercisePayload] = Field(default_factory=list)
    local_profile: LocalSessionPayload | None = None


class LandmarkPayload(BaseModel):
    x: float
    y: float
    z: float = 0.0
    visibility: float = 0.0


class AnalyzePayload(BaseModel):
    landmarks: dict[str, LandmarkPayload] = Field(default_factory=dict)
    elapsed_sec: float = Field(ge=0)
    fps: float | None = Field(default=None, ge=0)


class ExerciseChangePayload(BaseModel):
    exercise_key: str
    elapsed_sec: float = Field(ge=0)


def normaliser_niveau(niveau: str) -> str:
    valeur = niveau.strip().lower()
    if valeur not in NIVEAUX_VALIDES:
        raise HTTPException(status_code=422, detail="Niveau invalide.")
    return valeur


def normaliser_sexe(sexe: str) -> str:
    valeur = sexe.strip().upper()
    if valeur not in SEXES_VALIDES:
        raise HTTPException(status_code=422, detail="Sexe invalide.")
    return valeur


def normaliser_theme(theme: str) -> str:
    valeur = theme.strip().lower()
    if valeur in {"ember", "ocean", "dawn", "kume"}:
        return "kume"
    if valeur not in THEMES:
        raise HTTPException(status_code=422, detail="Theme invalide.")
    return "kume"


def borner_pourcentage(valeur: float) -> float:
    return max(0.0, min(float(valeur), 100.0))


def jour_iso(valeur: str | None = None) -> str:
    if not valeur:
        return datetime.now().strftime("%Y-%m-%d")
    return valeur[:10]


def calculer_serie_actuelle(dates_activite: list[str]) -> int:
    if not dates_activite:
        return 0

    uniques: list[date] = []
    for valeur in sorted({jour_iso(item) for item in dates_activite if item}, reverse=True):
        try:
            uniques.append(datetime.strptime(valeur, "%Y-%m-%d").date())
        except ValueError:
            continue

    if not uniques:
        return 0

    aujourd_hui = datetime.now().date()
    if uniques[0] < (aujourd_hui - timedelta(days=1)):
        return 0

    serie = 0
    attendu = uniques[0]
    for courant in uniques:
        if courant == attendu:
            serie += 1
            attendu -= timedelta(days=1)
            continue
        if courant < attendu:
            break
    return serie


def premier_jour_du_mois(base: date) -> date:
    return base.replace(day=1)


def decaler_mois(base: date, delta: int) -> date:
    mois_index = (base.month - 1) + delta
    annee = base.year + (mois_index // 12)
    mois = (mois_index % 12) + 1
    return date(annee, mois, 1)


def cle_mois(base: date) -> str:
    return base.strftime("%Y-%m")


def libelle_mois(cle: str) -> str:
    try:
        annee_str, mois_str = cle.split("-", maxsplit=1)
        mois = int(mois_str)
        annee = int(annee_str)
    except ValueError:
        return cle
    if 1 <= mois <= 12:
        return f"{MOIS_FR[mois - 1].capitalize()} {annee}"
    return cle


def construire_progression_journaliere(
    lignes: list[object],
    jours: int,
) -> list[dict[str, object]]:
    index = {
        jour_iso(str(ligne["date"])): ligne
        for ligne in lignes
    }
    depart = datetime.now().date() - timedelta(days=max(jours - 1, 0))
    progression: list[dict[str, object]] = []

    for offset in range(jours):
        courant = depart + timedelta(days=offset)
        cle = courant.strftime("%Y-%m-%d")
        ligne = index.get(cle)
        progression.append(
            {
                "date": cle,
                "calories": round(float(ligne["calories_totales"]), 2) if ligne else 0.0,
                "score": round(borner_pourcentage(float(ligne["score_moyen"])), 2) if ligne else 0.0,
                "duration_sec": round(float(ligne["duree_totale"]), 2) if ligne else 0.0,
            }
        )

    return progression


def construire_badges_mensuels(user_id: int, mois_a_afficher: int = 4) -> list[dict[str, object]]:
    progression = DB.recuperer_progression(user_id, jours=190)
    scores = DB.recuperer_scores_seances(user_id, jours=190)
    stats_par_mois: defaultdict[str, dict[str, float]] = defaultdict(
        lambda: {
            "sessions": 0.0,
            "active_days": 0.0,
            "calories": 0.0,
            "duration_sec": 0.0,
            "best_score": 0.0,
            "avg_score_sum": 0.0,
            "avg_score_count": 0.0,
        }
    )

    for ligne in progression:
        mois = str(ligne["date"])[:7]
        stats = stats_par_mois[mois]
        stats["active_days"] += 1.0
        stats["sessions"] += float(ligne["nb_seances"]) if "nb_seances" in ligne.keys() else 0.0
        stats["calories"] += float(ligne["calories_totales"])
        stats["duration_sec"] += float(ligne["duree_totale"])
        stats["avg_score_sum"] += float(ligne["score_moyen"])
        stats["avg_score_count"] += 1.0
        stats["best_score"] = max(stats["best_score"], float(ligne["score_moyen"]))

    for ligne in scores:
        mois = str(ligne["date"])[:7]
        stats = stats_par_mois[mois]
        stats["best_score"] = max(stats["best_score"], float(ligne["score_global"]))

    base = premier_jour_du_mois(datetime.now().date())
    resultat: list[dict[str, object]] = []
    for offset in range(mois_a_afficher):
        mois_date = decaler_mois(base, -offset)
        mois = cle_mois(mois_date)
        stats = stats_par_mois[mois]
        avg_score = (
            stats["avg_score_sum"] / stats["avg_score_count"]
            if stats["avg_score_count"] > 0
            else 0.0
        )

        badges = []
        for badge in BADGES_MENSUELS:
            valeur = float(stats.get(str(badge["metric"]), 0.0))
            cible = float(badge["target"])
            progression_pct = borner_pourcentage((valeur / cible) * 100.0) if cible > 0 else 0.0
            badges.append(
                {
                    "id": badge["id"],
                    "title": badge["title"],
                    "description": badge["description"],
                    "icon": badge["icon"],
                    "tone": badge["tone"],
                    "target": cible,
                    "current": round(valeur, 1),
                    "unit": badge["unit"],
                    "unlocked": valeur >= cible,
                    "progress_pct": round(progression_pct, 1),
                }
            )

        resultat.append(
            {
                "month_key": mois,
                "month_label": libelle_mois(mois),
                "earned_count": len([badge for badge in badges if badge["unlocked"]]),
                "badges": badges,
                "summary": {
                    "sessions": int(round(stats["sessions"])),
                    "active_days": int(round(stats["active_days"])),
                    "calories": round(stats["calories"], 1),
                    "duration_sec": round(stats["duration_sec"], 1),
                    "best_score": round(borner_pourcentage(stats["best_score"]), 1),
                    "avg_score": round(borner_pourcentage(avg_score), 1),
                },
            }
        )

    return resultat


def hash_password(mot_de_passe: str, salt_hex: str | None = None) -> str:
    salt = bytes.fromhex(salt_hex) if salt_hex else os.urandom(16)
    hachage = hashlib.pbkdf2_hmac("sha256", mot_de_passe.encode("utf-8"), salt, 120000)
    return f"{salt.hex()}${hachage.hex()}"


def verifier_mot_de_passe(mot_de_passe: str, stocke: str) -> bool:
    try:
        salt_hex, attendu_hex = stocke.split("$", maxsplit=1)
    except ValueError:
        return False
    calcule = hash_password(mot_de_passe, salt_hex).split("$", maxsplit=1)[1]
    return secrets.compare_digest(calcule, attendu_hex)


def valider_email(email: str) -> str:
    propre = email.strip().lower()
    if "@" not in propre or "." not in propre.split("@", maxsplit=1)[-1]:
        raise HTTPException(status_code=422, detail="Email invalide.")
    return propre


def email_local(local_id: str) -> str:
    propre = local_id.strip().lower()
    if not propre:
        raise HTTPException(status_code=422, detail="Identifiant local invalide.")
    digest = hashlib.sha256(propre.encode("utf-8")).hexdigest()[:16]
    return f"local-{digest}@kume.local"


def serialiser_profil(profil: UserProfile) -> dict[str, object]:
    return {
        **profil.as_dict(),
        "imc": profil.imc,
        "fc_max": profil.fc_max,
        "tdee": profil.tdee,
    }


def serialiser_compte(ligne_compte: object | None) -> dict[str, object] | None:
    if ligne_compte is None:
        return None
    return {
        "user_id": int(ligne_compte["user_id"]),
        "email": str(ligne_compte["email"]),
        "theme": str(ligne_compte["theme"]),
        "last_login": str(ligne_compte["last_login"]) if ligne_compte["last_login"] else None,
    }


def serialiser_exercice(cle: str, infos: dict[str, object]) -> dict[str, object]:
    mode = str(infos.get("type", "reps"))
    cible_defaut = int(infos.get("objectif_defaut", 30 if mode == "time" else 10))
    return {
        "key": cle,
        "name": str(infos["nom"]),
        "mode": mode,
        "default_target": cible_defaut,
        "target_label": "sec" if mode == "time" else "reps",
        "met": float(infos.get("met", 0.0)),
        "touch": str(infos.get("touche", "")),
    }


def serialiser_plan(plan: WorkoutPlan) -> list[dict[str, object]]:
    plan_serialise: list[dict[str, object]] = []
    for exercice in plan.exercices:
        if exercice.mode == "time":
            cible = exercice.objectif_secondes
            etiquette = f"{cible} sec"
        else:
            cible = exercice.objectif_reps
            etiquette = f"{cible} reps"
        plan_serialise.append(
            {
                "key": exercice.cle,
                "name": exercice.nom,
                "mode": exercice.mode,
                "target": cible,
                "target_label": etiquette,
            }
        )
    return plan_serialise


def construire_profil(payload: ProfilePayload) -> UserProfile:
    return UserProfile(
        id=payload.id,
        prenom=payload.prenom.strip(),
        age=int(payload.age),
        taille_cm=float(payload.taille_cm),
        poids_kg=float(payload.poids_kg),
        sexe=normaliser_sexe(payload.sexe),
        niveau=normaliser_niveau(payload.niveau),
        date_creation=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )


def construire_plan(plan_brut: list[PlanExercisePayload], niveau: str) -> WorkoutPlan:
    if not plan_brut:
        return creer_plan_automatique(config.EXERCICES, niveau)

    exercices: list[WorkoutExercise] = []
    estimation = 0.0

    for entree in plan_brut:
        if entree.cle not in config.EXERCICES:
            continue

        infos = config.EXERCICES[entree.cle]
        mode = str(entree.mode or infos.get("type", "reps"))
        nom = str(infos["nom"])
        if mode == "time":
            cible = int(entree.objectif_secondes or infos.get("objectif_defaut", 30))
            exercices.append(
                WorkoutExercise(
                    cle=entree.cle,
                    nom=nom,
                    mode=mode,
                    objectif_secondes=cible,
                )
            )
            estimation += cible
        else:
            cible = int(entree.objectif_reps or infos.get("objectif_defaut", 10))
            exercices.append(
                WorkoutExercise(
                    cle=entree.cle,
                    nom=nom,
                    mode=mode,
                    objectif_reps=cible,
                )
            )
            temps_rep = TEMPS_PAR_REP_RAPIDE if entree.cle == "mountain_climber" else TEMPS_PAR_REP
            estimation += cible * temps_rep

    if not exercices:
        return creer_plan_automatique(config.EXERCICES, niveau)

    return WorkoutPlan(exercices=exercices, estimation_sec=estimation)


def conseils_exercice(cle: str) -> list[str]:
    infos = config.EXERCICES.get(cle, {})
    messages = []
    for nom, valeur in infos.items():
        if nom.startswith("message_") and isinstance(valeur, str):
            messages.append(valeur)
    uniques: list[str] = []
    for message in messages:
        if message not in uniques:
            uniques.append(message)
    return uniques[:3]


def construire_insights(user_id: int) -> dict[str, object]:
    progression_brute = DB.recuperer_progression(user_id, jours=14)
    progression = construire_progression_journaliere(progression_brute, jours=14)
    repetitions = DB.recuperer_repetitions_exercices(user_id, jours=30)
    qualites = DB.recuperer_qualite_angles(user_id, jours=30)
    seances = DB.recuperer_seances_recentes(user_id, limite=6)
    scores_14d = DB.recuperer_scores_seances(user_id, jours=14)
    progression_365 = DB.recuperer_progression(user_id, jours=365)
    badges_mensuels = construire_badges_mensuels(user_id)

    sessions_total = DB.count_sessions(user_id)
    sessions_14d = DB.count_sessions(user_id, jours=14)
    active_days_14d = DB.count_active_days(user_id, jours=14)
    active_days_total = DB.count_active_days(user_id)
    current_streak = calculer_serie_actuelle([str(ligne["date"]) for ligne in progression_365])
    consistency_pct = round((active_days_14d / 14.0) * 100.0, 1) if active_days_14d > 0 else 0.0

    total_calories = round(sum(float(ligne["calories"]) for ligne in progression), 2)
    total_duree = round(sum(float(ligne["duration_sec"]) for ligne in progression), 2)
    score_moyen = round(
        sum(float(ligne["score_global"]) for ligne in scores_14d) / max(len(scores_14d), 1),
        2,
    )
    best_score = max((float(ligne["score_global"]) for ligne in scores_14d), default=0.0)
    today_done = any(str(ligne["date"]) == datetime.now().strftime("%Y-%m-%d") and float(ligne["duration_sec"]) > 0 for ligne in progression)

    return {
        "totals": {
            "sessions": sessions_total,
            "sessions_14d": sessions_14d,
            "calories_14d": total_calories,
            "duration_14d_sec": total_duree,
            "avg_score": borner_pourcentage(score_moyen),
            "active_days_14d": active_days_14d,
            "active_days_total": active_days_total,
            "current_streak": current_streak,
            "best_score_14d": borner_pourcentage(best_score),
            "consistency_pct": borner_pourcentage(consistency_pct),
            "today_completed": today_done,
        },
        "progression": progression,
        "repetitions": [
            {
                "exercise": str(ligne["nom_exercice"]),
                "reps": int(ligne["reps"]),
            }
            for ligne in repetitions
        ],
        "quality": [
            {
                "exercise": str(ligne["nom_exercice"]),
                "score": round(borner_pourcentage(float(ligne["score_moyen"])), 2),
            }
            for ligne in qualites
        ],
        "recent_sessions": [
            {
                "date": str(ligne["date"]),
                "duration_sec": float(ligne["duree_totale_sec"]),
                "calories": float(ligne["calories_totales"]),
                "score": borner_pourcentage(float(ligne["score_global"])),
                "note": str(ligne["note_qualite"]),
            }
            for ligne in seances
        ],
        "monthly_badges": badges_mensuels,
    }


def construire_vue_accueil(profil: UserProfile, insights: dict[str, object]) -> dict[str, object]:
    qualites = list(insights.get("quality", []))
    seances = list(insights.get("recent_sessions", []))
    qualites_tries = sorted(qualites, key=lambda item: float(item["score"]), reverse=True)
    points_forts = qualites_tries[:3]
    axes = list(reversed(qualites_tries[-3:])) if qualites_tries else []

    ameliorations = []
    for element in axes:
        cle = EXERCISE_KEY_BY_NAME.get(str(element["exercise"]).lower())
        if not cle:
            continue
        suggestions = conseils_exercice(cle)
        ameliorations.append(
            {
                "exercise": element["exercise"],
                "score": element["score"],
                "tip": suggestions[0] if suggestions else "Ralentis et controle mieux ton amplitude.",
            }
        )

    points_forts_payload = [
        {
            "exercise": element["exercise"],
            "score": element["score"],
        }
        for element in points_forts
    ]

    plan_focus = creer_plan_automatique(config.EXERCICES, profil.niveau)
    blueprint = [
        {
            "name": element["name"],
            "target_label": element["target_label"],
        }
        for element in serialiser_plan(plan_focus)[:4]
    ]

    prochaine_action = (
        "Relance une seance live pour maintenir ton rythme."
        if seances
        else "Commence par une premiere seance pour construire ton historique."
    )

    return {
        "welcome": {
            "headline": f"Bienvenue {profil.prenom}",
            "subline": "Un studio de coaching personnel, net et immersif, pense pour garder la camera au centre de l experience.",
            "next_action": prochaine_action,
        },
        "strengths": points_forts_payload,
        "improvements": ameliorations,
        "blueprint": blueprint,
        "latest_session": seances[0] if seances else None,
    }


def export_url(path: Path) -> str:
    return f"/exports/{path.name}"


def module_disponible(nom: str) -> bool:
    return importlib.util.find_spec(nom) is not None


def vue_utilisateur(user_id: int) -> dict[str, object]:
    profil = DB.get_user_by_id(user_id)
    compte = DB.get_account_by_user_id(user_id)
    if profil is None or compte is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    insights = construire_insights(user_id)
    return {
        "profile": serialiser_profil(profil),
        "account": serialiser_compte(compte),
        "home": construire_vue_accueil(profil, insights),
        "insights": insights,
    }


@dataclass
class LiveSession:
    session_id: str
    profile: UserProfile
    plan: WorkoutPlan
    analyzer: ExerciseAnalyzer = field(default_factory=ExerciseAnalyzer)
    logger: SessionLogger = field(default_factory=SessionLogger)
    created_at: datetime = field(default_factory=datetime.now)
    durations_by_exercise: dict[str, float] = field(
        default_factory=lambda: {nom: 0.0 for nom in config.EXERCICES}
    )
    orientation_history: deque[str] = field(
        default_factory=lambda: deque(maxlen=config.FENETRE_ORIENTATION)
    )
    fps_history: deque[float] = field(default_factory=lambda: deque(maxlen=config.FENETRE_FPS))
    plan_keys: list[str] = field(default_factory=list)
    plan_index: int = 0
    active_exercise_started_at: float = 0.0
    last_elapsed_sec: float = 0.0
    is_complete: bool = False
    final_payload: dict[str, object] | None = None

    def __post_init__(self) -> None:
        plan_data = [
            {
                "cle": exercice.cle,
                "mode": exercice.mode,
                "objectif_reps": exercice.objectif_reps,
                "objectif_secondes": exercice.objectif_secondes,
            }
            for exercice in self.plan.exercices
        ]
        self.plan_keys = [exercice.cle for exercice in self.plan.exercices]
        if plan_data:
            self.analyzer.configurer_plan(plan_data)

    @property
    def active_exercise(self) -> str:
        return self.analyzer.exercice_actuel

    def _elapsed(self, elapsed_sec: float) -> float:
        return max(self.last_elapsed_sec, float(elapsed_sec))

    def _ajouter_duree_exercice_courant(self, elapsed_sec: float) -> None:
        courant = self.active_exercise
        delta = max(0.0, elapsed_sec - self.active_exercise_started_at)
        self.durations_by_exercise[courant] += delta
        self.active_exercise_started_at = elapsed_sec

    def _durees_live(self, elapsed_sec: float) -> dict[str, float]:
        durees = dict(self.durations_by_exercise)
        durees[self.active_exercise] += max(0.0, elapsed_sec - self.active_exercise_started_at)
        return durees

    def _moyenne_fps(self) -> float:
        if not self.fps_history:
            return 0.0
        return float(sum(self.fps_history) / len(self.fps_history))

    def _totaux_reps(self) -> tuple[int, int]:
        total_valides = 0
        total_invalides = 0
        for nom_exercice, etat in self.analyzer.etats.items():
            type_ex = str(config.EXERCICES[nom_exercice].get("type", "reps"))
            if type_ex == "time":
                total_valides += int(etat.temps_tenu_sec)
            else:
                total_valides += etat.repetitions_valides
                total_invalides += etat.repetitions_invalides
        return total_valides, total_invalides

    def _calories_live(self, elapsed_sec: float) -> float:
        calories = 0.0
        for nom_exercice, duree in self._durees_live(elapsed_sec).items():
            met = float(config.EXERCICES[nom_exercice].get("met", 0.0))
            calories += calories_depensees(met, self.profile.poids_kg, duree)
        return round(calories, 2)

    def _resume_plan(self, stats: dict[str, object]) -> dict[str, object]:
        objectif = float(stats.get("objectif", 0) or 0)
        mode = str(stats.get("mode_objectif", "reps"))
        valeur_actuelle = (
            float(stats.get("temps_tenu_sec", 0.0))
            if mode == "time"
            else float(stats.get("repetitions_correctes", 0))
        )
        progression_courante = 0.0
        if objectif > 0:
            progression_courante = min(1.0, valeur_actuelle / objectif)

        if not self.plan_keys:
            progression_globale = progression_courante
        elif self.is_complete:
            progression_globale = 1.0
        else:
            progression_globale = (self.plan_index + progression_courante) / max(len(self.plan_keys), 1)

        elements = []
        for index, exercice in enumerate(self.plan.exercices):
            termine = self.is_complete or index < self.plan_index
            actif = index == self.plan_index and not self.is_complete
            elements.append(
                {
                    "key": exercice.cle,
                    "name": exercice.nom,
                    "mode": exercice.mode,
                    "target": exercice.objectif_secondes if exercice.mode == "time" else exercice.objectif_reps,
                    "target_label": (
                        f"{exercice.objectif_secondes} sec"
                        if exercice.mode == "time"
                        else f"{exercice.objectif_reps} reps"
                    ),
                    "is_active": actif,
                    "is_complete": termine,
                }
            )

        suivant = None
        if not self.is_complete and self.plan_index + 1 < len(self.plan.exercices):
            exercice_suivant = self.plan.exercices[self.plan_index + 1]
            suivant = {
                "key": exercice_suivant.cle,
                "name": exercice_suivant.nom,
                "target_label": (
                    f"{exercice_suivant.objectif_secondes} sec"
                    if exercice_suivant.mode == "time"
                    else f"{exercice_suivant.objectif_reps} reps"
                ),
            }

        return {
            "items": elements,
            "current_progress_pct": round(progression_courante * 100.0, 1),
            "session_progress_pct": round(progression_globale * 100.0, 1),
            "next_exercise": suivant,
        }

    def _exercise_changed_payload(self) -> dict[str, object]:
        infos = config.EXERCICES[self.active_exercise]
        return {
            "key": self.active_exercise,
            "name": str(infos["nom"]),
            "mode": str(infos.get("type", "reps")),
        }

    def _build_live_payload(
        self,
        analysis: dict[str, object],
        stats: dict[str, object],
        orientation: str,
    ) -> dict[str, object]:
        reps_valides, reps_invalides = self._totaux_reps()
        return {
            "session_id": self.session_id,
            "analysis": analysis,
            "stats": stats,
            "orientation": orientation,
            "elapsed_sec": round(self.last_elapsed_sec, 2),
            "average_fps": round(self._moyenne_fps(), 1),
            "live_calories": self._calories_live(self.last_elapsed_sec),
            "total_valid_reps": reps_valides,
            "total_invalid_reps": reps_invalides,
            "coach_variant": self._coach_variant(str(analysis.get("niveau_feedback", "neutre"))),
            "active_exercise": self._exercise_changed_payload(),
            "plan": self._resume_plan(stats),
            "is_complete": self.is_complete,
        }

    @staticmethod
    def _coach_variant(niveau_feedback: str) -> str:
        if niveau_feedback == "ok":
            return "good"
        if niveau_feedback == "erreur":
            return "bad"
        return "warn"

    def set_active_exercise(self, exercise_key: str, elapsed_sec: float) -> dict[str, object]:
        if exercise_key not in config.EXERCICES:
            raise HTTPException(status_code=404, detail="Exercice introuvable.")

        elapsed = self._elapsed(elapsed_sec)
        if exercise_key != self.active_exercise:
            self._ajouter_duree_exercice_courant(elapsed)
            self.analyzer.changer_exercice(exercise_key)
            if exercise_key in self.plan_keys:
                self.plan_index = self.plan_keys.index(exercise_key)
            self.is_complete = False
        self.last_elapsed_sec = elapsed
        stats = self.analyzer.obtenir_stats_exercice_actuel()
        return self._build_live_payload(
            analysis={
                "message": f"Exercice actif: {config.EXERCICES[exercise_key]['nom']}",
                "niveau_feedback": "neutre",
                "est_correct": False,
                "angle_principal": None,
                "repetitions_totales": stats.get("repetitions_totales", 0),
                "repetitions_correctes": stats.get("repetitions_correctes", 0),
                "repetitions_invalides": stats.get("repetitions_invalides", 0),
                "taux_reussite": stats.get("taux_reussite", 0.0),
                "voix": None,
                "objectif": stats.get("objectif", 0),
                "mode_objectif": stats.get("mode_objectif", "reps"),
            },
            stats=stats,
            orientation="incertaine",
        )

    def _objectif_atteint(self, stats: dict[str, object]) -> bool:
        objectif = float(stats.get("objectif", 0) or 0)
        mode = str(stats.get("mode_objectif", "reps"))
        if objectif <= 0:
            return False
        if mode == "time":
            return float(stats.get("temps_tenu_sec", 0.0) or 0.0) >= objectif
        return int(stats.get("repetitions_correctes", 0) or 0) >= int(objectif)

    def _gerer_progression_plan(self, stats: dict[str, object], analysis: dict[str, object]) -> None:
        if not self.plan_keys or self.is_complete:
            return

        if self.active_exercise != self.plan_keys[self.plan_index]:
            return

        if not self._objectif_atteint(stats):
            return

        self._ajouter_duree_exercice_courant(self.last_elapsed_sec)
        if self.plan_index + 1 < len(self.plan_keys):
            self.plan_index += 1
            prochain = self.plan_keys[self.plan_index]
            self.analyzer.changer_exercice(prochain)
            analysis["message"] = f"Exercice termine. Suivant: {config.EXERCICES[prochain]['nom']}"
            analysis["niveau_feedback"] = "ok"
            analysis["voix"] = analysis.get("voix") or analysis["message"]
        else:
            self.is_complete = True
            analysis["message"] = "Seance terminee. Bravo !"
            analysis["niveau_feedback"] = "ok"
            analysis["voix"] = analysis.get("voix") or analysis["message"]

    def analyze(self, landmarks: dict[str, dict[str, float]], elapsed_sec: float, fps: float | None) -> dict[str, object]:
        elapsed = self._elapsed(elapsed_sec)
        self.last_elapsed_sec = elapsed
        if fps is not None and fps > 0:
            self.fps_history.append(float(fps))

        orientation = detecter_orientation(landmarks, self.orientation_history)
        analysis = self.analyzer.analyser(landmarks, orientation, temps_actuel=elapsed)
        stats = self.analyzer.obtenir_stats_exercice_actuel()
        self._gerer_progression_plan(stats, analysis)
        stats = self.analyzer.obtenir_stats_exercice_actuel()
        return self._build_live_payload(analysis=analysis, stats=stats, orientation=orientation)

    @staticmethod
    def _generer_pdf(chemin: Path, profil: UserProfile, resume: dict[str, object], exercices: list[dict[str, object]]) -> None:
        try:
            from report_generator import generer_rapport_pdf

            generer_rapport_pdf(chemin, profil, resume, exercices)
        except Exception:
            return

    @staticmethod
    def _generer_dashboard(chemin: Path, profil: UserProfile) -> None:
        try:
            from dashboard import generer_dashboard

            generer_dashboard(DB, profil, jours=30, sortie_png=chemin, afficher=False)
        except Exception:
            return

    def finish(self, background_tasks: BackgroundTasks | None = None) -> dict[str, object]:
        if self.final_payload is not None:
            return self.final_payload

        self._ajouter_duree_exercice_courant(self.last_elapsed_sec)
        fps_moyen_final = self._moyenne_fps()
        calories_par_exercice = {
            nom_exercice: calories_depensees(
                float(config.EXERCICES[nom_exercice].get("met", 0.0)),
                self.profile.poids_kg,
                duree,
            )
            for nom_exercice, duree in self.durations_by_exercise.items()
        }
        resume_exercices = self.analyzer.obtenir_resume_exercices(
            durees_par_exercice=self.durations_by_exercise,
            calories_par_exercice=calories_par_exercice,
        )
        for ligne in resume_exercices:
            ligne["duree_totale_sec"] = round(self.last_elapsed_sec, 2)
            ligne["fps_moyen"] = round(fps_moyen_final, 2)

        score_global, note_qualite = self.analyzer.calculer_scores()
        calories_totales = sum(calories_par_exercice.values())
        objectif_pct = (calories_totales / self.profile.tdee * 100.0) if self.profile.tdee > 0 else 0.0
        resume_global = {
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "duree_totale_sec": round(self.last_elapsed_sec, 2),
            "nb_exercices": len(resume_exercices),
            "calories_totales": round(calories_totales, 2),
            "score_global": round(score_global, 2),
            "note_qualite": note_qualite,
            "fps_moyen": round(fps_moyen_final, 2),
            "tdee": round(self.profile.tdee, 2),
            "objectif_pct": round(objectif_pct, 2),
        }

        if self.profile.id is not None:
            DB.enregistrer_seance(self.profile.id, resume_global, resume_exercices)

        chemin_csv = self.logger.enregistrer_rapport_csv(resume_exercices)
        chemin_json = self.logger.enregistrer_historique_json(resume_exercices)
        chemin_pdf = DOSSIER_EXPORTS / f"rapport_seance_{self.logger.horodatage}.pdf"
        chemin_dashboard = DOSSIER_EXPORTS / f"dashboard_{self.logger.horodatage}.png"
        exports = {
            "csv": export_url(chemin_csv),
            "json": export_url(chemin_json),
        }
        warnings: list[str] = []

        pdf_ok = module_disponible("fpdf")
        if pdf_ok:
            exports["pdf"] = export_url(chemin_pdf)
            if background_tasks is not None:
                background_tasks.add_task(self._generer_pdf, chemin_pdf, self.profile, resume_global, resume_exercices)
            else:
                self._generer_pdf(chemin_pdf, self.profile, resume_global, resume_exercices)
        else:
            warnings.append("Export PDF indisponible: dependance `fpdf2` absente.")

        dashboard_ok = module_disponible("matplotlib")
        if dashboard_ok:
            exports["dashboard"] = export_url(chemin_dashboard)
            if background_tasks is not None:
                background_tasks.add_task(self._generer_dashboard, chemin_dashboard, self.profile)
            else:
                self._generer_dashboard(chemin_dashboard, self.profile)
        else:
            warnings.append("Dashboard PNG indisponible: dependance `matplotlib` absente.")

        self.final_payload = {
            "summary": resume_global,
            "exercises": resume_exercices,
            "exports": exports,
            "warnings": warnings,
            "insights": construire_insights(self.profile.id or 0) if self.profile.id is not None else {},
            "home": construire_vue_accueil(self.profile, construire_insights(self.profile.id or 0))
            if self.profile.id is not None
            else {},
        }
        return self.final_payload


SESSIONS: dict[str, LiveSession] = {}


def nettoyer_sessions() -> None:
    maintenant = datetime.now()
    expirations = [
        session_id
        for session_id, session in SESSIONS.items()
        if (maintenant - session.created_at).total_seconds() > SESSION_MAX_AGE_SEC
    ]
    for session_id in expirations:
        SESSIONS.pop(session_id, None)


def recuperer_session(session_id: str) -> LiveSession:
    nettoyer_sessions()
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session introuvable.")
    return session


@app.get("/")
def racine() -> FileResponse:
    dist_index = BASE_DIR / "static" / "dist" / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    return FileResponse(BASE_DIR / "index.html")


@app.get("/manifest.webmanifest")
def manifest() -> FileResponse:
    return FileResponse(BASE_DIR / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/api/bootstrap")
def bootstrap() -> dict[str, object]:
    nettoyer_sessions()
    plan_defaut = creer_plan_automatique(config.EXERCICES, "debutant")
    return {
        "app_name": "KUME",
        "version": app.version,
        "themes": list(THEMES.values()),
        "exercises": [serialiser_exercice(cle, infos) for cle, infos in config.EXERCICES.items()],
        "default_plan": {
            "items": serialiser_plan(plan_defaut),
            "estimated_sec": round(plan_defaut.estimation_sec, 0),
        },
        "camera": {
            "width": config.LARGEUR_VIDEO,
            "height": config.HAUTEUR_VIDEO,
            "fps": config.FPS_CIBLE,
        },
        "registered_accounts": len([user for user in DB.get_users() if DB.get_account_by_user_id(user.id or 0)]),
    }


@app.post("/api/auth/register")
def register(payload: RegisterPayload) -> dict[str, object]:
    email = valider_email(payload.email)
    if DB.email_exists(email):
        raise HTTPException(status_code=409, detail="Un compte existe deja avec cet email.")

    profil = UserProfile(
        prenom=payload.prenom.strip(),
        age=int(payload.age),
        taille_cm=float(payload.taille_cm),
        poids_kg=float(payload.poids_kg),
        sexe=normaliser_sexe(payload.sexe),
        niveau=normaliser_niveau(payload.niveau),
        date_creation=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    theme = normaliser_theme(payload.theme)
    mot_de_passe_hash = hash_password(payload.mot_de_passe)
    profil.id = DB.create_account(profil, email, mot_de_passe_hash, theme)
    DB.update_last_login(profil.id or 0)
    DB.set_last_user_id(profil.id or 0)
    return vue_utilisateur(profil.id or 0)


@app.post("/api/auth/login")
def login(payload: LoginPayload) -> dict[str, object]:
    compte = DB.get_account_by_email(valider_email(payload.email))
    if compte is None or not verifier_mot_de_passe(payload.mot_de_passe, str(compte["mot_de_passe_hash"])):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    user_id = int(compte["user_id"])
    DB.update_last_login(user_id)
    DB.set_last_user_id(user_id)
    return vue_utilisateur(user_id)


@app.post("/api/auth/local")
def login_local(payload: LocalAuthPayload) -> dict[str, object]:
    local_id = payload.local_id.strip()
    if not local_id:
        raise HTTPException(status_code=422, detail="Identifiant local invalide.")

    email = email_local(local_id)
    compte = DB.get_account_by_email(email)
    if compte is not None:
        user_id = int(compte["user_id"])
        profil = DB.get_user_by_id(user_id)
        if profil is not None:
            profil.prenom = payload.prenom.strip() or profil.prenom
            profil.niveau = normaliser_niveau(payload.niveau)
            DB.update_user(profil)
        DB.update_last_login(user_id)
        DB.set_last_user_id(user_id)
        return vue_utilisateur(user_id)

    profil = UserProfile(
        prenom=payload.prenom.strip() or "Invite",
        age=30,
        taille_cm=175.0,
        poids_kg=70.0,
        sexe="M",
        niveau=normaliser_niveau(payload.niveau),
        date_creation=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    mot_de_passe_hash = hash_password(local_id)
    profil.id = DB.create_account(profil, email, mot_de_passe_hash, theme="kume")
    DB.update_last_login(profil.id or 0)
    DB.set_last_user_id(profil.id or 0)
    return vue_utilisateur(profil.id or 0)


@app.get("/api/users/{user_id}/overview")
def get_overview(user_id: int) -> dict[str, object]:
    return vue_utilisateur(user_id)


@app.put("/api/users/{user_id}/profile")
def update_profile(user_id: int, payload: ProfilePayload) -> dict[str, object]:
    profil = DB.get_user_by_id(user_id)
    compte = DB.get_account_by_user_id(user_id)
    if profil is None or compte is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")

    nouveau = construire_profil(payload)
    nouveau.id = user_id
    nouveau.date_creation = profil.date_creation
    DB.update_user(nouveau)
    DB.set_last_user_id(user_id)
    return vue_utilisateur(user_id)


@app.patch("/api/users/{user_id}/theme")
def update_theme(user_id: int, payload: ThemePayload) -> dict[str, object]:
    profil = DB.get_user_by_id(user_id)
    compte = DB.get_account_by_user_id(user_id)
    if profil is None or compte is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    DB.update_account_theme(user_id, normaliser_theme(payload.theme))
    return vue_utilisateur(user_id)


def supprimer_compte_utilisateur(user_id: int) -> dict[str, object]:
    profil = DB.get_user_by_id(user_id)
    compte = DB.get_account_by_user_id(user_id)
    if profil is None or compte is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")

    DB.delete_account(user_id)
    return {
        "deleted": True,
        "message": "Compte supprime avec succes.",
    }


@app.api_route("/api/users/{user_id}", methods=["POST", "DELETE"])
def delete_account(user_id: int) -> dict[str, object]:
    return supprimer_compte_utilisateur(user_id)


@app.api_route("/api/users/{user_id}/delete", methods=["GET", "POST", "DELETE"])
def delete_account_fallback(user_id: int) -> dict[str, object]:
    return supprimer_compte_utilisateur(user_id)


@app.post("/api/plans/auto")
def create_auto_plan(payload: ProfilePayload) -> dict[str, object]:
    niveau = normaliser_niveau(payload.niveau)
    plan = creer_plan_automatique(config.EXERCICES, niveau)
    return {
        "items": serialiser_plan(plan),
        "estimated_sec": round(plan.estimation_sec, 0),
    }


@app.post("/api/sessions")
def create_session(payload: SessionCreatePayload) -> dict[str, object]:
    profil = DB.get_user_by_id(payload.user_id)
    compte = DB.get_account_by_user_id(payload.user_id)
    if profil is None:
        if payload.user_id < 0:
            local = payload.local_profile or LocalSessionPayload()
            prenom = (local.prenom or "Invite").strip() or "Invite"
            try:
                niveau = normaliser_niveau(local.niveau) if local.niveau else "debutant"
            except HTTPException:
                niveau = "debutant"
            profil = UserProfile(
                prenom=prenom,
                age=30,
                taille_cm=175.0,
                poids_kg=70.0,
                sexe="M",
                niveau=niveau,
                date_creation=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            )
            local_email = f"local-{uuid.uuid4().hex}@kume.local"
            local_password = secrets.token_hex(16)
            profil.id = DB.create_account(
                profil,
                local_email,
                hash_password(local_password),
                theme="kume",
            )
            DB.update_last_login(profil.id or 0)
            DB.set_last_user_id(profil.id or 0)
            compte = DB.get_account_by_user_id(profil.id or 0)
        else:
            raise HTTPException(status_code=404, detail="Compte introuvable.")

    if profil is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")

    if compte is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")

    plan = construire_plan(payload.plan, profil.niveau)
    session = LiveSession(session_id=uuid.uuid4().hex, profile=profil, plan=plan)
    SESSIONS[session.session_id] = session
    DB.set_last_user_id(profil.id or payload.user_id)

    stats = session.analyzer.obtenir_stats_exercice_actuel()
    return {
        "session_id": session.session_id,
        "profile": serialiser_profil(profil),
        "account": serialiser_compte(compte),
        "plan": {
            "items": serialiser_plan(plan),
            "estimated_sec": round(plan.estimation_sec, 0),
        },
        "live": session._build_live_payload(
            analysis={
                "message": "Session prete. Lance ton mouvement dans le cadre.",
                "niveau_feedback": "neutre",
                "est_correct": False,
                "angle_principal": None,
                "repetitions_totales": stats.get("repetitions_totales", 0),
                "repetitions_correctes": stats.get("repetitions_correctes", 0),
                "repetitions_invalides": stats.get("repetitions_invalides", 0),
                "taux_reussite": stats.get("taux_reussite", 0.0),
                "voix": None,
                "objectif": stats.get("objectif", 0),
                "mode_objectif": stats.get("mode_objectif", "reps"),
            },
            stats=stats,
            orientation="incertaine",
        ),
    }


@app.post("/api/sessions/{session_id}/active-exercise")
def change_active_exercise(session_id: str, payload: ExerciseChangePayload) -> dict[str, object]:
    session = recuperer_session(session_id)
    return session.set_active_exercise(payload.exercise_key, payload.elapsed_sec)


@app.post("/api/sessions/{session_id}/analyze")
def analyze_session(session_id: str, payload: AnalyzePayload) -> dict[str, object]:
    session = recuperer_session(session_id)
    landmarks = {
        nom: {
            "x": point.x,
            "y": point.y,
            "z": point.z,
            "visibilite": point.visibility,
        }
        for nom, point in payload.landmarks.items()
    }
    return session.analyze(landmarks=landmarks, elapsed_sec=payload.elapsed_sec, fps=payload.fps)


@app.post("/api/sessions/{session_id}/finish")
def finish_session(session_id: str, background_tasks: BackgroundTasks) -> dict[str, object]:
    session = recuperer_session(session_id)
    resultat = session.finish(background_tasks=background_tasks)
    SESSIONS.pop(session_id, None)
    return resultat


# ─── Endpoints Systeme ───────────────────────────────────────────────
@app.get("/api/health", tags=["system"])
def health_check() -> dict[str, object]:
    """Etat du serveur et sessions actives."""
    nettoyer_sessions()
    return {
        "status": "ok",
        "version": "3.0.0",
        "active_sessions": len(SESSIONS),
        "registered_users": len(DB.get_users()),
        "exercises_available": len(config.EXERCICES),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/metrics", tags=["system"])
def get_metrics() -> dict[str, object]:
    """Metriques legeres du serveur."""
    nettoyer_sessions()
    total_comptes = len([u for u in DB.get_users() if DB.get_account_by_user_id(u.id or 0)])
    return {
        "registered_accounts": total_comptes,
        "active_sessions": len(SESSIONS),
        "exercises_available": len(config.EXERCICES),
        "rate_limit": {"max": RATE_MAX_REQUESTS, "window_sec": RATE_WINDOW_SEC},
    }


# ─── Exercices ──────────────────────────────────────────────────
@app.get("/api/exercises", tags=["exercises"])
def list_exercises() -> dict[str, object]:
    """Catalogue complet des exercices disponibles."""
    return {
        "exercises": [serialiser_exercice(cle, infos) for cle, infos in config.EXERCICES.items()],
        "total": len(config.EXERCICES),
    }


@app.get("/api/exercises/{exercise_key}/tips", tags=["exercises"])
def get_exercise_tips(exercise_key: str) -> dict[str, object]:
    """Conseils de forme et parametres pour un exercice specifique."""
    if exercise_key not in config.EXERCICES:
        raise HTTPException(status_code=404, detail="Exercice introuvable.")
    infos = config.EXERCICES[exercise_key]
    return {
        "key": exercise_key,
        "name": str(infos["nom"]),
        "mode": str(infos.get("type", "reps")),
        "met": float(infos.get("met", 0.0)),
        "default_target": int(infos.get("objectif_defaut", 10)),
        "tips": conseils_exercice(exercise_key),
    }


# ─── Historique utilisateur ───────────────────────────────────────
@app.get("/api/users/{user_id}/history", tags=["users"])
def get_history(user_id: int, jours: int = 30) -> dict[str, object]:
    """Historique detaille des seances d un utilisateur."""
    profil = DB.get_user_by_id(user_id)
    if profil is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    seances = DB.recuperer_seances_recentes(user_id, limite=50)
    progression = list(reversed(DB.recuperer_progression(user_id, jours=jours)))
    repetitions = DB.recuperer_repetitions_exercices(user_id, jours=jours)
    qualites = DB.recuperer_qualite_angles(user_id, jours=jours)
    return {
        "user_id": user_id,
        "sessions": [
            {
                "date": str(s["date"]),
                "duration_sec": float(s["duree_totale_sec"]),
                "calories": float(s["calories_totales"]),
                "score": float(s["score_global"]),
                "note": str(s["note_qualite"]),
            }
            for s in seances
        ],
        "progression": [
            {
                "date": str(p["date"]),
                "calories": float(p["calories_totales"]),
                "score": float(p["score_moyen"]),
                "duration_sec": float(p["duree_totale"]),
            }
            for p in progression
        ],
        "repetitions_by_exercise": [
            {"exercise": str(r["nom_exercice"]), "reps": int(r["reps"])}
            for r in repetitions
        ],
        "quality_by_exercise": [
            {"exercise": str(q["nom_exercice"]), "score": round(float(q["score_moyen"]), 2)}
            for q in qualites
        ],
    }


# ─── WebSocket temps reel ─────────────────────────────────────────
@app.websocket("/api/ws/sessions/{session_id}")
async def ws_analyze(websocket: WebSocket, session_id: str) -> None:
    """Analyse de posture via WebSocket — faible latence, temps reel."""
    await websocket.accept()
    try:
        while True:
            data: dict[str, Any] = await websocket.receive_json()
            session = SESSIONS.get(session_id)
            if session is None:
                await websocket.send_json({"error": "Session introuvable"})
                break
            raw: dict[str, Any] = data.get("landmarks") or {}
            landmarks = {
                nom: {
                    "x": float(p.get("x", 0)),
                    "y": float(p.get("y", 0)),
                    "z": float(p.get("z", 0)),
                    "visibilite": float(p.get("visibility", 0)),
                }
                for nom, p in raw.items()
            }
            result = session.analyze(
                landmarks=landmarks,
                elapsed_sec=float(data.get("elapsed_sec", 0)),
                fps=float(data["fps"]) if data.get("fps") else None,
            )
            await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


def parse_args() -> argparse.Namespace:
    def env_int(name: str, default: int) -> int:
        raw = os.getenv(name, "")
        try:
            return int(raw)
        except (TypeError, ValueError):
            return default

    parser = argparse.ArgumentParser(description="KUME - Serveur web")
    parser.add_argument("--host", default=os.getenv("APP_HOST", "127.0.0.1"), help="Hote d'ecoute")
    parser.add_argument("--port", type=int, default=env_int("APP_PORT", 8000), help="Port HTTP")
    return parser.parse_args()


@app.get("/{full_path:path}")
def spa_fallback(full_path: str) -> FileResponse:
    """Catch-all pour le routage côté client React."""
    dist_index = BASE_DIR / "static" / "dist" / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    return FileResponse(BASE_DIR / "index.html")


if __name__ == "__main__":
    arguments = parse_args()
    uvicorn.run("web_app:app", host=arguments.host, port=arguments.port, reload=False)
