import { GlassCard, GlowButton, MetricCard, Pill, QualityRing } from "../primitives";
import { Activity, Flame, Clock, Trophy, Play, BarChart3, Sparkles, ChevronRight, Target } from "lucide-react";
import { useAuth } from "../../../AuthContext";
import { useTheme } from "../theme";

export function HomeScreen({ onLaunchLive, onProgress }: { onLaunchLive: () => void; onProgress: () => void }) {
  const { user, view } = useAuth();
  const { t } = useTheme();
  const totals = view?.insights?.totals;
  const prog = view?.insights?.progression ?? [];
  const strengths = view?.home?.strengths ?? [];
  const improvements = view?.home?.improvements ?? [];
  const latest = view?.home?.latest_session ?? null;
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Données dérivées
  const sessions = totals?.sessions ?? 0;
  const calories14d = totals?.calories_14d ?? 0;
  const dureeMinutes = Math.round((totals?.duration_14d_sec ?? 0) / 60);
  const scoreMoyen = Math.round(totals?.avg_score ?? 0);

  // Tendances (7 derniers jours)
  const trendCal = prog.slice(-7).map(p => p.calories);
  const trendDur = prog.slice(-7).map(p => p.duration_sec / 60);
  const trendScore = prog.slice(-7).map(p => p.score);

  return (
    <div className="space-y-6 p-6 lg:p-10">
      {/* Hero */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div
            className="mb-4 inline-flex items-center rounded-full px-4 py-2"
            style={{ background: "rgba(255,255,255,0.88)", color: t.accentStrong, boxShadow: "0 12px 22px rgba(47, 84, 51, 0.08)", fontSize: 12, fontWeight: 700 }}
          >
            Coach KÙMÉ
          </div>
          <div className="text-white/50" style={{ fontSize: 12 }}>{today}</div>
          <h1 className="mt-1 text-white" style={{ fontFamily: "Sora", fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>
            Bonjour {user?.prenom ?? "…"} 👋
          </h1>
          <p className="mt-2 text-white/55" style={{ fontSize: 15, maxWidth: 520 }}>
            {sessions > 0
              ? <>{sessions} séance{sessions > 1 ? "s" : ""} au compteur. <span style={{ color: t.accentStrong }}>Continue sur ta lancée !</span></>
              : view?.home?.welcome?.next_action ?? "Ton espace KÙMÉ est prêt. Lance ta première séance."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <GlowButton onClick={onLaunchLive}><Play size={16} fill="#ffffff" /> Lancer une séance</GlowButton>
            <GlowButton variant="secondary" onClick={onProgress}><BarChart3 size={16} /> Ma progression</GlowButton>
          </div>
        </div>

        {latest && (
          <GlassCard className="hidden p-5 lg:block lg:w-80">
            <div className="flex items-center gap-2" style={{ color: t.accentStrong }}>
              <Sparkles size={16} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Dernière séance</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <QualityRing value={Math.round(latest.score)} size={64} stroke={5} />
              <div>
                <div className="text-white" style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 700 }}>
                  {Math.round(latest.score)}<span className="text-white/40 text-sm">/100</span>
                </div>
                <div className="text-white/50" style={{ fontSize: 11 }}>
                  {Math.round(latest.duration_sec / 60)} min · {Math.round(latest.calories)} kcal
                </div>
                <div className="mt-1" style={{ color: t.accentStrong, fontSize: 11, fontWeight: 600 }}>{latest.note}</div>
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={<Activity size={20} />} label="Sessions" value={sessions} trend={trendDur} />
        <MetricCard icon={<Flame size={20} />} label="Calories 14j" value={Math.round(calories14d).toLocaleString("fr")} unit="kcal" color={t.secondary} trend={trendCal} />
        <MetricCard icon={<Clock size={20} />} label="Temps 14j" value={`${Math.floor(dureeMinutes / 60)}h${String(dureeMinutes % 60).padStart(2, "0")}`} color={t.gold} trend={trendDur} />
        <MetricCard icon={<Trophy size={20} />} label="Score moyen" value={scoreMoyen} unit="/100" trend={trendScore} />
      </div>

      {/* Points forts + Améliorations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={18} color={t.accentStrong} />
            <h3 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Ce que tu maîtrises</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {strengths.length > 0
              ? strengths.map((s) => <Pill key={s.exercise} tone="good">✓ {s.exercise} · {Math.round(s.score)}%</Pill>)
              : <span className="text-white/40" style={{ fontSize: 13 }}>Fais ta première séance pour voir tes points forts !</span>}
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target size={18} color={t.secondary} />
            <h3 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>À corriger</h3>
          </div>
          <div className="space-y-3">
            {improvements.length > 0
              ? improvements.map((imp) => (
                <div key={imp.exercise} className="rounded-xl border border-white/5 bg-white/3 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white" style={{ fontSize: 13, fontWeight: 500 }}>{imp.exercise}</span>
                    <span style={{ color: t.secondary, fontSize: 12, fontWeight: 600 }}>{Math.round(imp.score)}%</span>
                  </div>
                  <div className="mt-1 text-white/50" style={{ fontSize: 11 }}>{imp.tip}</div>
                </div>
              ))
              : <span className="text-white/40" style={{ fontSize: 13 }}>Aucun point à corriger pour l'instant.</span>}
          </div>
        </GlassCard>
      </div>

      {/* Blueprint */}
      {view?.home?.blueprint && view.home.blueprint.length > 0 && (
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Plan suggéré</h3>
            <GlowButton onClick={onLaunchLive} style={{ padding: "6px 14px", fontSize: 12 }}>
              <Play size={12} /> Démarrer
            </GlowButton>
          </div>
          <div className="flex flex-wrap gap-2">
            {view.home.blueprint.map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span style={{ color: t.accentStrong, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                <span className="text-white" style={{ fontSize: 13 }}>{b.name}</span>
                <span className="text-white/40" style={{ fontSize: 11 }}>· {b.target_label}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Séances récentes */}
      {view?.insights?.recent_sessions && view.insights.recent_sessions.length > 0 && (
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Séances récentes</h3>
            <button onClick={onProgress} className="flex items-center gap-1" style={{ color: t.accentStrong, fontSize: 12 }}>
              Tout voir <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {view.insights.recent_sessions.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="text-white/50" style={{ fontSize: 11, width: 110 }}>
                  {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <QualityRing value={Math.round(s.score)} size={44} stroke={4} />
                <div className="ml-auto flex items-center gap-4 text-white/60" style={{ fontSize: 12 }}>
                  <span>{Math.round(s.duration_sec / 60)} min</span>
                  <span style={{ color: t.secondary }}>{Math.round(s.calories)} kcal</span>
                  <span style={{ color: s.score >= 80 ? t.accentStrong : s.score >= 60 ? t.gold : t.secondary }}>{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
