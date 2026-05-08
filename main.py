"""Point d'entree du projet Coach Sportif Temps Reel (v2)."""

from __future__ import annotations

import argparse
from collections import deque
from datetime import datetime
import time

import cv2

import config
from calorie_calculator import calories_depensees
from dashboard import generer_dashboard
from db_manager import DatabaseManager
from exercise_analyzer import ExerciseAnalyzer
from feedback_renderer import dessiner_menu_exercices, dessiner_message_principal, dessiner_panneau_stats
from pose_detector import PoseDetector
from report_generator import generer_rapport_pdf
from session_logger import SessionLogger
from user_profile import UserProfile, demander_profil_utilisateur
from voice_feedback import VoiceFeedback
from workout_planner import creer_plan_automatique, creer_plan_utilisateur


def parser_arguments() -> argparse.Namespace:
    """Definit les options de lancement."""
    parser = argparse.ArgumentParser(description="Coach sportif temps reel avec MediaPipe + OpenCV")
    parser.add_argument("--camera", type=int, default=0, help="Index de la camera (defaut: 0)")
    parser.add_argument("--largeur", type=int, default=config.LARGEUR_VIDEO, help="Largeur de capture video")
    parser.add_argument("--hauteur", type=int, default=config.HAUTEUR_VIDEO, help="Hauteur de capture video")
    parser.add_argument("--fps", type=int, default=config.FPS_CIBLE, help="FPS cible demandes a la webcam")
    parser.add_argument(
        "--exercice",
        choices=tuple(config.EXERCICES.keys()),
        default="squat",
        help="Exercice selectionne au demarrage (si pas de plan)",
    )
    parser.add_argument(
        "--profil",
        choices=tuple(config.PROFILS_DEMO.keys()),
        default=config.PROFIL_DEMO_PAR_DEFAUT,
        help="Profil de coaching demo: strict, equilibre ou tolerant",
    )
    parser.add_argument(
        "--plan-auto",
        action="store_true",
        help="Utilise un plan automatique adapte au profil",
    )
    parser.add_argument(
        "--sans-voix",
        action="store_true",
        help="Desactive le feedback vocal",
    )
    parser.add_argument(
        "--sans-dashboard",
        action="store_true",
        help="Desactive l'affichage du tableau de bord",
    )
    parser.add_argument(
        "--sans-enregistrement",
        action="store_true",
        help="Desactive l'export video MP4 en fin de session",
    )
    return parser.parse_args()


def touche_vers_exercice(touche_clavier: int) -> str | None:
    """Convertit la touche clavier en nom d'exercice."""
    for nom_exercice, infos in config.EXERCICES.items():
        if touche_clavier == ord(str(infos.get("touche", ""))):
            return nom_exercice
    return None


def choisir_profil(db: DatabaseManager) -> UserProfile:
    """Charge ou cree un profil utilisateur."""
    profils = db.get_users()
    dernier_id = db.get_last_user_id()

    if not profils:
        profil = demander_profil_utilisateur()
        profil_id = db.create_user(profil)
        profil.id = profil_id
        db.set_last_user_id(profil_id)
        return profil

    print("\n=== Profils existants ===")
    for profil in profils:
        marque = "*" if profil.id == dernier_id else " "
        print(
            f"{marque} {profil.id}. {profil.prenom} - {profil.age} ans - {profil.poids_kg:.1f} kg - {profil.niveau}"
        )

    choix = input("Choisir un profil (id) ou N pour nouveau: ").strip().lower()
    if choix in {"n", "nouveau"}:
        profil = demander_profil_utilisateur()
        profil_id = db.create_user(profil)
        profil.id = profil_id
        db.set_last_user_id(profil_id)
        return profil

    if not choix and dernier_id is not None:
        profil = db.get_user_by_id(dernier_id)
        if profil is not None:
            db.set_last_user_id(profil.id or dernier_id)
            return profil

    try:
        profil_id = int(choix)
    except ValueError:
        profil_id = dernier_id or profils[0].id

    profil = db.get_user_by_id(profil_id or profils[0].id)
    if profil is None:
        profil = profils[0]
    db.set_last_user_id(profil.id or profils[0].id)
    return profil


def main() -> None:
    """Lance la boucle webcam, l'analyse de pose et les exports de fin de session."""
    arguments = parser_arguments()
    profil_demo = config.appliquer_profil_demo(arguments.profil)
    cv2.setUseOptimized(True)

    db = DatabaseManager(config.DOSSIER_DONNEES / "fitness_data.db")
    profil = choisir_profil(db)

    if arguments.plan_auto:
        plan = creer_plan_automatique(config.EXERCICES, profil.niveau)
    else:
        plan = creer_plan_utilisateur(config.EXERCICES, profil.niveau)

    print(f"Temps estime: {plan.estimation_sec:.0f} sec")

    plan_data = [
        {
            "cle": exercice.cle,
            "mode": exercice.mode,
            "objectif_reps": exercice.objectif_reps,
            "objectif_secondes": exercice.objectif_secondes,
        }
        for exercice in plan.exercices
    ]
    plan_cles = [exercice.cle for exercice in plan.exercices]
    indice_plan = 0

    detecteur_pose = PoseDetector()
    analyseur_exercice = ExerciseAnalyzer()
    if plan_data:
        analyseur_exercice.configurer_plan(plan_data)
    else:
        analyseur_exercice.changer_exercice(arguments.exercice)

    logger_seance = SessionLogger()
    voix = VoiceFeedback(actif=not arguments.sans_voix)

    capture_video = cv2.VideoCapture(arguments.camera)
    capture_video.set(cv2.CAP_PROP_FRAME_WIDTH, arguments.largeur)
    capture_video.set(cv2.CAP_PROP_FRAME_HEIGHT, arguments.hauteur)
    capture_video.set(cv2.CAP_PROP_FPS, arguments.fps)
    capture_video.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not capture_video.isOpened():
        detecteur_pose.fermer()
        raise RuntimeError("Impossible d'ouvrir la webcam.")

    largeur_video = int(capture_video.get(cv2.CAP_PROP_FRAME_WIDTH)) or config.LARGEUR_VIDEO
    hauteur_video = int(capture_video.get(cv2.CAP_PROP_FRAME_HEIGHT)) or config.HAUTEUR_VIDEO
    fps_capture = float(capture_video.get(cv2.CAP_PROP_FPS))
    if fps_capture <= 0:
        fps_capture = float(arguments.fps)

    chemin_video = None
    enregistreur_video = None
    if not arguments.sans_enregistrement:
        chemin_video = logger_seance.chemin_video()
        codec = cv2.VideoWriter_fourcc(*"mp4v")
        enregistreur_video = cv2.VideoWriter(str(chemin_video), codec, fps_capture, (largeur_video, hauteur_video))

        if not enregistreur_video.isOpened():
            enregistreur_video = None
            print("Avertissement: l'enregistrement video est desactive.")

    durees_par_exercice = {nom_exercice: 0.0 for nom_exercice in config.EXERCICES}

    instant_debut = time.perf_counter()
    instant_precedent = instant_debut
    instant_debut_exercice = instant_debut
    historique_fps: deque[float] = deque(maxlen=config.FENETRE_FPS)
    somme_fps = 0.0

    cv2.namedWindow(config.NOM_FENETRE, cv2.WINDOW_NORMAL)

    session_terminee = False

    try:
        while True:
            lecture_ok, image = capture_video.read()
            if not lecture_ok:
                print("Lecture webcam interrompue.")
                break

            image = cv2.flip(image, 1)
            instant_actuel = time.perf_counter()

            delta_temps = max(instant_actuel - instant_precedent, 1e-6)
            fps_frame = 1.0 / delta_temps
            instant_precedent = instant_actuel

            if len(historique_fps) == historique_fps.maxlen:
                somme_fps -= historique_fps[0]
            historique_fps.append(fps_frame)
            somme_fps += fps_frame
            fps_moyen_courant = somme_fps / len(historique_fps)

            resultat_pose = detecteur_pose.detecter_pose(image)
            points_pose = detecteur_pose.extraire_landmarks(resultat_pose)
            orientation = detecteur_pose.detecter_orientation(points_pose)

            retour_analyse = analyseur_exercice.analyser(points_pose, orientation, instant_actuel)
            niveau_feedback = str(
                retour_analyse.get(
                    "niveau_feedback",
                    "ok" if bool(retour_analyse.get("est_correct", False)) else "erreur",
                )
            )

            if config.MODE_COULEUR_BINAIRE:
                couleur_squelette = (
                    config.COULEUR_VERT if bool(retour_analyse.get("est_correct", False)) else config.COULEUR_ROUGE
                )
            else:
                if niveau_feedback == "ok":
                    couleur_squelette = config.COULEUR_VERT
                elif niveau_feedback == "neutre":
                    couleur_squelette = config.COULEUR_AMBRE
                else:
                    couleur_squelette = config.COULEUR_ROUGE

            detecteur_pose.dessiner_squelette(image, resultat_pose, couleur_squelette)

            voix_message = retour_analyse.get("voix")
            if voix_message:
                voix.dire(str(voix_message))

            stats_exercice = analyseur_exercice.obtenir_stats_exercice_actuel()
            donnees_panneau = {
                **stats_exercice,
                "orientation": orientation,
                "profil": profil.niveau,
                "fps": fps_moyen_courant,
                "duree_sec": instant_actuel - instant_debut,
                "angle_principal": retour_analyse.get("angle_principal"),
            }

            dessiner_panneau_stats(image, donnees_panneau)
            dessiner_message_principal(
                image,
                str(retour_analyse["message"]),
                bool(retour_analyse["est_correct"]),
                niveau_feedback=niveau_feedback,
            )

            exercice_suivant = None
            if plan_cles and indice_plan + 1 < len(plan_cles):
                exercice_suivant = plan_cles[indice_plan + 1]
            dessiner_menu_exercices(image, analyseur_exercice.exercice_actuel, profil.niveau, exercice_suivant)

            if enregistreur_video is not None:
                enregistreur_video.write(image)

            cv2.imshow(config.NOM_FENETRE, image)
            touche = cv2.waitKey(1) & 0xFF

            if touche == ord("q"):
                break

            exercice_demande = touche_vers_exercice(touche)
            if exercice_demande and exercice_demande != analyseur_exercice.exercice_actuel:
                durees_par_exercice[analyseur_exercice.exercice_actuel] += instant_actuel - instant_debut_exercice
                analyseur_exercice.changer_exercice(exercice_demande)
                instant_debut_exercice = instant_actuel
                if exercice_demande in plan_cles:
                    indice_plan = plan_cles.index(exercice_demande)

            objectif = stats_exercice.get("objectif", 0)
            mode_obj = stats_exercice.get("mode_objectif", "reps")
            if mode_obj == "time":
                objectif_atteint = stats_exercice.get("temps_tenu_sec", 0.0) >= float(objectif)
            else:
                objectif_atteint = stats_exercice.get("repetitions_correctes", 0) >= int(objectif)

            if plan_cles and objectif_atteint and analyseur_exercice.exercice_actuel == plan_cles[indice_plan]:
                durees_par_exercice[analyseur_exercice.exercice_actuel] += instant_actuel - instant_debut_exercice
                if indice_plan + 1 < len(plan_cles):
                    indice_plan += 1
                    prochain = plan_cles[indice_plan]
                    analyseur_exercice.changer_exercice(prochain)
                    instant_debut_exercice = instant_actuel
                    voix.dire(f"Exercice termine. Suivant: {config.EXERCICES[prochain]['nom']}", force=True)
                else:
                    voix.dire("Seance terminee. Bravo !", force=True)
                    session_terminee = True

            if session_terminee:
                break

    except KeyboardInterrupt:
        print("\nInterruption manuelle de la session.")

    finally:
        instant_fin = time.perf_counter()
        durees_par_exercice[analyseur_exercice.exercice_actuel] += instant_fin - instant_debut_exercice
        duree_totale = instant_fin - instant_debut

        fps_moyen_final = somme_fps / len(historique_fps) if historique_fps else 0.0

        calories_par_exercice = {}
        for nom_exercice, duree in durees_par_exercice.items():
            met = float(config.EXERCICES[nom_exercice].get("met", 0.0))
            calories_par_exercice[nom_exercice] = calories_depensees(met, profil.poids_kg, duree)

        resume_exercices = analyseur_exercice.obtenir_resume_exercices(
            durees_par_exercice=durees_par_exercice,
            calories_par_exercice=calories_par_exercice,
        )
        for ligne in resume_exercices:
            ligne["duree_totale_sec"] = round(duree_totale, 2)
            ligne["fps_moyen"] = round(fps_moyen_final, 2)
        score_global, note_qualite = analyseur_exercice.calculer_scores()

        calories_totales = sum(calories_par_exercice.values())
        objectif_pct = (calories_totales / profil.tdee * 100.0) if profil.tdee > 0 else 0.0
        resume_global = {
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "duree_totale_sec": round(duree_totale, 2),
            "nb_exercices": len(resume_exercices),
            "calories_totales": round(calories_totales, 2),
            "score_global": round(score_global, 2),
            "note_qualite": note_qualite,
            "fps_moyen": round(fps_moyen_final, 2),
            "tdee": round(profil.tdee, 2),
            "objectif_pct": round(objectif_pct, 2),
        }

        if profil.id is not None:
            db.enregistrer_seance(profil.id, resume_global, resume_exercices)

        chemin_csv = logger_seance.enregistrer_rapport_csv(resume_exercices)
        chemin_json = logger_seance.enregistrer_historique_json(resume_exercices)

        chemin_pdf = config.DOSSIER_SORTIES / f"rapport_seance_{logger_seance.horodatage}.pdf"
        generer_rapport_pdf(chemin_pdf, profil, resume_global, resume_exercices)

        chemin_dashboard = config.DOSSIER_SORTIES / f"dashboard_{logger_seance.horodatage}.png"
        if not arguments.sans_dashboard:
            generer_dashboard(db, profil, jours=30, sortie_png=chemin_dashboard, afficher=True)
        else:
            generer_dashboard(db, profil, jours=30, sortie_png=chemin_dashboard, afficher=False)

        capture_video.release()
        if enregistreur_video is not None:
            enregistreur_video.release()
        cv2.destroyAllWindows()
        detecteur_pose.fermer()
        voix.fermer()

        print("Seance terminee.")
        print(f"Profil demo: {profil_demo}")
        print(f"Profil utilisateur: {profil.prenom} ({profil.niveau})")
        print(f"Rapport CSV: {chemin_csv}")
        print(f"Historique JSON: {chemin_json}")
        print(f"Rapport PDF: {chemin_pdf}")
        print(f"Dashboard PNG: {chemin_dashboard}")
        if enregistreur_video is not None and chemin_video is not None:
            print(f"Video demo: {chemin_video}")


if __name__ == "__main__":
    main()
