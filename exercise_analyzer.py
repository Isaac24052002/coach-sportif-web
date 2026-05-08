"""Analyse des exercices et comptage des repetitions (v2)."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from math import inf
import time

import config
from angle_calculator import calculer_angle, distance_2d
from fatigue_detector import detecter_fatigue


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


@dataclass(slots=True)
class EtatExercice:
    """Etat interne de suivi pour un exercice."""

    repetitions_totales: int = 0
    repetitions_valides: int = 0
    repetitions_invalides: int = 0
    etat_mouvement: str = "haute"
    cycle_actif: bool = False
    mouvement_valide: bool = True
    donnees_completes: bool = True
    frames_cycle: int = 0
    frames_basse: int = 0
    angle_historique: deque[float] = field(
        default_factory=lambda: deque(maxlen=config.FENETRE_LISSAGE_ANGLE)
    )
    angle_min_cycle: float = inf
    angle_max_cycle: float = 0.0
    angle_somme_cycle: float = 0.0
    angle_count_cycle: int = 0
    alignement_min_cycle: float = inf
    deplacement_max_cycle: float = 0.0
    position_reference: tuple[float, float] | None = None
    dernier_angle: float | None = None
    frames_statiques: int = 0
    frames_message_prioritaire: int = 0
    dernier_message: str = config.MESSAGE_ATTENTE
    dernier_temps_rep: float = 0.0
    erreur_consecutive_sec: float = 0.0
    dernier_temps_erreur: float | None = None
    amplitudes_reps: list[float] = field(default_factory=list)
    deltas_reps: list[float] = field(default_factory=list)
    fatigue_detectee: bool = False
    rep_fatigue: int | None = None
    angle_min_global: float = inf
    angle_max_global: float = 0.0
    angle_somme_global: float = 0.0
    angle_count_global: int = 0
    temps_tenu_sec: float = 0.0
    dernier_temps_hold: float | None = None
    dernier_genou: str | None = None


class ExerciseAnalyzer:
    """Centralise les regles d'analyse et le comptage des repetitions."""

    def __init__(self) -> None:
        self.exercice_actuel = "squat"
        self.etats: dict[str, EtatExercice] = {}
        self.objectifs: dict[str, dict[str, object]] = {}
        self.plan: list[str] = []

        for nom, regles in config.EXERCICES.items():
            etat = EtatExercice()
            sequence = str(regles.get("sequence", "haute-basse-haute"))
            type_ex = str(regles.get("type", "reps"))
            if type_ex == "time":
                etat.etat_mouvement = "hold"
            elif type_ex == "alternating":
                etat.etat_mouvement = "alternating"
            elif sequence.startswith("basse"):
                etat.etat_mouvement = "basse"
            self.etats[nom] = etat

            if type_ex == "time":
                cible = int(regles.get("objectif_defaut", 30))
                self.objectifs[nom] = {"mode": "time", "cible": cible}
            else:
                cible = int(regles.get("objectif_defaut", 10))
                self.objectifs[nom] = {"mode": "reps", "cible": cible}

    def configurer_plan(self, plan: list[dict[str, object]]) -> None:
        """Configure l'ordre des exercices et leurs objectifs."""
        self.plan = [str(ex["cle"]) for ex in plan if "cle" in ex]
        for exercice in plan:
            cle = str(exercice["cle"])
            if exercice.get("mode") == "time":
                self.objectifs[cle] = {"mode": "time", "cible": int(exercice.get("objectif_secondes", 30))}
            else:
                self.objectifs[cle] = {"mode": "reps", "cible": int(exercice.get("objectif_reps", 10))}

        if self.plan:
            self.changer_exercice(self.plan[0])

    def changer_exercice(self, nouvel_exercice: str) -> None:
        if nouvel_exercice in config.EXERCICES:
            self.exercice_actuel = nouvel_exercice
            etat = self.etats[nouvel_exercice]
            if etat.dernier_message == config.MESSAGE_ATTENTE:
                etat.dernier_message = f"Exercice actif: {config.EXERCICES[nouvel_exercice]['nom']}"

    @staticmethod
    def _taux_reussite(reps_total: int, reps_valides: int) -> float:
        if reps_total <= 0:
            return 0.0
        return (reps_valides / reps_total) * 100.0

    @staticmethod
    def _point(points_pose: dict[str, dict[str, float]], nom: str) -> tuple[float, float] | None:
        point = points_pose.get(nom)
        if not point:
            return None
        return (float(point["x"]), float(point["y"]))

    @staticmethod
    def _visibilite_moyenne(points_pose: dict[str, dict[str, float]], cote: str) -> float:
        noms = POINTS_VISIBILITE_COTE[cote]
        valeurs = [points_pose[n]["visibilite"] for n in noms if n in points_pose]
        if not valeurs:
            return 0.0
        return float(sum(valeurs) / len(valeurs))

    def _choisir_cote(self, points_pose: dict[str, dict[str, float]], orientation: str) -> str | None:
        if orientation == "profil_gauche":
            return "left"
        if orientation == "profil_droit":
            return "right"
        if not points_pose:
            return None

        vis_gauche = self._visibilite_moyenne(points_pose, "left")
        vis_droite = self._visibilite_moyenne(points_pose, "right")
        return "left" if vis_gauche >= vis_droite else "right"

    def _points_cote(self, points_pose: dict[str, dict[str, float]], cote: str) -> dict[str, tuple[float, float] | None]:
        prefixe = "left" if cote == "left" else "right"
        return {
            "epaule": self._point(points_pose, f"{prefixe}_shoulder"),
            "coude": self._point(points_pose, f"{prefixe}_elbow"),
            "poignet": self._point(points_pose, f"{prefixe}_wrist"),
            "hanche": self._point(points_pose, f"{prefixe}_hip"),
            "genou": self._point(points_pose, f"{prefixe}_knee"),
            "cheville": self._point(points_pose, f"{prefixe}_ankle"),
        }

    def _points_bilat(self, points_pose: dict[str, dict[str, float]]) -> tuple[dict[str, tuple[float, float] | None], dict[str, tuple[float, float] | None]]:
        return self._points_cote(points_pose, "left"), self._points_cote(points_pose, "right")

    @staticmethod
    def _dans_intervalle(angle: float | None, intervalle: tuple[float, float]) -> bool:
        if angle is None:
            return False
        return intervalle[0] <= angle <= intervalle[1]

    @staticmethod
    def _lisser_angle(etat: EtatExercice, angle: float | None) -> float | None:
        if angle is None:
            etat.angle_historique.clear()
            return None
        etat.angle_historique.append(angle)
        return sum(etat.angle_historique) / len(etat.angle_historique)

    @staticmethod
    def _mettre_a_jour_inactivite(etat: EtatExercice, angle: float | None) -> None:
        if angle is None:
            etat.frames_statiques = 0
            etat.dernier_angle = None
            return

        if etat.dernier_angle is None:
            etat.frames_statiques = 0
            etat.dernier_angle = angle
            return

        if abs(angle - etat.dernier_angle) < config.SEUIL_VARIATION_ANGLE:
            etat.frames_statiques += 1
        else:
            etat.frames_statiques = 0

        etat.dernier_angle = angle

    @staticmethod
    def _demarrer_cycle(
        etat: EtatExercice,
        angle: float | None,
        alignement: float | None,
        deplacement: float,
        point_reference: tuple[float, float] | None,
    ) -> None:
        etat.cycle_actif = True
        etat.mouvement_valide = True
        etat.donnees_completes = True
        etat.frames_cycle = 0
        etat.frames_basse = 0
        etat.angle_min_cycle = angle if angle is not None else inf
        etat.angle_max_cycle = angle if angle is not None else 0.0
        etat.angle_somme_cycle = angle if angle is not None else 0.0
        etat.angle_count_cycle = 1 if angle is not None else 0
        etat.alignement_min_cycle = alignement if alignement is not None else inf
        etat.deplacement_max_cycle = deplacement
        etat.position_reference = point_reference

        if angle is None:
            etat.donnees_completes = False
        if alignement is None:
            etat.donnees_completes = False

    @staticmethod
    def _mettre_a_jour_cycle(
        etat: EtatExercice,
        angle: float | None,
        alignement: float | None,
        deplacement: float,
    ) -> None:
        if not etat.cycle_actif:
            return

        etat.frames_cycle += 1

        if angle is None:
            etat.donnees_completes = False
        else:
            etat.angle_min_cycle = min(etat.angle_min_cycle, angle)
            etat.angle_max_cycle = max(etat.angle_max_cycle, angle)
            etat.angle_somme_cycle += angle
            etat.angle_count_cycle += 1

        if alignement is None:
            etat.donnees_completes = False
        else:
            etat.alignement_min_cycle = min(etat.alignement_min_cycle, alignement)

        etat.deplacement_max_cycle = max(etat.deplacement_max_cycle, deplacement)

    @staticmethod
    def _reset_cycle(etat: EtatExercice) -> None:
        etat.cycle_actif = False
        etat.mouvement_valide = True
        etat.donnees_completes = True
        etat.frames_cycle = 0
        etat.frames_basse = 0
        etat.angle_min_cycle = inf
        etat.angle_max_cycle = 0.0
        etat.angle_somme_cycle = 0.0
        etat.angle_count_cycle = 0
        etat.alignement_min_cycle = inf
        etat.deplacement_max_cycle = 0.0
        etat.position_reference = None

    @staticmethod
    def _ajouter_stat_global(etat: EtatExercice, angle: float | None) -> None:
        if angle is None:
            return
        etat.angle_min_global = min(etat.angle_min_global, angle)
        etat.angle_max_global = max(etat.angle_max_global, angle)
        etat.angle_somme_global += angle
        etat.angle_count_global += 1

    @staticmethod
    def _angle_genou(points: dict[str, tuple[float, float] | None]) -> float | None:
        return calculer_angle(points.get("hanche"), points.get("genou"), points.get("cheville"))

    @staticmethod
    def _angle_coude(points: dict[str, tuple[float, float] | None]) -> float | None:
        return calculer_angle(points.get("epaule"), points.get("coude"), points.get("poignet"))

    @staticmethod
    def _angle_epaule(points: dict[str, tuple[float, float] | None]) -> float | None:
        return calculer_angle(points.get("hanche"), points.get("epaule"), points.get("coude"))

    @staticmethod
    def _angle_corps(points: dict[str, tuple[float, float] | None]) -> float | None:
        return calculer_angle(points.get("epaule"), points.get("hanche"), points.get("cheville"))

    @staticmethod
    def _angle_torse(points: dict[str, tuple[float, float] | None]) -> float | None:
        return calculer_angle(points.get("epaule"), points.get("hanche"), points.get("genou"))

    @staticmethod
    def _deplacement_genou_normalise(
        point_genou: tuple[float, float] | None,
        point_cheville: tuple[float, float] | None,
    ) -> float:
        if point_genou is None or point_cheville is None:
            return 0.0
        longueur_tibia = distance_2d(point_genou, point_cheville)
        if longueur_tibia <= 1e-6:
            return 0.0
        return abs(point_genou[0] - point_cheville[0]) / longueur_tibia

    def _evaluer_posture_reps(
        self,
        nom_exercice: str,
        angle_principal: float | None,
        angle_alignement: float | None,
        deplacement: float,
        points: dict[str, tuple[float, float] | None],
    ) -> tuple[bool, str]:
        regles = config.EXERCICES[nom_exercice]

        if angle_principal is None:
            return False, "Angle principal non detecte."

        intervalle_haut = regles.get("position_haute")
        intervalle_bas = regles.get("position_basse")
        est_haut = self._dans_intervalle(angle_principal, intervalle_haut)
        est_bas = self._dans_intervalle(angle_principal, intervalle_bas)

        if nom_exercice == "squat":
            if est_bas:
                if angle_alignement is not None and angle_alignement < float(regles.get("angle_alignement_min", 0)):
                    return False, str(regles.get("message_dos"))
                if deplacement > float(regles.get("deplacement_max", 1.0)):
                    return False, str(regles.get("message_genou"))
                return True, "Bonne profondeur !"
            if not est_haut:
                return False, str(regles.get("message_bas"))
            return True, config.MESSAGE_OK

        if nom_exercice == "pushup":
            if est_bas:
                if angle_alignement is not None and angle_alignement < float(regles.get("angle_alignement_min", 0)):
                    return False, str(regles.get("message_alignement"))
                return True, "Bonne descente !"
            if not est_haut:
                return False, str(regles.get("message_bas"))
            if angle_alignement is not None and angle_alignement < float(regles.get("angle_alignement_min", 0)):
                return False, str(regles.get("message_alignement"))
            return True, config.MESSAGE_OK

        if nom_exercice == "curl":
            if deplacement > float(regles.get("deplacement_max", 0.1)):
                return False, str(regles.get("message_coude"))
            if est_haut:
                return True, "Bonne contraction !"
            if est_bas:
                return True, config.MESSAGE_OK
            return False, str(regles.get("message_bas"))

        if nom_exercice == "lunge":
            if est_bas:
                if angle_alignement is not None and angle_alignement < float(regles.get("angle_alignement_min", 0)):
                    return False, str(regles.get("message_dos"))
                if deplacement > float(regles.get("deplacement_max", 1.0)):
                    return False, str(regles.get("message_genou"))
                return True, "Fente validee !"
            if not est_haut:
                return False, str(regles.get("message_bas"))
            return True, config.MESSAGE_OK

        if nom_exercice == "shoulder_press":
            if est_haut:
                return True, "Bonne extension !"
            if est_bas:
                return True, config.MESSAGE_OK
            if angle_principal < intervalle_haut[0]:
                return False, str(regles.get("message_haut"))
            return False, str(regles.get("message_bas"))

        if nom_exercice == "lateral_raise":
            angle_coude = self._angle_coude(points)
            if angle_coude is not None and angle_coude < 160:
                return False, str(regles.get("message_coude"))
            if est_haut:
                return True, "Bonne hauteur !"
            if est_bas:
                return True, config.MESSAGE_OK
            if angle_principal > intervalle_haut[1]:
                return False, str(regles.get("message_bas"))
            return False, str(regles.get("message_haut"))

        if nom_exercice == "tricep_extension":
            if est_haut:
                return True, "Bonne extension !"
            if est_bas:
                return True, config.MESSAGE_OK
            if angle_principal < intervalle_haut[0]:
                return False, str(regles.get("message_haut"))
            return False, str(regles.get("message_bas"))

        if nom_exercice == "deadlift":
            if est_bas:
                if angle_alignement is not None and angle_alignement < float(regles.get("angle_alignement_min", 0)):
                    return False, str(regles.get("message_dos"))
                return True, "Bonne descente !"
            if not est_haut:
                return False, str(regles.get("message_genou"))
            if angle_alignement is not None and angle_alignement < float(regles.get("angle_alignement_min", 0)):
                return False, str(regles.get("message_dos"))
            return True, config.MESSAGE_OK

        return True, config.MESSAGE_OK

    def _mettre_a_jour_erreur(self, etat: EtatExercice, est_correct: bool, temps_actuel: float) -> None:
        if est_correct:
            etat.erreur_consecutive_sec = 0.0
            etat.dernier_temps_erreur = None
            return

        if etat.dernier_temps_erreur is None:
            etat.dernier_temps_erreur = temps_actuel
            return

        etat.erreur_consecutive_sec += temps_actuel - etat.dernier_temps_erreur
        etat.dernier_temps_erreur = temps_actuel

    def _gerer_repetition(
        self,
        etat: EtatExercice,
        regles: dict[str, object],
        angle: float | None,
        alignement: float | None,
        deplacement: float,
        temps_actuel: float,
        point_reference: tuple[float, float] | None,
    ) -> tuple[bool, str]:
        sequence = str(regles.get("sequence", "haute-basse-haute"))
        intervalle_bas = regles.get("position_basse")
        intervalle_haut = regles.get("position_haute")

        est_bas = self._dans_intervalle(angle, intervalle_bas)
        est_haut = self._dans_intervalle(angle, intervalle_haut)

        if est_bas and etat.cycle_actif:
            etat.frames_basse += 1

        if sequence.startswith("haute"):
            if etat.etat_mouvement == "haute" and est_bas:
                etat.etat_mouvement = "basse"
                self._demarrer_cycle(etat, angle, alignement, deplacement, point_reference)
            if etat.etat_mouvement == "basse" and est_haut and etat.cycle_actif:
                return self._valider_cycle(etat, regles, temps_actuel)
        else:
            if etat.etat_mouvement == "basse" and est_haut:
                etat.etat_mouvement = "haute"
                self._demarrer_cycle(etat, angle, alignement, deplacement, point_reference)
            if etat.etat_mouvement == "haute" and est_bas and etat.cycle_actif:
                return self._valider_cycle(etat, regles, temps_actuel)

        return False, ""

    def _valider_cycle(
        self,
        etat: EtatExercice,
        regles: dict[str, object],
        temps_actuel: float,
    ) -> tuple[bool, str]:
        if not etat.donnees_completes:
            self._reset_cycle(etat)
            return False, "Rep non comptee: points insuffisants."

        valide = True
        message = "Repetition validee !"

        if not etat.mouvement_valide:
            valide = False
            message = etat.dernier_message

        if etat.frames_basse < config.MIN_FRAMES_POSITION_BASSE:
            valide = False
            message = "Position basse trop courte."

        amplitude_cycle = etat.angle_max_cycle - etat.angle_min_cycle
        if amplitude_cycle < float(regles.get("amplitude_min_cycle", 0)):
            valide = False
            message = "Amplitude insuffisante."

        if temps_actuel - etat.dernier_temps_rep < config.DELAI_MIN_REP_SEC:
            valide = False
            message = "Mouvement trop rapide."

        etat.repetitions_totales += 1
        etat.dernier_temps_rep = temps_actuel

        if etat.angle_count_cycle > 0:
            angle_moyen = etat.angle_somme_cycle / etat.angle_count_cycle
        else:
            angle_moyen = 0.0

        cible = float(regles.get("angle_cible", angle_moyen))
        if str(regles.get("angle_cible_type", "min")) == "max":
            delta = abs(etat.angle_max_cycle - cible)
        else:
            delta = abs(etat.angle_min_cycle - cible)

        etat.deltas_reps.append(delta)
        etat.amplitudes_reps.append(amplitude_cycle)

        if valide:
            etat.repetitions_valides += 1
        else:
            etat.repetitions_invalides += 1

        self._reset_cycle(etat)
        return valide, message

    def _gerer_plank(
        self,
        etat: EtatExercice,
        regles: dict[str, object],
        points: dict[str, tuple[float, float] | None],
        angle_alignement: float | None,
        temps_actuel: float,
    ) -> tuple[bool, str]:
        if angle_alignement is None:
            etat.dernier_temps_hold = None
            return False, "Hanches non detectees."

        alignement_min = float(regles.get("angle_alignement_min", 0))
        est_correct = angle_alignement >= alignement_min

        if etat.dernier_temps_hold is None:
            etat.dernier_temps_hold = temps_actuel
        delta = temps_actuel - etat.dernier_temps_hold
        etat.dernier_temps_hold = temps_actuel

        if est_correct:
            etat.temps_tenu_sec += max(0.0, delta)
            return True, "Gainage solide, tiens bon !"

        hip = points.get("hanche")
        epaule = points.get("epaule")
        cheville = points.get("cheville")
        if hip and epaule and cheville:
            moyenne_y = (epaule[1] + cheville[1]) / 2.0
            if hip[1] < moyenne_y - 0.02:
                return False, str(regles.get("message_haut"))
            if hip[1] > moyenne_y + 0.02:
                return False, str(regles.get("message_bas"))
        return False, str(regles.get("message_tete"))

    def _gerer_mountain_climber(
        self,
        etat: EtatExercice,
        regles: dict[str, object],
        points_gauche: dict[str, tuple[float, float] | None],
        points_droit: dict[str, tuple[float, float] | None],
        angle_alignement: float | None,
        temps_actuel: float,
    ) -> tuple[bool, str]:
        angle_gauche = self._angle_genou(points_gauche)
        angle_droit = self._angle_genou(points_droit)

        if angle_gauche is None or angle_droit is None:
            return False, "Genou non detecte."

        intervalle_bas = regles.get("position_basse")
        intervalle_haut = regles.get("position_haute")
        gauche_flex = self._dans_intervalle(angle_gauche, intervalle_bas)
        droite_flex = self._dans_intervalle(angle_droit, intervalle_bas)
        gauche_ext = self._dans_intervalle(angle_gauche, intervalle_haut)
        droite_ext = self._dans_intervalle(angle_droit, intervalle_haut)

        if angle_alignement is not None and angle_alignement < float(regles.get("angle_alignement_min", 0)):
            return False, str(regles.get("message_alignement"))

        if gauche_flex and droite_ext and etat.dernier_genou != "left":
            etat.dernier_genou = "left"
        elif droite_flex and gauche_ext and etat.dernier_genou == "left":
            etat.repetitions_totales += 1
            etat.repetitions_valides += 1
            etat.dernier_temps_rep = temps_actuel
            etat.dernier_genou = "right"
            amplitude = abs(angle_gauche - angle_droit)
            etat.amplitudes_reps.append(amplitude)
            etat.deltas_reps.append(0.0)
            return True, "Rep validee !"

        if gauche_flex or droite_flex:
            return True, config.MESSAGE_OK

        return False, str(regles.get("message_bas"))

    def analyser(
        self,
        points_pose: dict[str, dict[str, float]],
        orientation: str,
        temps_actuel: float | None = None,
    ) -> dict[str, str | bool | int | float | None]:
        etat = self.etats[self.exercice_actuel]
        regles = config.EXERCICES[self.exercice_actuel]
        temps_actuel = temps_actuel or time.monotonic()

        if etat.frames_message_prioritaire > 0:
            etat.frames_message_prioritaire -= 1

        if orientation in {"inconnue", "incertaine"}:
            etat.frames_statiques = 0
            etat.dernier_angle = None
            etat.dernier_message = config.MESSAGE_ORIENTATION
            return self._construire_retour(etat, False, etat.dernier_message, None, "neutre")

        if not points_pose:
            etat.frames_statiques = 0
            etat.dernier_angle = None
            etat.dernier_message = config.MESSAGE_ATTENTE
            return self._construire_retour(etat, False, etat.dernier_message, None, "neutre")

        type_ex = str(regles.get("type", "reps"))
        voix_message = None
        est_correct = False
        message = config.MESSAGE_OK
        niveau_feedback = "ok"
        angle_principal = None

        if type_ex == "time":
            cote = self._choisir_cote(points_pose, orientation) or "left"
            points = self._points_cote(points_pose, cote)
            angle_alignement = self._angle_corps(points)
            est_correct, message = self._gerer_plank(etat, regles, points, angle_alignement, temps_actuel)
            angle_principal = angle_alignement
        elif type_ex == "alternating":
            points_gauche, points_droit = self._points_bilat(points_pose)
            cote = self._choisir_cote(points_pose, orientation) or "left"
            points_align = points_gauche if cote == "left" else points_droit
            angle_alignement = self._angle_corps(points_align)
            est_correct, message = self._gerer_mountain_climber(
                etat,
                regles,
                points_gauche,
                points_droit,
                angle_alignement,
                temps_actuel,
            )
            angle_principal = None
        else:
            cote = self._choisir_cote(points_pose, orientation) or "left"
            points = self._points_cote(points_pose, cote)
            angle_alignement = None
            deplacement = 0.0

            if self.exercice_actuel in {"squat", "lunge", "deadlift"}:
                angle_principal = self._angle_genou(points)
                if self.exercice_actuel == "lunge":
                    angle_alignement = self._angle_torse(points)
                else:
                    angle_alignement = self._angle_corps(points)
                deplacement = self._deplacement_genou_normalise(points.get("genou"), points.get("cheville"))
            elif self.exercice_actuel in {"pushup", "curl", "shoulder_press", "tricep_extension"}:
                angle_principal = self._angle_coude(points)
                if self.exercice_actuel == "pushup":
                    angle_alignement = self._angle_corps(points)
            else:
                angle_principal = self._angle_epaule(points)

            angle_principal = self._lisser_angle(etat, angle_principal)
            self._ajouter_stat_global(etat, angle_principal)
            self._mettre_a_jour_inactivite(etat, angle_principal)
            est_correct, message = self._evaluer_posture_reps(
                self.exercice_actuel,
                angle_principal,
                angle_alignement,
                deplacement,
                points,
            )

            if not est_correct:
                if config.INVALIDER_REP_SUR_PREMIERE_ERREUR and etat.cycle_actif:
                    etat.mouvement_valide = False
                if angle_principal is None and etat.cycle_actif:
                    etat.donnees_completes = False

            self._mettre_a_jour_cycle(etat, angle_principal, angle_alignement, deplacement)
            rep_validee, message_rep = self._gerer_repetition(
                etat,
                regles,
                angle_principal,
                angle_alignement,
                deplacement,
                temps_actuel,
                points.get("epaule"),
            )
            if message_rep:
                message = message_rep
                etat.frames_message_prioritaire = config.FRAMES_RETENTION_FEEDBACK
                if rep_validee and etat.repetitions_valides % 3 == 0:
                    voix_message = f"Repetition {etat.repetitions_valides} validee, super travail !"
                if not rep_validee:
                    est_correct = False
                    niveau_feedback = "erreur"

        if not est_correct:
            niveau_feedback = "erreur"

        self._mettre_a_jour_erreur(etat, est_correct, temps_actuel)
        if etat.erreur_consecutive_sec >= config.DUREE_ERREUR_VOIX_SEC:
            voix_message = message
            etat.erreur_consecutive_sec = 0.0
            etat.dernier_temps_erreur = None

        if (
            niveau_feedback == "ok"
            and etat.frames_message_prioritaire <= 0
            and not etat.cycle_actif
            and etat.etat_mouvement in {"haute", "basse"}
        ):
            niveau_feedback = "neutre"
            est_correct = False
            if etat.frames_statiques >= config.SEUIL_FRAMES_INACTIVITE:
                message = config.MESSAGE_INACTIVITE
            else:
                message = config.MESSAGE_PRET

        etat.dernier_message = message
        retour = self._construire_retour(etat, est_correct, message, angle_principal, niveau_feedback)
        retour["voix"] = voix_message
        retour["objectif"] = self.objectifs.get(self.exercice_actuel, {}).get("cible", 0)
        retour["mode_objectif"] = self.objectifs.get(self.exercice_actuel, {}).get("mode", "reps")
        return retour

    def _construire_retour(
        self,
        etat: EtatExercice,
        est_correct: bool,
        message: str,
        angle_principal: float | None,
        niveau_feedback: str,
    ) -> dict[str, str | bool | int | float | None]:
        taux_reussite = self._taux_reussite(etat.repetitions_totales, etat.repetitions_valides)
        return {
            "est_correct": est_correct,
            "niveau_feedback": niveau_feedback,
            "message": message,
            "angle_principal": angle_principal,
            "repetitions_totales": etat.repetitions_totales,
            "repetitions_correctes": etat.repetitions_valides,
            "repetitions_invalides": etat.repetitions_invalides,
            "taux_reussite": taux_reussite,
        }

    def obtenir_stats_exercice_actuel(self) -> dict[str, str | int | float | bool | None]:
        etat = self.etats[self.exercice_actuel]
        objectif = self.objectifs.get(self.exercice_actuel, {})
        return {
            "nom_exercice": config.EXERCICES[self.exercice_actuel]["nom"],
            "repetitions_totales": etat.repetitions_totales,
            "repetitions_correctes": etat.repetitions_valides,
            "repetitions_invalides": etat.repetitions_invalides,
            "taux_reussite": self._taux_reussite(etat.repetitions_totales, etat.repetitions_valides),
            "etat_mouvement": etat.etat_mouvement,
            "objectif": objectif.get("cible", 0),
            "mode_objectif": objectif.get("mode", "reps"),
            "temps_tenu_sec": etat.temps_tenu_sec,
            "fatigue_detectee": etat.fatigue_detectee,
        }

    def calculer_scores(self) -> tuple[float, str]:
        scores = []
        poids = []
        for nom, etat in self.etats.items():
            regles = config.EXERCICES[nom]
            type_ex = str(regles.get("type", "reps"))
            reps_total = etat.repetitions_totales
            reps_valides = etat.repetitions_valides
            if type_ex == "time":
                reps_total = int(etat.temps_tenu_sec)
                reps_valides = int(etat.temps_tenu_sec)

            if reps_total == 0 and etat.temps_tenu_sec <= 0:
                continue

            delta_moyen = sum(etat.deltas_reps) / len(etat.deltas_reps) if etat.deltas_reps else 0.0
            taux = self._taux_reussite(reps_total, reps_valides)
            score = (taux * 0.7) + (max(0.0, 1 - delta_moyen / 30.0) * 30)
            scores.append(score)
            poids.append(max(reps_total, 1))

        if not scores:
            return 0.0, "Insuffisant"

        score_global = sum(s * p for s, p in zip(scores, poids)) / sum(poids)
        if score_global >= 85:
            note = "Excellent"
        elif score_global >= 70:
            note = "Tres bien"
        elif score_global >= 55:
            note = "Correct"
        else:
            note = "Insuffisant"
        return score_global, note

    def detecter_fatigue_exercices(self) -> None:
        for etat in self.etats.values():
            fatigue, rep_fatigue, _ = detecter_fatigue(etat.amplitudes_reps, config.SEUIL_FATIGUE)
            etat.fatigue_detectee = fatigue
            etat.rep_fatigue = rep_fatigue

    def obtenir_resume_exercices(
        self,
        durees_par_exercice: dict[str, float],
        calories_par_exercice: dict[str, float],
    ) -> list[dict[str, object]]:
        self.detecter_fatigue_exercices()
        lignes = []
        for nom_exercice, etat in self.etats.items():
            duree_exercice = float(durees_par_exercice.get(nom_exercice, 0.0))
            regles = config.EXERCICES[nom_exercice]
            type_ex = str(regles.get("type", "reps"))
            reps_total = etat.repetitions_totales
            reps_valides = etat.repetitions_valides
            if type_ex == "time":
                reps_total = int(etat.temps_tenu_sec)
                reps_valides = int(etat.temps_tenu_sec)

            if reps_total == 0 and duree_exercice <= 0:
                continue

            delta_moyen = sum(etat.deltas_reps) / len(etat.deltas_reps) if etat.deltas_reps else 0.0
            taux = self._taux_reussite(reps_total, reps_valides)
            score_qualite = (taux * 0.7) + (max(0.0, 1 - delta_moyen / 30.0) * 30)
            angle_moyen = etat.angle_somme_global / etat.angle_count_global if etat.angle_count_global else 0.0

            objectif = self.objectifs.get(nom_exercice, {})
            lignes.append(
                {
                    "nom_exercice": config.EXERCICES[nom_exercice]["nom"],
                    "reps_cibles": int(objectif.get("cible", 0)),
                    "reps_realisees": reps_total,
                    "reps_validees": reps_valides,
                    "duree_sec": round(duree_exercice, 2),
                    "calories": round(float(calories_par_exercice.get(nom_exercice, 0.0)), 2),
                    "score_qualite": round(score_qualite, 2),
                    "angle_moyen": round(angle_moyen, 2),
                    "angle_min": round(etat.angle_min_global if etat.angle_min_global < inf else 0.0, 2),
                    "angle_max": round(etat.angle_max_global, 2),
                    "fatigue_detectee": etat.fatigue_detectee,
                    "rep_fatigue": etat.rep_fatigue,
                }
            )

        return lignes
