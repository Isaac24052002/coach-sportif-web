import { motion } from "motion/react";
import { X, Download, RefreshCw } from "lucide-react";
import { GlassCard, GlowButton, QualityRing } from "../primitives";
import { FinishResponse } from "../../../api";

export function SummarySheet({ result, onClose }: { result: FinishResponse; onClose: () => void }) {
  const s = result.summary;
  const score = Math.round(s.score_global);
  const dureMin = Math.round(s.duree_totale_sec / 60);
  const cal = Math.round(s.calories_totales);
  const note = s.note_qualite;
  const noteColor = score >= 80 ? "#00D4AA" : score >= 60 ? "#FFD166" : "#FF6B4A";

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: "spring", damping: 24, stiffness: 280 }}>
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-white/50" style={{ fontSize: 11 }}>Résumé final</div>
              <h2 className="text-white" style={{ fontFamily: "Space Grotesk", fontSize: 24, fontWeight: 700 }}>Séance terminée 💪</h2>
            </div>
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white/60 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          {/* Score ring */}
          <div className="mb-8 flex items-center gap-6">
            <QualityRing value={score} size={120} label="Score" />
            <div>
              <div className="text-white/50" style={{ fontSize: 13 }}>Score global</div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 36, fontWeight: 700, color: noteColor }}>{note}</div>
              <div className="text-white/40" style={{ fontSize: 13 }}>{score} / 100 points</div>
              {s.objectif_pct > 0 && (
                <div className="mt-1 text-white/40" style={{ fontSize: 11 }}>
                  Objectif calorique : {s.objectif_pct.toFixed(1)}% du TDEE
                </div>
              )}
            </div>
          </div>

          {/* Métriques */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <MetricBox label="Durée" value={`${dureMin} min`} color="#FFD166" />
            <MetricBox label="Calories" value={`${cal} kcal`} color="#FF6B4A" />
            <MetricBox label="Exercices" value={String(result.exercises.length)} color="#00D4AA" />
          </div>

          {/* Détail exercices */}
          {result.exercises.length > 0 && (
            <div className="mb-6 space-y-2">
              <div className="text-white/50 mb-3" style={{ fontSize: 12 }}>Détail par exercice</div>
              {result.exercises.map((ex, i) => {
                const q = Math.round(ex.score_qualite);
                const color = q >= 80 ? "#00D4AA" : q >= 60 ? "#FFD166" : "#FF6B4A";
                return (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/3 px-4 py-3">
                    <QualityRing value={q} size={44} stroke={4} />
                    <div className="flex-1">
                      <div className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>{ex.nom_exercice}</div>
                      <div className="text-white/40" style={{ fontSize: 11 }}>
                        {ex.reps_validees} validées · {ex.reps_realisees - ex.reps_validees} invalides
                        {ex.fatigue_detectee && " · Fatigue détectée"}
                      </div>
                    </div>
                    <div style={{ color, fontFamily: "Space Grotesk", fontSize: 18, fontWeight: 700 }}>{q}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Avertissements */}
          {result.warnings.length > 0 && (
            <div className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/8 px-4 py-3">
              <div className="text-yellow-400 mb-2" style={{ fontSize: 12, fontWeight: 600 }}>Notes</div>
              {result.warnings.map((w, i) => <div key={i} className="text-white/60" style={{ fontSize: 12 }}>· {w}</div>)}
            </div>
          )}

          {/* Exports */}
          <div className="flex flex-wrap gap-3">
            <GlowButton onClick={onClose}><RefreshCw size={16} /> Nouvelle séance</GlowButton>
            {result.exports?.pdf && (
              <GlowButton variant="secondary" onClick={() => window.open(result.exports.pdf)}>
                <Download size={16} /> Rapport PDF
              </GlowButton>
            )}
            {result.exports?.csv && (
              <GlowButton variant="secondary" onClick={() => window.open(result.exports.csv)}>
                <Download size={16} /> Export CSV
              </GlowButton>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/3 p-4 text-center">
      <div className="text-white/50 mb-1" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ color, fontFamily: "Space Grotesk", fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
