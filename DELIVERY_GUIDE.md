# Guide de livraison (front + API)

Ce projet se livre comme une seule application web avec un front React et un backend FastAPI.
Le build du front est servi par l'API depuis static/dist.

## Option A (recommandee) : Docker

1) Installer Docker + Docker Compose.
2) Copier .env.example vers .env et ajuster si besoin.
3) Lancer :
   docker compose up --build -d
   (ou docker-compose up --build -d si compose v2 n'est pas disponible)
4) Ouvrir :
   http://VOTRE_SERVEUR:8000
5) Docs API :
   http://VOTRE_SERVEUR:8000/api/docs

## Option B : Installation manuelle (sans Docker)

Prerequis :
- Python 3.12
- Node 20 (uniquement si vous devez rebuild le front)

Etapes :
1) python -m venv .venv
2) .venv/bin/pip install -r requirements.txt
3) (build optionnel) cd coach_front && npm install && npm run build
4) .venv/bin/python web_app.py --host 0.0.0.0 --port 8000

## Options de base de donnees

Fichier SQLite par defaut :
- donnees/fitness_data.db

Changer l'emplacement SQLite (recommande en prod) :
- Definir DB_PATH dans .env, par exemple :
  DB_PATH=/app/donnees/fitness_data.db

Base externe (Postgres/MySQL) :
- Non supportee sans modifications de code. Une refonte est necessaire.

## Integration API avec un autre front

Si l'API est appelee depuis un autre domaine, definir CORS_ORIGINS :
- Exemple :
  CORS_ORIGINS=https://app.example.com,https://admin.example.com

Si le front est servi par le meme domaine FastAPI, CORS n'est pas requis.

## HTTPS requis pour la camera

L'acces camera dans le navigateur exige HTTPS sur un domaine distant.
Utiliser un reverse proxy (Nginx ou Caddy) pour ajouter TLS.

## A livrer

- Code source
- .env.example
- Dockerfile + docker-compose.yml
- Ce guide
