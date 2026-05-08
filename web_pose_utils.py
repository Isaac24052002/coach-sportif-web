"""Utilitaires de pose reutilisables cote web sans dependre de MediaPipe Python."""

from __future__ import annotations

from collections import deque

import config


POINTS_VISIBILITE_COTE = {
    "left": (
        "left_shoulder",
        "left_hip",
        "left_knee",
        "left_ankle",
        "left_elbow",
        "left_wrist",
    ),
    "right": (
        "right_shoulder",
        "right_hip",
        "right_knee",
        "right_ankle",
        "right_elbow",
        "right_wrist",
    ),
}


def visibilite_moyenne(points_pose: dict[str, dict[str, float]], cote: str) -> float:
    """Calcule la visibilite moyenne des principaux points d'un cote."""
    noms = POINTS_VISIBILITE_COTE[cote]
    valeurs = [float(points_pose[n]["visibilite"]) for n in noms if n in points_pose]
    if not valeurs:
        return 0.0
    return float(sum(valeurs) / len(valeurs))


def orientation_majoritaire(historique_orientation: deque[str]) -> str:
    """Lisse l'orientation sur quelques frames pour reduire les oscillations."""
    if not historique_orientation:
        return "incertaine"

    compteur: dict[str, int] = {}
    for valeur in historique_orientation:
        compteur[valeur] = compteur.get(valeur, 0) + 1
    return max(compteur, key=compteur.get)


def detecter_orientation(points_pose: dict[str, dict[str, float]], historique_orientation: deque[str]) -> str:
    """Detecte si la personne est de face, de profil gauche ou de profil droit."""
    if not points_pose:
        historique_orientation.clear()
        return "inconnue"

    visibilite_gauche = visibilite_moyenne(points_pose, "left")
    visibilite_droite = visibilite_moyenne(points_pose, "right")

    orientation_inst = "incertaine"
    if visibilite_gauche > config.SEUIL_FACE and visibilite_droite > config.SEUIL_FACE:
        orientation_inst = "face"
    elif visibilite_gauche > config.SEUIL_PROFIL_HAUT and visibilite_droite < config.SEUIL_PROFIL_BAS:
        orientation_inst = "profil_gauche"
    elif visibilite_droite > config.SEUIL_PROFIL_HAUT and visibilite_gauche < config.SEUIL_PROFIL_BAS:
        orientation_inst = "profil_droit"

    if orientation_inst in {"face", "profil_gauche", "profil_droit"}:
        historique_orientation.append(orientation_inst)
        return orientation_majoritaire(historique_orientation)

    if historique_orientation:
        return orientation_majoritaire(historique_orientation)
    return "incertaine"
