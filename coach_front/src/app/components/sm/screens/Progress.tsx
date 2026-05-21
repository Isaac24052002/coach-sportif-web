import { GlassCard, MetricCard, Pill, QualityRing } from "../primitives";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useAuth } from "../../../AuthContext";
import { useTheme } from "../theme";

const clampScore = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const formatShortDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const formatSessionDate = (value: string) =>
  new Date(value.replace(" ", "T")).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDuration = (seconds: number) => {
  const totalMin = Math.round(seconds / 60);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
};

export function ProgressScreen() {
  const { view } = useAuth();
  const { t } = useTheme();
  const totals = view?.insights?.totals;
  const prog = (view?.insights?.progression ?? []).map((item) => ({ ...item, score: clampScore(item.score) }));
  const quality = (view?.insights?.quality ?? []).map((item) => ({ ...item, score: clampScore(item.score) }));
  const recent = (view?.insights?.recent_sessions ?? []).map((item) => ({ ...item, score: clampScore(item.score) }));

  const sessionsTotal = totals?.sessions ?? 0;
  const sessions14d = totals?.sessions_14d ?? 0;
  const calories14d = Math.round(totals?.calories_14d ?? 0);
  const duration14d = totals?.duration_14d_sec ?? 0;
  const avgScore = Math.round(clampScore(totals?.avg_score ?? 0));
  const activeDays = totals?.active_days_14d ?? 0;
  const currentStreak = totals?.current_streak ?? 0;
  const bestScore = Math.round(clampScore(totals?.best_score_14d ?? 0));
  const consistency = clampScore(totals?.consistency_pct ?? 0);
  const todayCompleted = totals?.today_completed ?? false;

  const calData = prog.map((p) => p.calories);
  const maxCal = Math.max(...calData, 1);
  const trendCal = prog.slice(-7).map((p) => p.calories);
  const trendDur = prog.slice(-7).map((p) => p.duration_sec / 60);
  const trendScore = prog.slice(-7).map((p) => p.score);
  const sorted = [...quality].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter((item) => item.score >= 70).slice(0, 4);
  const weaknesses = [...quality].filter((item) => item.score < 70).sort((a, b) => a.score - b.score).slice(0, 4);

  return (
    <div className="space-y-6 px-6 pb-6 pt-3 lg:px-10 lg:pb-10 lg:pt-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 style={{ fontFamily: "Sora", fontSize: "clamp(24px, 4.2vw, 32px)", fontWeight: 700, color: t.textPrimary }}>
            Progression
          </h1>
          <p style={{ fontSize: 14, color: t.textPrimary }}>
            14 derniers jours, calculés jour par jour sans doubler une même date.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={todayCompleted ? "good" : "neutral"}>
            {todayCompleted ? "Aujourd'hui validé" : "Aujourd'hui pas encore lancé"}
          </Pill>
          <Pill tone="good">{activeDays}/14 jours actifs</Pill>
          <Pill tone={currentStreak >= 3 ? "good" : "warn"}>{currentStreak} jour(s) d'affilée</Pill>
        </div>
      </div>

      <GlassCard className="overflow-hidden p-6">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center gap-2" style={{ color: t.accentStrong, fontSize: 12, fontWeight: 700 }}>
              <TrendingUp size={14} />
              Lecture rapide
            </div>
            <h3 className="mt-2" style={{ fontSize: "clamp(18px, 3.4vw, 22px)", fontWeight: 700, color: t.textPrimary }}>
              Régularité en hausse
            </h3>
            <p className="mt-2 max-w-xl" style={{ fontSize: 13, lineHeight: 1.5, color: t.textMuted }}>
              Tu as enregistré {sessions14d} séance(s) sur les 14 derniers jours, avec un meilleur score de {bestScore}/100
              et une constance estimée à {Math.round(consistency)}%.
            </p>
            <div className="mt-5 h-3 rounded-full bg-white/6">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${consistency}%`,
                  background: `linear-gradient(90deg, ${t.accent}, ${t.gold})`,
                  boxShadow: `0 0 20px ${t.accent}40`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between" style={{ fontSize: 11, color: t.textSoft }}>
              <span>0%</span>
              <span>Couverture des 14 jours</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon={<CalendarDays size={15} />} label="Jours actifs" value={`${activeDays}/14`} tone={t.accentStrong} />
            <MiniStat icon={<Trophy size={15} />} label="Meilleur score" value={`${bestScore}/100`} tone={t.gold} />
            <MiniStat icon={<Target size={15} />} label="Série actuelle" value={`${currentStreak} j`} tone={t.secondary} />
            <MiniStat icon={<CheckCircle2 size={15} />} label="Aujourd'hui" value={todayCompleted ? "Fait" : "À lancer"} tone={todayCompleted ? t.accentStrong : t.gold} />
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={<Activity size={20} />} label="Sessions totales" value={sessionsTotal} trend={trendDur} />
        <MetricCard icon={<Flame size={20} />} label="Calories 14j" value={calories14d.toLocaleString("fr")} unit="kcal" color={t.secondary} trend={trendCal} />
        <MetricCard icon={<Clock size={20} />} label="Temps 14j" value={formatDuration(duration14d)} color={t.gold} trend={trendDur} />
        <MetricCard icon={<Trophy size={20} />} label="Score moyen" value={avgScore} unit="/100" trend={trendScore} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>
                Charge quotidienne
              </h3>
              <div style={{ fontSize: 11, color: t.textMuted }}>
                Historique jour par jour sur 14 jours
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: 11, color: t.textMuted }}>
                Cumul 14 jours
              </div>
              <div style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
                {calories14d} kcal
              </div>
            </div>
          </div>

          <div className="flex h-52 items-end gap-2">
            {prog.map((item) => {
              const barHeight = Math.max((item.calories / maxCal) * 100, item.calories > 0 ? 8 : 4);
              const isActive = item.calories > 0;
              return (
                <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div
                      className="w-full rounded-t-2xl transition-all"
                      style={{
                        height: `${barHeight}%`,
                        background: isActive
                          ? `linear-gradient(180deg, ${t.accent}, rgba(79,214,108,0.14))`
                          : "rgba(255,255,255,0.08)",
                        boxShadow: isActive ? `0 0 14px ${t.accent}33` : "none",
                      }}
                    />
                    <div
                      className="absolute -top-12 left-1/2 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 px-2 py-1 text-center text-white group-hover:block"
                      style={{ fontSize: 10, whiteSpace: "nowrap" }}
                    >
                      {Math.round(item.calories)} kcal
                      <br />
                      {Math.round(item.score)}/100
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: t.textSoft }}>
                    {formatShortDate(item.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>
                Qualité par exercice
              </h3>
              <div style={{ fontSize: 11, color: t.textMuted }}>
                Scores bornés et recalculés sur 100
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {quality.length > 0 ? (
              quality.map((item) => {
                const score = Math.round(clampScore(item.score));
                const color = score >= 75 ? t.accentStrong : score >= 50 ? t.gold : t.secondary;
                return (
                  <div key={item.exercise}>
                    <div className="mb-1.5 flex items-center justify-between gap-3" style={{ fontSize: 12, color: t.textMuted }}>
                      <span className="truncate">{item.exercise}</span>
                      <span style={{ color, fontWeight: 700 }}>{score}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, background: color, boxShadow: `0 0 12px ${color}88` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/6 bg-white/3 px-4 py-5" style={{ fontSize: 13, color: t.textMuted }}>
                Fais des séances pour voir ta qualité par exercice.
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h3 className="mb-4" style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>
            Ce que tu maîtrises
          </h3>
          <div className="flex flex-wrap gap-2">
            {strengths.length > 0 ? (
              strengths.map((item) => (
                <Pill key={item.exercise} tone="good">
                  {item.exercise} · {Math.round(item.score)}%
                </Pill>
              ))
            ) : (
              <span style={{ fontSize: 13, color: t.textMuted }}>
                Aucun point fort lisible pour l'instant.
              </span>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-4" style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>
            Points à renforcer
          </h3>
          <div className="flex flex-wrap gap-2">
            {weaknesses.length > 0 ? (
              weaknesses.map((item) => (
                <Pill key={item.exercise} tone="warn">
                  {item.exercise} · {Math.round(item.score)}%
                </Pill>
              ))
            ) : (
              <span style={{ fontSize: 13, color: t.textMuted }}>
                Pas assez de données pour établir des axes d'amélioration.
              </span>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>
              Séances récentes
            </h3>
            <div style={{ fontSize: 11, color: t.textMuted }}>
              Les dernières séances enregistrées
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {recent.length > 0 ? (
            recent.map((item, index) => (
              <div
                key={`${item.date}-${index}`}
                className="flex flex-col gap-4 rounded-3xl border border-white/6 bg-white/3 px-4 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>
                    {formatSessionDate(item.date)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3" style={{ fontSize: 11, color: t.textMuted }}>
                    <span>{formatDuration(item.duration_sec)}</span>
                    <span>{Math.round(item.calories)} kcal</span>
                    <span style={{ color: item.score >= 80 ? t.accentStrong : item.score >= 60 ? t.gold : t.secondary }}>{item.note}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-start sm:self-center">
                  <QualityRing value={Math.round(item.score)} size={48} stroke={4} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/6 bg-white/3 px-4 py-5" style={{ fontSize: 13, color: t.textMuted }}>
              Aucune séance enregistrée.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  const { t } = useTheme();
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <div className="flex items-center gap-2" style={{ color: tone, fontSize: 12, fontWeight: 600 }}>
        {icon}
        {label}
      </div>
      <div className="mt-3" style={{ fontFamily: "Sora", fontSize: 24, fontWeight: 700, color: t.textPrimary }}>
        {value}
      </div>
    </div>
  );
}
