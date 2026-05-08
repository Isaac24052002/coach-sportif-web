"""Detection de fatigue musculaire via degradation d'amplitude."""

from __future__ import annotations


def detecter_fatigue(amplitudes: list[float], seuil: float = 0.15) -> tuple[bool, int | None, float]:
    """Compare les 3 premieres et 3 dernieres amplitudes."""
    if len(amplitudes) < 6:
        return False, None, 0.0

    debut = sum(amplitudes[:3]) / 3.0
    fin = sum(amplitudes[-3:]) / 3.0
    if debut <= 0:
        return False, None, 0.0

    degradation = (debut - fin) / debut
    if degradation >= seuil:
        rep_fatigue = max(1, len(amplitudes) - 2)
        return True, rep_fatigue, degradation

    return False, None, degradation
