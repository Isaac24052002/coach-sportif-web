"""Gestion de la base SQLite pour profils et seances."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from user_profile import UserProfile


class DatabaseManager:
    """Encapsule les operations SQLite du projet."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialiser()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _initialiser(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS UTILISATEUR (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prenom TEXT NOT NULL,
                    age INTEGER NOT NULL,
                    taille REAL NOT NULL,
                    poids REAL NOT NULL,
                    sexe TEXT NOT NULL,
                    niveau TEXT NOT NULL,
                    date_creation TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS SEANCE (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_utilisateur INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    duree_totale_sec REAL NOT NULL,
                    calories_totales REAL NOT NULL,
                    score_global REAL NOT NULL,
                    note_qualite TEXT NOT NULL,
                    FOREIGN KEY(id_utilisateur) REFERENCES UTILISATEUR(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS EXERCICE_SEANCE (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_seance INTEGER NOT NULL,
                    nom_exercice TEXT NOT NULL,
                    reps_cibles INTEGER NOT NULL,
                    reps_realisees INTEGER NOT NULL,
                    reps_validees INTEGER NOT NULL,
                    duree_sec REAL NOT NULL,
                    calories REAL NOT NULL,
                    score_qualite REAL NOT NULL,
                    angle_moyen REAL NOT NULL,
                    angle_min REAL NOT NULL,
                    angle_max REAL NOT NULL,
                    fatigue_detectee INTEGER NOT NULL,
                    rep_fatigue INTEGER,
                    FOREIGN KEY(id_seance) REFERENCES SEANCE(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS PROGRESSION_JOURNALIERE (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_utilisateur INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    calories_totales REAL NOT NULL,
                    nb_exercices INTEGER NOT NULL,
                    score_moyen REAL NOT NULL,
                    duree_totale REAL NOT NULL,
                    nb_seances INTEGER NOT NULL DEFAULT 1,
                    UNIQUE(id_utilisateur, date),
                    FOREIGN KEY(id_utilisateur) REFERENCES UTILISATEUR(id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS APP_STATE (
                    cle TEXT PRIMARY KEY,
                    valeur TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS COMPTE (
                    user_id INTEGER PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    mot_de_passe_hash TEXT NOT NULL,
                    theme TEXT NOT NULL DEFAULT 'ember',
                    date_creation TEXT NOT NULL,
                    last_login TEXT,
                    FOREIGN KEY(user_id) REFERENCES UTILISATEUR(id) ON DELETE CASCADE
                )
                """
            )
            self._migrer_progression_journaliere(conn)

    @staticmethod
    def _colonne_existe(conn: sqlite3.Connection, table: str, colonne: str) -> bool:
        lignes = conn.execute(f"PRAGMA table_info({table})").fetchall()
        return any(str(ligne["name"]) == colonne for ligne in lignes)

    def _migrer_progression_journaliere(self, conn: sqlite3.Connection) -> None:
        if not self._colonne_existe(conn, "PROGRESSION_JOURNALIERE", "nb_seances"):
            conn.execute(
                "ALTER TABLE PROGRESSION_JOURNALIERE ADD COLUMN nb_seances INTEGER NOT NULL DEFAULT 1"
            )

        lignes = conn.execute(
            """
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN length(date) != 10 THEN 1 ELSE 0 END) as dates_avec_heure
            FROM PROGRESSION_JOURNALIERE
            """
        ).fetchone()
        if not lignes or int(lignes["total"]) == 0:
            return

        if int(lignes["dates_avec_heure"] or 0) == 0:
            return

        conn.execute("DROP TABLE IF EXISTS progression_journaliere_tmp")
        conn.execute(
            """
            CREATE TEMP TABLE progression_journaliere_tmp AS
            SELECT
                id_utilisateur,
                substr(date, 1, 10) AS date_jour,
                SUM(calories_totales) AS calories_totales,
                SUM(nb_exercices) AS nb_exercices,
                AVG(score_moyen) AS score_moyen,
                SUM(duree_totale) AS duree_totale,
                SUM(COALESCE(nb_seances, 1)) AS nb_seances
            FROM PROGRESSION_JOURNALIERE
            GROUP BY id_utilisateur, substr(date, 1, 10)
            """
        )
        conn.execute("DELETE FROM PROGRESSION_JOURNALIERE")
        conn.execute(
            """
            INSERT INTO PROGRESSION_JOURNALIERE (
                id_utilisateur,
                date,
                calories_totales,
                nb_exercices,
                score_moyen,
                duree_totale,
                nb_seances
            )
            SELECT
                id_utilisateur,
                date_jour,
                calories_totales,
                nb_exercices,
                score_moyen,
                duree_totale,
                nb_seances
            FROM progression_journaliere_tmp
            """
        )
        conn.execute("DROP TABLE progression_journaliere_tmp")

    @staticmethod
    def _row_to_profile(ligne: sqlite3.Row) -> UserProfile:
        return UserProfile(
            id=ligne["id"],
            prenom=ligne["prenom"],
            age=int(ligne["age"]),
            taille_cm=float(ligne["taille"]),
            poids_kg=float(ligne["poids"]),
            sexe=str(ligne["sexe"]),
            niveau=str(ligne["niveau"]),
            date_creation=str(ligne["date_creation"]),
        )

    def get_users(self) -> list[UserProfile]:
        with self._connect() as conn:
            lignes = conn.execute("SELECT * FROM UTILISATEUR ORDER BY id ASC").fetchall()
        return [self._row_to_profile(ligne) for ligne in lignes]

    def create_user(self, profil: UserProfile) -> int:
        with self._connect() as conn:
            curseur = conn.execute(
                """
                INSERT INTO UTILISATEUR (prenom, age, taille, poids, sexe, niveau, date_creation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profil.prenom,
                    profil.age,
                    profil.taille_cm,
                    profil.poids_kg,
                    profil.sexe,
                    profil.niveau,
                    profil.date_creation or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                ),
            )
            profil_id = int(curseur.lastrowid)
        return profil_id

    def create_account(
        self,
        profil: UserProfile,
        email: str,
        mot_de_passe_hash: str,
        theme: str = "ember",
    ) -> int:
        with self._connect() as conn:
            curseur = conn.execute(
                """
                INSERT INTO UTILISATEUR (prenom, age, taille, poids, sexe, niveau, date_creation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profil.prenom,
                    profil.age,
                    profil.taille_cm,
                    profil.poids_kg,
                    profil.sexe,
                    profil.niveau,
                    profil.date_creation or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                ),
            )
            profil_id = int(curseur.lastrowid)
            conn.execute(
                """
                INSERT INTO COMPTE (user_id, email, mot_de_passe_hash, theme, date_creation)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    profil_id,
                    email.strip().lower(),
                    mot_de_passe_hash,
                    theme,
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                ),
            )
        return profil_id

    def update_user(self, profil: UserProfile) -> None:
        if profil.id is None:
            raise ValueError("Impossible de mettre a jour un profil sans identifiant.")

        with self._connect() as conn:
            conn.execute(
                """
                UPDATE UTILISATEUR
                SET prenom = ?, age = ?, taille = ?, poids = ?, sexe = ?, niveau = ?
                WHERE id = ?
                """,
                (
                    profil.prenom,
                    profil.age,
                    profil.taille_cm,
                    profil.poids_kg,
                    profil.sexe,
                    profil.niveau,
                    profil.id,
                ),
            )

    def get_user_by_id(self, user_id: int) -> UserProfile | None:
        with self._connect() as conn:
            ligne = conn.execute("SELECT * FROM UTILISATEUR WHERE id = ?", (user_id,)).fetchone()
        if ligne is None:
            return None
        return self._row_to_profile(ligne)

    def get_account_by_email(self, email: str) -> sqlite3.Row | None:
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT u.*, c.user_id, c.email, c.mot_de_passe_hash, c.theme, c.last_login
                FROM COMPTE c
                JOIN UTILISATEUR u ON u.id = c.user_id
                WHERE lower(c.email) = lower(?)
                """,
                (email.strip(),),
            ).fetchone()

    def get_account_by_user_id(self, user_id: int) -> sqlite3.Row | None:
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT u.*, c.user_id, c.email, c.mot_de_passe_hash, c.theme, c.last_login
                FROM COMPTE c
                JOIN UTILISATEUR u ON u.id = c.user_id
                WHERE c.user_id = ?
                """,
                (user_id,),
            ).fetchone()

    def email_exists(self, email: str) -> bool:
        with self._connect() as conn:
            ligne = conn.execute(
                "SELECT 1 FROM COMPTE WHERE lower(email) = lower(?)",
                (email.strip(),),
            ).fetchone()
        return ligne is not None

    def update_account_theme(self, user_id: int, theme: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE COMPTE SET theme = ? WHERE user_id = ?",
                (theme, user_id),
            )

    def update_last_login(self, user_id: int) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE COMPTE SET last_login = ? WHERE user_id = ?",
                (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), user_id),
            )

    def delete_account(self, user_id: int) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM EXERCICE_SEANCE WHERE id_seance IN (SELECT id FROM SEANCE WHERE id_utilisateur = ?)",
                (user_id,),
            )
            conn.execute("DELETE FROM SEANCE WHERE id_utilisateur = ?", (user_id,))
            conn.execute("DELETE FROM PROGRESSION_JOURNALIERE WHERE id_utilisateur = ?", (user_id,))
            conn.execute("DELETE FROM COMPTE WHERE user_id = ?", (user_id,))
            curseur = conn.execute("DELETE FROM UTILISATEUR WHERE id = ?", (user_id,))
            if curseur.rowcount == 0:
                raise ValueError("Compte introuvable.")

            dernier = conn.execute(
                "SELECT valeur FROM APP_STATE WHERE cle = 'last_user_id'"
            ).fetchone()
            if dernier and str(dernier["valeur"]) == str(user_id):
                suivant = conn.execute(
                    "SELECT id FROM UTILISATEUR ORDER BY id DESC LIMIT 1"
                ).fetchone()
                if suivant:
                    conn.execute(
                        "UPDATE APP_STATE SET valeur = ? WHERE cle = 'last_user_id'",
                        (str(suivant["id"]),),
                    )
                else:
                    conn.execute("DELETE FROM APP_STATE WHERE cle = 'last_user_id'")

    def set_last_user_id(self, user_id: int) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO APP_STATE (cle, valeur) VALUES ('last_user_id', ?)"
                " ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur",
                (str(user_id),),
            )

    def get_last_user_id(self) -> int | None:
        with self._connect() as conn:
            ligne = conn.execute("SELECT valeur FROM APP_STATE WHERE cle = 'last_user_id'").fetchone()
        if not ligne:
            return None
        try:
            return int(ligne["valeur"])
        except (TypeError, ValueError):
            return None

    def enregistrer_seance(self, user_id: int, resume: dict[str, object], exercices: list[dict[str, object]]) -> int:
        with self._connect() as conn:
            curseur = conn.execute(
                """
                INSERT INTO SEANCE (id_utilisateur, date, duree_totale_sec, calories_totales, score_global, note_qualite)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    str(resume.get("date")),
                    float(resume.get("duree_totale_sec", 0.0)),
                    float(resume.get("calories_totales", 0.0)),
                    float(resume.get("score_global", 0.0)),
                    str(resume.get("note_qualite", "-")),
                ),
            )
            id_seance = int(curseur.lastrowid)

            for exercice in exercices:
                conn.execute(
                    """
                    INSERT INTO EXERCICE_SEANCE (
                        id_seance, nom_exercice, reps_cibles, reps_realisees, reps_validees, duree_sec,
                        calories, score_qualite, angle_moyen, angle_min, angle_max, fatigue_detectee, rep_fatigue
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        id_seance,
                        str(exercice.get("nom_exercice", "-")),
                        int(exercice.get("reps_cibles", 0)),
                        int(exercice.get("reps_realisees", 0)),
                        int(exercice.get("reps_validees", 0)),
                        float(exercice.get("duree_sec", 0.0)),
                        float(exercice.get("calories", 0.0)),
                        float(exercice.get("score_qualite", 0.0)),
                        float(exercice.get("angle_moyen", 0.0)),
                        float(exercice.get("angle_min", 0.0)),
                        float(exercice.get("angle_max", 0.0)),
                        1 if exercice.get("fatigue_detectee") else 0,
                        exercice.get("rep_fatigue"),
                    ),
                )

            self._mettre_a_jour_progression(conn, user_id, resume)

        return id_seance

    def _mettre_a_jour_progression(self, conn: sqlite3.Connection, user_id: int, resume: dict[str, object]) -> None:
        date_str = str(resume.get("date", ""))
        if not date_str:
            date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        date_jour = date_str[:10]
        calories = float(resume.get("calories_totales", 0.0))
        nb_exercices = int(resume.get("nb_exercices", 0))
        score_global = float(resume.get("score_global", 0.0))
        duree = float(resume.get("duree_totale_sec", 0.0))

        existant = conn.execute(
            """
            SELECT calories_totales, nb_exercices, score_moyen, duree_totale, nb_seances
            FROM PROGRESSION_JOURNALIERE
            WHERE id_utilisateur = ? AND date = ?
            """,
            (user_id, date_jour),
        ).fetchone()

        if existant is None:
            conn.execute(
                """
                INSERT INTO PROGRESSION_JOURNALIERE (
                    id_utilisateur, date, calories_totales, nb_exercices, score_moyen, duree_totale, nb_seances
                )
                VALUES (?, ?, ?, ?, ?, ?, 1)
                """,
                (user_id, date_jour, calories, nb_exercices, score_global, duree),
            )
            return

        nb_seances = int(existant["nb_seances"]) + 1
        score_moyen = (
            (float(existant["score_moyen"]) * int(existant["nb_seances"])) + score_global
        ) / max(nb_seances, 1)
        conn.execute(
            """
            UPDATE PROGRESSION_JOURNALIERE
            SET calories_totales = ?,
                nb_exercices = ?,
                score_moyen = ?,
                duree_totale = ?,
                nb_seances = ?
            WHERE id_utilisateur = ? AND date = ?
            """,
            (
                float(existant["calories_totales"]) + calories,
                int(existant["nb_exercices"]) + nb_exercices,
                score_moyen,
                float(existant["duree_totale"]) + duree,
                nb_seances,
                user_id,
                date_jour,
            ),
        )

    def recuperer_progression(self, user_id: int, jours: int = 30) -> list[sqlite3.Row]:
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT * FROM PROGRESSION_JOURNALIERE
                WHERE id_utilisateur = ?
                  AND date(date) >= date('now', ?)
                ORDER BY date DESC
                """,
                (user_id, f"-{max(jours - 1, 0)} day"),
            ).fetchall()

    def count_sessions(self, user_id: int, jours: int | None = None) -> int:
        requete = "SELECT COUNT(*) as total FROM SEANCE WHERE id_utilisateur = ?"
        params: list[object] = [user_id]
        if jours is not None:
            requete += " AND date(date) >= date('now', ?)"
            params.append(f"-{max(jours - 1, 0)} day")
        with self._connect() as conn:
            ligne = conn.execute(requete, params).fetchone()
        return int(ligne["total"]) if ligne else 0

    def count_active_days(self, user_id: int, jours: int | None = None) -> int:
        requete = "SELECT COUNT(*) as total FROM PROGRESSION_JOURNALIERE WHERE id_utilisateur = ?"
        params: list[object] = [user_id]
        if jours is not None:
            requete += " AND date(date) >= date('now', ?)"
            params.append(f"-{max(jours - 1, 0)} day")
        with self._connect() as conn:
            ligne = conn.execute(requete, params).fetchone()
        return int(ligne["total"]) if ligne else 0

    def recuperer_repetitions_exercices(self, user_id: int, jours: int = 30) -> list[sqlite3.Row]:
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT e.nom_exercice, SUM(e.reps_validees) as reps
                FROM EXERCICE_SEANCE e
                JOIN SEANCE s ON s.id = e.id_seance
                WHERE s.id_utilisateur = ?
                  AND date(s.date) >= date('now', ?)
                GROUP BY e.nom_exercice
                ORDER BY reps DESC
                """,
                (user_id, f"-{jours} day"),
            ).fetchall()

    def recuperer_scores_seances(self, user_id: int, jours: int = 30) -> list[sqlite3.Row]:
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT date, score_global, calories_totales
                FROM SEANCE
                WHERE id_utilisateur = ?
                  AND date(date) >= date('now', ?)
                ORDER BY date ASC
                """,
                (user_id, f"-{jours} day"),
            ).fetchall()

    def recuperer_qualite_angles(self, user_id: int, jours: int = 30) -> list[sqlite3.Row]:
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT e.nom_exercice, AVG(e.score_qualite) as score_moyen
                FROM EXERCICE_SEANCE e
                JOIN SEANCE s ON s.id = e.id_seance
                WHERE s.id_utilisateur = ?
                  AND date(s.date) >= date('now', ?)
                GROUP BY e.nom_exercice
                ORDER BY score_moyen DESC
                """,
                (user_id, f"-{jours} day"),
            ).fetchall()

    def recuperer_seances_recentes(self, user_id: int, limite: int = 8) -> list[sqlite3.Row]:
        with self._connect() as conn:
            return conn.execute(
                """
                SELECT date, duree_totale_sec, calories_totales, score_global, note_qualite
                FROM SEANCE
                WHERE id_utilisateur = ?
                ORDER BY date DESC
                LIMIT ?
                """,
                (user_id, limite),
            ).fetchall()
