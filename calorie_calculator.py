"""Calcul des calories depensees par exercice."""

from __future__ import annotations


def calories_depensees(met: float, poids_kg: float, duree_sec: float) -> float:
    """Formule MET: calories = MET * poids_kg * duree_heure."""
    if met <= 0 or poids_kg <= 0 or duree_sec <= 0:
        return 0.0
    return float(met * poids_kg * (duree_sec / 3600.0))
