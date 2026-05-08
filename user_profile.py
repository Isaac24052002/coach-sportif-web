"""Gestion du profil utilisateur pour le coaching fitness."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class UserProfile:
    """Profil utilisateur et indicateurs derives."""

    id: int | None = None
    prenom: str = ""
    age: int = 0
    taille_cm: float = 0.0
    poids_kg: float = 0.0
    sexe: str = "M"
    niveau: str = "debutant"
    date_creation: str | None = None

    @property
    def taille_m(self) -> float:
        return self.taille_cm / 100.0 if self.taille_cm else 0.0

    @property
    def imc(self) -> float:
        taille_m = self.taille_m
        if taille_m <= 0:
            return 0.0
        return round(self.poids_kg / (taille_m**2), 2)

    @property
    def fc_max(self) -> int:
        return max(0, 220 - int(self.age))

    @property
    def tdee(self) -> float:
        """Calcule le TDEE via Harris-Benedict (facteur selon niveau)."""
        if self.sexe.upper().startswith("F"):
            bmr = 447.593 + (9.247 * self.poids_kg) + (3.098 * self.taille_cm) - (4.330 * self.age)
        else:
            bmr = 88.362 + (13.397 * self.poids_kg) + (4.799 * self.taille_cm) - (5.677 * self.age)

        facteurs = {
            "debutant": 1.2,
            "intermediaire": 1.375,
            "avance": 1.55,
        }
        facteur = facteurs.get(self.niveau, 1.2)
        return round(bmr * facteur, 1)

    def as_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "prenom": self.prenom,
            "age": self.age,
            "taille_cm": self.taille_cm,
            "poids_kg": self.poids_kg,
            "sexe": self.sexe,
            "niveau": self.niveau,
            "date_creation": self.date_creation,
        }


def _demander_texte(label: str, defaut: str | None = None) -> str:
    while True:
        suffixe = f" [{defaut}]" if defaut else ""
        valeur = input(f"{label}{suffixe}: ").strip()
        if valeur:
            return valeur
        if defaut is not None:
            return defaut


def _demander_int(label: str, defaut: int | None = None, mini: int | None = None, maxi: int | None = None) -> int:
    while True:
        suffixe = f" [{defaut}]" if defaut is not None else ""
        valeur = input(f"{label}{suffixe}: ").strip()
        if not valeur and defaut is not None:
            return defaut
        try:
            entier = int(valeur)
        except ValueError:
            print("Valeur invalide. Recommence.")
            continue
        if mini is not None and entier < mini:
            print(f"Minimum {mini}.")
            continue
        if maxi is not None and entier > maxi:
            print(f"Maximum {maxi}.")
            continue
        return entier


def _demander_float(label: str, defaut: float | None = None, mini: float | None = None, maxi: float | None = None) -> float:
    while True:
        suffixe = f" [{defaut}]" if defaut is not None else ""
        valeur = input(f"{label}{suffixe}: ").strip().replace(",", ".")
        if not valeur and defaut is not None:
            return float(defaut)
        try:
            nombre = float(valeur)
        except ValueError:
            print("Valeur invalide. Recommence.")
            continue
        if mini is not None and nombre < mini:
            print(f"Minimum {mini}.")
            continue
        if maxi is not None and nombre > maxi:
            print(f"Maximum {maxi}.")
            continue
        return nombre


def _demander_choix(label: str, choix: list[str], defaut: str | None = None) -> str:
    choix_norm = [c.lower() for c in choix]
    while True:
        suffixe = f" [{defaut}]" if defaut else ""
        valeur = input(f"{label} ({'/'.join(choix)}){suffixe}: ").strip().lower()
        if not valeur and defaut:
            return defaut
        if valeur in choix_norm:
            return valeur
        print("Choix invalide. Recommence.")


def demander_profil_utilisateur() -> UserProfile:
    """Demande les infos via terminal et retourne un profil."""
    print("\n=== Profil utilisateur ===")
    prenom = _demander_texte("Prenom", defaut="Coach")
    age = _demander_int("Age", defaut=25, mini=10, maxi=90)
    taille_cm = _demander_float("Taille (cm)", defaut=170.0, mini=120.0, maxi=230.0)
    poids_kg = _demander_float("Poids (kg)", defaut=70.0, mini=35.0, maxi=200.0)
    sexe = _demander_choix("Sexe", ["M", "F"], defaut="M").upper()
    niveau = _demander_choix("Niveau", ["debutant", "intermediaire", "avance"], defaut="debutant")

    return UserProfile(
        prenom=prenom,
        age=age,
        taille_cm=taille_cm,
        poids_kg=poids_kg,
        sexe=sexe,
        niveau=niveau,
        date_creation=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
