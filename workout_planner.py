"""Selection et planification des seances d'exercices."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class WorkoutExercise:
    cle: str
    nom: str
    mode: str
    objectif_reps: int = 0
    objectif_secondes: int = 0


@dataclass(slots=True)
class WorkoutPlan:
    exercices: list[WorkoutExercise]
    estimation_sec: float


_TEMPS_PAR_REP = 3.0
_TEMPS_PAR_REP_RAPIDE = 2.2


def _demander_entier(label: str, defaut: int, mini: int, maxi: int) -> int:
    while True:
        valeur = input(f"{label} [{defaut}]: ").strip()
        if not valeur:
            return defaut
        try:
            entier = int(valeur)
        except ValueError:
            print("Valeur invalide.")
            continue
        if entier < mini or entier > maxi:
            print(f"Valeur hors bornes ({mini}-{maxi}).")
            continue
        return entier


def _plan_automatique(niveau: str) -> list[str]:
    if niveau == "avance":
        return [
            "squat",
            "pushup",
            "curl",
            "lunge",
            "shoulder_press",
            "lateral_raise",
            "tricep_extension",
            "plank",
            "mountain_climber",
            "deadlift",
        ]
    if niveau == "intermediaire":
        return [
            "squat",
            "pushup",
            "curl",
            "lunge",
            "shoulder_press",
            "lateral_raise",
            "plank",
            "mountain_climber",
        ]
    return ["squat", "pushup", "curl", "lunge", "plank"]


def creer_plan_automatique(exercices_config: dict[str, dict[str, object]], niveau: str) -> WorkoutPlan:
    """Construit un plan automatique sans interaction utilisateur."""
    cles = _plan_automatique(niveau)
    exercices_plan: list[WorkoutExercise] = []
    estimation = 0.0

    for cle in cles:
        infos = exercices_config[cle]
        nom = str(infos["nom"])
        mode = str(infos.get("type", "reps"))
        if mode == "time":
            objectif = int(infos.get("objectif_defaut", 30))
            exercices_plan.append(WorkoutExercise(cle=cle, nom=nom, mode=mode, objectif_secondes=objectif))
            estimation += objectif
        else:
            objectif = int(infos.get("objectif_defaut", 10))
            exercices_plan.append(WorkoutExercise(cle=cle, nom=nom, mode=mode, objectif_reps=objectif))
            temps_rep = _TEMPS_PAR_REP_RAPIDE if cle == "mountain_climber" else _TEMPS_PAR_REP
            estimation += objectif * temps_rep

    return WorkoutPlan(exercices=exercices_plan, estimation_sec=estimation)


def creer_plan_utilisateur(exercices_config: dict[str, dict[str, object]], niveau: str) -> WorkoutPlan:
    """Construit un plan a partir des choix utilisateur."""
    exercices_tries = list(exercices_config.items())
    print("\n=== Selection des exercices ===")
    for idx, (cle, infos) in enumerate(exercices_tries, start=1):
        print(f"{idx}. {infos['nom']}")

    choix = input("Choix (ex: 1,3,5) ou 'auto': ").strip().lower()
    if choix == "auto" or not choix:
        cles = _plan_automatique(niveau)
    else:
        indices = []
        for morceau in choix.split(","):
            morceau = morceau.strip()
            if not morceau:
                continue
            try:
                indice = int(morceau)
            except ValueError:
                continue
            if 1 <= indice <= len(exercices_tries):
                indices.append(indice - 1)
        cles = [exercices_tries[i][0] for i in indices]

    if not cles:
        cles = _plan_automatique(niveau)

    print("\n--- Parametrage des repetitions ---")
    exercices_plan: list[WorkoutExercise] = []
    estimation = 0.0

    for cle in cles:
        infos = exercices_config[cle]
        nom = str(infos["nom"])
        mode = str(infos.get("type", "reps"))
        if mode == "time":
            defaut = int(infos.get("objectif_defaut", 30))
            objectif = _demander_entier(f"Duree pour {nom} (sec)", defaut, 10, 300)
            exercices_plan.append(WorkoutExercise(cle=cle, nom=nom, mode=mode, objectif_secondes=objectif))
            estimation += objectif
        else:
            defaut = int(infos.get("objectif_defaut", 10))
            objectif = _demander_entier(f"Reps pour {nom}", defaut, 3, 60)
            exercices_plan.append(WorkoutExercise(cle=cle, nom=nom, mode=mode, objectif_reps=objectif))
            temps_rep = _TEMPS_PAR_REP_RAPIDE if cle == "mountain_climber" else _TEMPS_PAR_REP
            estimation += objectif * temps_rep

    reordonner = input("Reordonner les exercices ? (o/N): ").strip().lower()
    if reordonner == "o":
        print("Ordre actuel:")
        for idx, exercice in enumerate(exercices_plan, start=1):
            print(f"{idx}. {exercice.nom}")
        nouvel_ordre = input("Nouvel ordre (ex: 2,1,3): ").strip()
        indices = []
        for morceau in nouvel_ordre.split(","):
            morceau = morceau.strip()
            try:
                indice = int(morceau)
            except ValueError:
                continue
            if 1 <= indice <= len(exercices_plan):
                indices.append(indice - 1)
        if len(indices) == len(exercices_plan):
            exercices_plan = [exercices_plan[i] for i in indices]

    print(f"Temps estime: {estimation:.0f} sec")
    return WorkoutPlan(exercices=exercices_plan, estimation_sec=estimation)
