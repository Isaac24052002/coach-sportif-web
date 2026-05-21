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
    <div className="space-y-6 px-6 pb-6 pt-3 lg:px-10 lg:pb-10 lg:pt-5">
      {/* Hero */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div
            className="mb-4 inline-flex items-center rounded-full px-4 py-2"
            style={{ background: "rgba(255,255,255,0.88)", color: t.accentStrong, boxShadow: "0 12px 22px rgba(47, 84, 51, 0.08)", fontSize: 12, fontWeight: 700 }}
          >
            Coach KÙMÉ
          </div>
          <div style={{ fontSize: 12, color: t.textPrimary }}>{today}</div>
          <h1 style={{ fontFamily: "Sora", fontSize: "clamp(26px, 4.5vw, 36px)", fontWeight: 700, letterSpacing: -0.5, color: t.textPrimary }}>
            Bonjour {user?.prenom ?? "…"} 👋
          </h1>
          <p className="mt-2" style={{ fontSize: 15, maxWidth: 520, color: t.textPrimary }}>
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
                <div style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
                  {Math.round(latest.score)}<span style={{ color: t.textSoft, fontSize: 12 }}>/100</span>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted }}>
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
            <h3 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Ce que tu maîtrises</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {strengths.length > 0
              ? strengths.map((s) => <Pill key={s.exercise} tone="good">✓ {s.exercise} · {Math.round(s.score)}%</Pill>)
              : <span style={{ fontSize: 13, color: t.textMuted }}>Fais ta première séance pour voir tes points forts !</span>}
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Target size={18} color={t.secondary} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>À corriger</h3>
          </div>
          <div className="space-y-3">
            {improvements.length > 0
              ? improvements.map((imp) => (
                <div key={imp.exercise} className="rounded-xl border border-white/5 bg-white/3 p-3">
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>{imp.exercise}</span>
                    <span style={{ color: t.secondary, fontSize: 12, fontWeight: 600 }}>{Math.round(imp.score)}%</span>
                  </div>
                  <div className="mt-1" style={{ fontSize: 11, color: t.textMuted }}>{imp.tip}</div>
                </div>
              ))
              : <span style={{ fontSize: 13, color: t.textMuted }}>Aucun point à corriger pour l'instant.</span>}
          </div>
        </GlassCard>
      </div>

      {/* Blueprint */}
      {view?.home?.blueprint && view.home.blueprint.length > 0 && (
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Plan suggéré</h3>
            <GlowButton onClick={onLaunchLive} style={{ padding: "6px 14px", fontSize: 12 }}>
              <Play size={12} /> Démarrer
            </GlowButton>
          </div>
          <div className="flex flex-wrap gap-2">
            {view.home.blueprint.map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span style={{ color: t.accentStrong, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: t.textPrimary }}>{b.name}</span>
                <span style={{ fontSize: 11, color: t.textMuted }}>· {b.target_label}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Séances récentes */}
      {view?.insights?.recent_sessions && view.insights.recent_sessions.length > 0 && (
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Séances récentes</h3>
            <button onClick={onProgress} className="flex items-center gap-1" style={{ color: t.accentStrong, fontSize: 12 }}>
              Tout voir <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {view.insights.recent_sessions.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div style={{ fontSize: 11, width: 110, color: t.textMuted }}>
                  {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <QualityRing value={Math.round(s.score)} size={44} stroke={4} />
                <div className="ml-auto flex items-center gap-4" style={{ fontSize: 12, color: t.textMuted }}>
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
