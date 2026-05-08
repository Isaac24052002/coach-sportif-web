"""Generation du rapport PDF de seance."""

from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

from user_profile import UserProfile


def _note_qualite(score: float) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Tres bien"
    if score >= 55:
        return "Correct"
    return "A ameliorer"


def generer_rapport_pdf(
    chemin: Path,
    profil: UserProfile,
    resume: dict[str, object],
    exercices: list[dict[str, object]],
) -> Path:
    """Construit un rapport PDF conforme au cahier des charges."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", size=14)

    pdf.cell(0, 8, "Rapport de seance - Coach Fitness IA", ln=True)
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 6, f"Profil: {profil.prenom} | Age: {profil.age} | IMC: {profil.imc}", ln=True)
    pdf.cell(0, 6, f"Date: {resume.get('date', '-')}", ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "1. Resume de seance", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 6, f"Duree totale: {resume.get('duree_totale_sec', 0.0):.1f} sec", ln=True)
    pdf.cell(0, 6, f"Exercices realises: {resume.get('nb_exercices', 0)}", ln=True)
    pdf.cell(0, 6, f"Calories totales: {resume.get('calories_totales', 0.0):.1f} kcal", ln=True)
    pdf.cell(0, 6, f"TDEE estime: {resume.get('tdee', 0.0):.1f} kcal", ln=True)
    pdf.cell(0, 6, f"Objectif atteint: {resume.get('objectif_pct', 0.0):.1f}%", ln=True)
    pdf.cell(0, 6, f"Score global: {resume.get('score_global', 0.0):.1f} / 100", ln=True)
    pdf.cell(0, 6, f"Note qualite: {resume.get('note_qualite', '-')}", ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "2. Detail par exercice", ln=True)
    pdf.set_font("Helvetica", size=9)
    for exercice in exercices:
        pdf.cell(0, 6, f"- {exercice.get('nom_exercice', '-')}", ln=True)
        pdf.cell(
            0,
            5,
            f"  Reps ciblees: {exercice.get('reps_cibles', 0)} | Realisees: {exercice.get('reps_realisees', 0)}"
            f" | Validees: {exercice.get('reps_validees', 0)}",
            ln=True,
        )
        pdf.cell(
            0,
            5,
            f"  Score qualite: {exercice.get('score_qualite', 0.0):.1f}% | Angle moyen: {exercice.get('angle_moyen', 0.0):.1f}",
            ln=True,
        )
        statut = "Maitrise" if exercice.get("score_qualite", 0.0) >= 80 else "A ameliorer"
        pdf.cell(0, 5, f"  Statut: {statut}", ln=True)
    pdf.ln(2)

    points_forts = [ex for ex in exercices if float(ex.get("score_qualite", 0.0)) >= 80.0]
    axes = [ex for ex in exercices if float(ex.get("score_qualite", 0.0)) < 60.0]

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "3. Points forts", ln=True)
    pdf.set_font("Helvetica", size=10)
    if not points_forts:
        pdf.cell(0, 6, "Aucun exercice au-dessus de 80%.", ln=True)
    for exercice in points_forts:
        pdf.cell(0, 6, f"- {exercice.get('nom_exercice', '-')}", ln=True)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "4. Axes d'amelioration", ln=True)
    pdf.set_font("Helvetica", size=10)
    if not axes:
        pdf.cell(0, 6, "Aucun exercice sous 60%.", ln=True)
    for exercice in axes:
        pdf.cell(0, 6, f"- {exercice.get('nom_exercice', '-')}", ln=True)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "5. Recommandations", ln=True)
    pdf.set_font("Helvetica", size=10)
    if axes:
        for exercice in axes:
            pdf.multi_cell(0, 5, f"- Renforcer: {exercice.get('nom_exercice', '-')} (augmenter la precision)")
    else:
        pdf.cell(0, 6, "Poursuis ce rythme et augmente progressivement les repetitions.", ln=True)
    pdf.cell(0, 6, f"Conseil general: hydratation et recuperation.", ln=True)

    pdf.output(str(chemin))
    return chemin
