"""Tableau de bord Matplotlib a partir des donnees SQLite."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt

from db_manager import DatabaseManager
from user_profile import UserProfile


def generer_dashboard(
    db: DatabaseManager,
    profil: UserProfile,
    jours: int = 30,
    sortie_png: Path | None = None,
    afficher: bool = True,
) -> Path | None:
    progression = list(reversed(db.recuperer_progression(profil.id or 0, jours)))
    reps_exercices = db.recuperer_repetitions_exercices(profil.id or 0, jours)
    scores = db.recuperer_scores_seances(profil.id or 0, jours)
    qualites = db.recuperer_qualite_angles(profil.id or 0, jours)

    dates = [ligne["date"] for ligne in progression]
    calories = [ligne["calories_totales"] for ligne in progression]
    scores_jour = [ligne["score_moyen"] for ligne in progression]

    fig, axes = plt.subplots(2, 3, figsize=(15, 8))
    fig.suptitle("Tableau de bord - Progression", fontsize=14)

    axes[0, 0].plot(dates, calories, marker="o")
    axes[0, 0].set_title("Calories par jour")
    axes[0, 0].tick_params(axis="x", rotation=45)

    axes[0, 1].plot(dates, scores_jour, color="tab:green", marker="o")
    axes[0, 1].set_title("Score moyen par jour")
    axes[0, 1].tick_params(axis="x", rotation=45)

    noms_ex = [ligne["nom_exercice"] for ligne in reps_exercices]
    reps = [ligne["reps"] for ligne in reps_exercices]
    axes[0, 2].bar(noms_ex, reps, color="tab:blue")
    axes[0, 2].set_title("Reps validees (30j)")
    axes[0, 2].tick_params(axis="x", rotation=45)

    qual_noms = [ligne["nom_exercice"] for ligne in qualites]
    qual_scores = [ligne["score_moyen"] for ligne in qualites]
    axes[1, 0].bar(qual_noms, qual_scores, color="tab:orange")
    axes[1, 0].set_title("Qualite par exercice")
    axes[1, 0].tick_params(axis="x", rotation=45)

    semaines = defaultdict(int)
    for ligne in scores:
        try:
            dt = datetime.fromisoformat(ligne["date"])
        except ValueError:
            continue
        cle = f"{dt.year}-S{dt.isocalendar().week:02d}"
        semaines[cle] += 1
    semaines_cles = sorted(semaines.keys())
    semaines_valeurs = [semaines[k] for k in semaines_cles]
    axes[1, 1].bar(semaines_cles, semaines_valeurs, color="tab:purple")
    axes[1, 1].set_title("Frequence des seances")
    axes[1, 1].tick_params(axis="x", rotation=45)

    objectif = profil.tdee
    axes[1, 2].bar(["Objectif", "Moyenne"], [objectif, sum(calories) / max(len(calories), 1)], color="tab:red")
    axes[1, 2].set_title("Objectif vs calories")

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])

    if sortie_png:
        sortie_png.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(sortie_png, dpi=150)

    if afficher:
        plt.show()
    else:
        plt.close(fig)

    return sortie_png
