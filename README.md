# Coach Fitness IA

Coach fitness avec analyse de posture, plan de seance, suivi utilisateur et exports de fin de session.

Le projet propose maintenant deux experiences:

- `python main.py` pour la version locale OpenCV/terminal
- `python3 web_app.py` pour la version web responsive avec camera navigateur

## Points forts

- Interface web premium, fluide et responsive sur mobile, tablette et PC
- Ecran d inscription / connexion avant l acces a l application
- Navigation complete: accueil, seance live, progression, profil, parametres
- Mode focus pour une vue camera tres degagee pendant l exercice
- Webcam navigateur + squelette temps reel dans l interface
- Reutilisation du moteur Python existant pour les repetitions, la qualite et la progression
- Profils utilisateurs SQLite, historique, resume final et exports CSV/JSON/PDF/dashboard
- Themes visuels personnalisables et deconnexion locale

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Lancer la version web

```bash
python3 web_app.py
```

Puis ouvre:

```text
http://127.0.0.1:8000
```

Pour exposer le serveur sur le reseau local:

```bash
python3 web_app.py --host 0.0.0.0 --port 8000
```

## Mobile et tablette

Pour utiliser la camera sur un telephone ou une tablette:

- `localhost` fonctionne sur l appareil lui-meme
- via reseau local, beaucoup de navigateurs exigent `HTTPS` pour autoriser la camera

En pratique: pour un vrai usage mobile distant, prevois un acces HTTPS.

## Lancer la version terminal historique

```bash
python main.py
```

Options utiles:

```bash
python main.py --plan-auto
python main.py --sans-voix
python main.py --sans-dashboard
python main.py --sans-enregistrement
```

## Structure web ajoutee

- `web_app.py` : backend FastAPI et API live
- `web_pose_utils.py` : orientation/cadrage sans MediaPipe Python
- `index.html` : shell de l application web
- `static/css/app.css` : theme responsive
- `static/js/app.js` : camera, pose web et orchestration UI
- `manifest.webmanifest` : base PWA

## Exports

Les fichiers de fin de seance restent ecrits dans `sorties/`:

- `rapport_seance_YYYYMMDD_HHMMSS.csv`
- `historique_seance_YYYYMMDD_HHMMSS.json`
- `rapport_seance_YYYYMMDD_HHMMSS.pdf`
- `dashboard_YYYYMMDD_HHMMSS.png`

## Notes

- La version web n utilise pas `pose_detector.py` pour la camera: la pose est detectee dans le navigateur, puis analysee par le moteur Python du projet.
- Le moteur web MediaPipe est charge via le module officiel `@mediapipe/tasks-vision` cote navigateur.
- La version terminal existante reste disponible si tu veux continuer a utiliser OpenCV directement.
