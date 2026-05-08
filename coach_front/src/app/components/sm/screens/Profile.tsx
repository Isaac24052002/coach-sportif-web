import { useEffect, useState } from "react";
import { GlassCard, GlowButton, Pill } from "../primitives";
import {
  Activity,
  Award,
  CalendarDays,
  CheckCircle2,
  Crown,
  Flame,
  Heart,
  Lock,
  Rocket,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useAuth } from "../../../AuthContext";
import { updateProfile } from "../../../api";

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const bmiDetails = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return { label: "À calculer", color: "#FFD166" };
  if (value < 18.5) return { label: "Insuffisant", color: "#FFD166" };
  if (value < 25) return { label: "Normal", color: "#00D4AA" };
  if (value < 30) return { label: "Surpoids", color: "#FFD166" };
  return { label: "Obésité", color: "#FF6B4A" };
};

export function ProfileScreen() {
  const { user, view, refreshOverview } = useAuth();
  const profile = view?.profile;
  const totals = view?.insights?.totals;
  const badgeMonths = view?.insights?.monthly_badges ?? [];
  const currentBadgeMonth = badgeMonths[0];
  const archivedBadgeMonths = badgeMonths.slice(1);
  const currentUnlockedBadges = currentBadgeMonth?.badges.filter((badge) => badge.unlocked) ?? [];
  const currentLockedBadges = currentBadgeMonth?.badges.filter((badge) => !badge.unlocked) ?? [];

  const [sex, setSex] = useState<"M" | "F">("M");
  const [level, setLevel] = useState<"debutant" | "intermediaire" | "avance">("debutant");
  const [form, setForm] = useState({ prenom: "", age: "", taille_cm: "", poids_kg: "" });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setForm({
      prenom: profile.prenom,
      age: String(profile.age),
      taille_cm: String(profile.taille_cm),
      poids_kg: String(profile.poids_kg),
    });
    setSex(profile.sexe as "M" | "F");
    setLevel(profile.niveau as "debutant" | "intermediaire" | "avance");
  }, [profile]);

  const age = Number(form.age);
  const taille = Number(form.taille_cm);
  const poids = Number(form.poids_kg);
  const bmi = poids > 0 && taille > 0 ? poids / Math.pow(taille / 100, 2) : 0;
  const bmiInfo = bmiDetails(Number(bmi.toFixed(1)));
  const tdee =
    poids > 0 && taille > 0 && age > 0
      ? Math.round((10 * poids + 6.25 * taille - 5 * age + (sex === "M" ? 5 : -161)) * (level === "avance" ? 1.55 : level === "intermediaire" ? 1.4 : 1.25))
      : 0;
  const hrMax = age > 0 ? 220 - age : 0;
  const proteinTarget = poids > 0 ? Math.round(poids * 1.6) : 0;
  const consistency = clampPercent(totals?.consistency_pct ?? 0);

  const handleSave = async () => {
    if (!user) return;
    const prenom = form.prenom.trim();
    if (prenom.length < 2) {
      setError("Entre un prénom valide.");
      return;
    }
    if (age < 10 || taille < 120 || poids < 35) {
      setError("Vérifie les valeurs saisies avant de sauvegarder.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await updateProfile(user.id, {
        id: user.id,
        prenom,
        age,
        taille_cm: taille,
        poids_kg: poids,
        sexe: sex,
        niveau: level,
      });
      await refreshOverview();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-white" style={{ fontFamily: "Space Grotesk", fontSize: 32, fontWeight: 700 }}>
          Profil
        </h1>
        <p className="text-white/50" style={{ fontSize: 14 }}>
          Informations personnelles, repères corporels et rythme d'entraînement
        </p>
      </div>

      <GlassCard className="overflow-hidden p-6">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-[28px] text-black"
              style={{ background: "linear-gradient(135deg,#00D4AA,#06b89a)", fontSize: 30, fontWeight: 700, fontFamily: "Space Grotesk" }}
            >
              {(form.prenom || "?")
                .split(" ")
                .map((word) => word[0]?.toUpperCase())
                .join("")
                .slice(0, 2) || "??"}
            </div>
            <div className="min-w-0">
              <div className="text-white" style={{ fontSize: 24, fontWeight: 700 }}>
                {form.prenom || "Utilisateur"}
              </div>
              <div className="mt-1 text-white/50" style={{ fontSize: 13 }}>
                {view?.account?.email ?? "-"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="good">{level === "debutant" ? "Débutant" : level === "intermediaire" ? "Intermédiaire" : "Avancé"}</Pill>
                <Pill tone="neutral">{sex === "M" ? "Homme" : "Femme"}</Pill>
                <Pill tone={bmiInfo.color === "#00D4AA" ? "good" : "warn"}>IMC {bmi > 0 ? bmi.toFixed(1) : "-"}</Pill>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroStat icon={<CalendarDays size={16} />} label="Jours actifs" value={String(totals?.active_days_total ?? 0)} tone="#00D4AA" />
            <HeroStat icon={<Activity size={16} />} label="Série" value={`${totals?.current_streak ?? 0} j`} tone="#FFD166" />
            <HeroStat icon={<Trophy size={16} />} label="Sessions" value={String(totals?.sessions ?? 0)} tone="#FF6B4A" />
            <HeroStat icon={<CheckCircle2 size={16} />} label="Régularité" value={`${Math.round(consistency)}%`} tone="#00D4AA" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[#FFD166]" style={{ fontSize: 12, fontWeight: 600 }}>
              <Sparkles size={14} />
              Espace badges
            </div>
            <h3 className="mt-2 text-white" style={{ fontFamily: "Space Grotesk", fontSize: 24, fontWeight: 700 }}>
              Badges mensuels à débloquer
            </h3>
            <p className="mt-2 text-white/50" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Chaque mois repart à zéro: tu débloques des badges selon ton rythme, tes jours actifs, ton énergie et ton
              meilleur score. Une façon simple de garder la motivation sans toucher au système principal.
            </p>
          </div>

          {currentBadgeMonth && (
            <div className="grid w-full gap-3 sm:grid-cols-3 xl:max-w-xl">
              <CompactCard label="Mois suivi" value={currentBadgeMonth.month_label} />
              <CompactCard label="Badges gagnés" value={`${currentBadgeMonth.earned_count}/${currentBadgeMonth.badges.length}`} />
              <CompactCard label="Meilleur score" value={`${Math.round(currentBadgeMonth.summary.best_score)}/100`} />
            </div>
          )}
        </div>

        {currentBadgeMonth ? (
          <>
            <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center gap-2 text-[#FF6B4A]" style={{ fontSize: 12, fontWeight: 600 }}>
                  <Lock size={14} />
                  À débloquer ce mois
                </div>
                <div className="space-y-3">
                  {currentLockedBadges.length > 0 ? (
                    currentLockedBadges.map((badge) => (
                      <UnlockRow key={`unlock-${badge.id}`} badge={badge} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-[#00D4AA]/20 bg-[#00D4AA]/8 px-4 py-4 text-white/70" style={{ fontSize: 13 }}>
                      Tous les badges du mois sont déjà débloqués. Continue pour garder le rythme premium.
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4 flex items-center gap-2 text-[#00D4AA]" style={{ fontSize: 12, fontWeight: 600 }}>
                  <Award size={14} />
                  Déjà gagnés ce mois
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentUnlockedBadges.length > 0 ? (
                    currentUnlockedBadges.map((badge) => (
                      <Pill key={`earned-${badge.id}`} tone="good">
                        {badge.title}
                      </Pill>
                    ))
                  ) : (
                    <span className="text-white/45" style={{ fontSize: 13 }}>
                      Aucun badge débloqué pour le moment.
                    </span>
                  )}
                </div>
              </GlassCard>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {currentBadgeMonth.badges.map((badge) => (
                <MonthBadgeCard key={`${currentBadgeMonth.month_key}-${badge.id}`} badge={badge} monthLabel={currentBadgeMonth.month_label} />
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ArchiveStat label="Sessions du mois" value={String(currentBadgeMonth.summary.sessions)} />
              <ArchiveStat label="Jours actifs" value={String(currentBadgeMonth.summary.active_days)} />
              <ArchiveStat label="Calories" value={`${Math.round(currentBadgeMonth.summary.calories)} kcal`} />
              <ArchiveStat label="Temps cumulé" value={`${Math.round(currentBadgeMonth.summary.duration_sec / 60)} min`} />
            </div>

            {archivedBadgeMonths.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 text-white/45" style={{ fontSize: 11, letterSpacing: 0.7 }}>
                  ARCHIVES RÉCENTES
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {archivedBadgeMonths.map((month) => (
                    <ArchiveMonthCard key={month.month_key} month={month} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-6 rounded-3xl border border-white/6 bg-white/3 px-5 py-6 text-white/45" style={{ fontSize: 13 }}>
            Lance quelques séances pour voir tes premiers badges mensuels apparaître ici.
          </div>
        )}
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard className="p-6">
          <h3 className="mb-5 text-white" style={{ fontSize: 16, fontWeight: 600 }}>
            Informations personnelles
          </h3>
          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400" style={{ fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Field label="Prénom" value={form.prenom} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Âge" type="number" value={form.age} onChange={(v) => setForm((f) => ({ ...f, age: v }))} />
              <Field label="Taille (cm)" type="number" value={form.taille_cm} onChange={(v) => setForm((f) => ({ ...f, taille_cm: v }))} />
            </div>
            <Field label="Poids (kg)" type="number" value={form.poids_kg} onChange={(v) => setForm((f) => ({ ...f, poids_kg: v }))} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Selector
                title="Sexe"
                value={sex}
                options={[
                  { key: "M", label: "Homme" },
                  { key: "F", label: "Femme" },
                ]}
                onChange={(value) => setSex(value as "M" | "F")}
              />
              <Selector
                title="Niveau"
                value={level}
                options={[
                  { key: "debutant", label: "Débutant" },
                  { key: "intermediaire", label: "Intermédiaire" },
                  { key: "avance", label: "Avancé" },
                ]}
                onChange={(value) => setLevel(value as "debutant" | "intermediaire" | "avance")}
              />
            </div>

            <GlowButton className="w-full" onClick={handleSave} disabled={loading}>
              {saved ? (
                <>
                  <CheckCircle2 size={16} /> Sauvegardé !
                </>
              ) : loading ? (
                "Sauvegarde…"
              ) : (
                "Sauvegarder le profil"
              )}
            </GlowButton>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>
                  Repères personnels
                </h3>
                <div className="text-white/45" style={{ fontSize: 11 }}>
                  Valeurs recalculées depuis ton profil actuel
                </div>
              </div>
              <Pill tone={bmiInfo.color === "#00D4AA" ? "good" : "warn"}>{bmiInfo.label}</Pill>
            </div>

            <div className="space-y-4">
              <MetricRow icon={<Activity size={18} />} label="IMC" value={bmi > 0 ? bmi.toFixed(1) : "-"} sub="Indice corporel estimé" color={bmiInfo.color} />
              <MetricRow icon={<Flame size={18} />} label="TDEE" value={tdee > 0 ? `${tdee} kcal` : "-"} sub="Dépense quotidienne estimée" color="#FF6B4A" />
              <MetricRow icon={<Heart size={18} />} label="FC max" value={hrMax > 0 ? `${hrMax} bpm` : "-"} sub="Fréquence cardiaque max théorique" color="#FFD166" />
              <MetricRow icon={<CheckCircle2 size={18} />} label="Protéines" value={proteinTarget > 0 ? `${proteinTarget} g` : "-"} sub="Repère journalier simple" color="#00D4AA" />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>
              Rythme d'entraînement
            </h3>
            <div className="mt-4 h-3 rounded-full bg-white/6">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${consistency}%`,
                  background: "linear-gradient(90deg,#00D4AA,#FFD166)",
                  boxShadow: "0 0 16px rgba(0,212,170,0.22)",
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-white/35" style={{ fontSize: 11 }}>
              <span>0%</span>
              <span>Présence sur les 14 derniers jours</span>
              <span>100%</span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CompactCard label="Sessions 14j" value={String(totals?.sessions_14d ?? 0)} />
              <CompactCard label="Meilleur score" value={`${Math.round(clampPercent(totals?.best_score_14d ?? 0))}/100`} />
              <CompactCard label="Aujourd'hui" value={totals?.today_completed ? "Fait" : "Repos"} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-white/50" style={{ fontSize: 11 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-all focus:border-[#00D4AA]/60 focus:shadow-[0_0_16px_rgba(0,212,170,0.15)]"
        style={{ fontSize: 14 }}
      />
    </div>
  );
}

function Selector({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-white/50" style={{ fontSize: 11 }}>
        {title}
      </div>
      <div className="flex gap-2">
        {options.map((option) => {
          const active = option.key === value;
          return (
            <button
              key={option.key}
              onClick={() => onChange(option.key)}
              className={`flex-1 rounded-xl border px-3 py-2.5 transition-all ${
                active ? "border-[#00D4AA] bg-[#00D4AA]/10 text-[#00D4AA]" : "border-white/10 text-white/50"
              }`}
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-white/50" style={{ fontSize: 11 }}>
          {label}
        </div>
        <div className="text-white" style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>
          {value}
        </div>
      </div>
      <div className="max-w-[120px] text-right text-white/40" style={{ fontSize: 11 }}>
        {sub}
      </div>
    </div>
  );
}

function HeroStat({
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
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <div className="flex items-center gap-2" style={{ color: tone, fontSize: 12, fontWeight: 600 }}>
        {icon}
        {label}
      </div>
      <div className="mt-3 text-white" style={{ fontFamily: "Space Grotesk", fontSize: 24, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function CompactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
      <div className="text-white/45" style={{ fontSize: 11 }}>
        {label}
      </div>
      <div className="mt-2 text-white" style={{ fontFamily: "Space Grotesk", fontSize: 22, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function MonthBadgeCard({
  badge,
  monthLabel,
}: {
  monthLabel: string;
  badge: {
    id: string;
    title: string;
    description: string;
    icon: string;
    tone: string;
    target: number;
    current: number;
    unit: string;
    unlocked: boolean;
    progress_pct: number;
  };
}) {
  const tone = badge.tone === "secondary" ? "#FF6B4A" : badge.tone === "gold" ? "#FFD166" : "#00D4AA";
  const icon = badge.icon === "rocket"
    ? <Rocket size={18} />
    : badge.icon === "zap"
    ? <Zap size={18} />
    : badge.icon === "calendar"
    ? <CalendarDays size={18} />
    : badge.icon === "flame"
    ? <Flame size={18} />
    : badge.icon === "crown"
    ? <Crown size={18} />
    : <Award size={18} />;

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border p-5"
      style={{
        borderColor: badge.unlocked ? `${tone}55` : "rgba(255,255,255,0.08)",
        background: badge.unlocked
          ? `linear-gradient(180deg, ${tone}18, rgba(255,255,255,0.03))`
          : "rgba(255,255,255,0.03)",
        boxShadow: badge.unlocked ? `0 0 24px ${tone}24` : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ background: badge.unlocked ? `${tone}20` : "rgba(255,255,255,0.05)", color: badge.unlocked ? tone : "rgba(255,255,255,0.45)" }}
        >
          {icon}
        </div>
        <Pill tone={badge.unlocked ? "good" : "neutral"}>{badge.unlocked ? "Débloqué" : "À gagner"}</Pill>
      </div>

      <div className="mt-5">
        <div className="text-white" style={{ fontSize: 18, fontWeight: 700 }}>
          {badge.title}
        </div>
        <div className="mt-1 text-white/45" style={{ fontSize: 11 }}>
          {monthLabel}
        </div>
        <div className="mt-3 text-white/55" style={{ fontSize: 13, lineHeight: 1.5 }}>
          {badge.description}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-white/65" style={{ fontSize: 12 }}>
          <span>{badge.current} {badge.unit}</span>
          <span>Cible {badge.target} {badge.unit}</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/6">
          <div
            className="h-full rounded-full"
            style={{
              width: `${badge.progress_pct}%`,
              background: badge.unlocked ? `linear-gradient(90deg, ${tone}, #ffffff55)` : tone,
              boxShadow: `0 0 12px ${tone}44`,
            }}
          />
        </div>
      </div>

      {!badge.unlocked && (
        <div className="mt-4 flex items-center gap-2 text-white/40" style={{ fontSize: 11 }}>
          <Lock size={12} />
          Continue ce mois-ci pour le débloquer.
        </div>
      )}
    </div>
  );
}

function UnlockRow({
  badge,
}: {
  badge: {
    id: string;
    title: string;
    description: string;
    current: number;
    target: number;
    unit: string;
    progress_pct: number;
  };
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>
            {badge.title}
          </div>
          <div className="mt-1 text-white/45" style={{ fontSize: 11, lineHeight: 1.5 }}>
            {badge.description}
          </div>
        </div>
        <div className="text-right">
          <div className="text-white" style={{ fontFamily: "Space Grotesk", fontSize: 18, fontWeight: 700 }}>
            {Math.round(badge.progress_pct)}%
          </div>
          <div className="text-white/40" style={{ fontSize: 10 }}>
            {badge.current} / {badge.target} {badge.unit}
          </div>
        </div>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-white/6">
        <div
          className="h-full rounded-full"
          style={{
            width: `${badge.progress_pct}%`,
            background: "linear-gradient(90deg,#FF6B4A,#FFD166)",
            boxShadow: "0 0 12px rgba(255,107,74,0.24)",
          }}
        />
      </div>
    </div>
  );
}

function ArchiveMonthCard({
  month,
}: {
  month: {
    month_key: string;
    month_label: string;
    earned_count: number;
    summary: { sessions: number; active_days: number; best_score: number };
    badges: { id: string; unlocked: boolean }[];
  };
}) {
  return (
    <div className="rounded-3xl border border-white/6 bg-white/3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-white" style={{ fontSize: 15, fontWeight: 700 }}>
            {month.month_label}
          </div>
          <div className="text-white/45" style={{ fontSize: 11 }}>
            {month.summary.sessions} séance(s) · {month.summary.active_days} jours actifs
          </div>
        </div>
        <Pill tone={month.earned_count >= Math.ceil(month.badges.length / 2) ? "good" : "warn"}>
          {month.earned_count}/{month.badges.length}
        </Pill>
      </div>
      <div className="mt-4 flex items-center justify-between text-white/50" style={{ fontSize: 12 }}>
        <span>Meilleur score</span>
        <span className="text-white" style={{ fontWeight: 600 }}>{Math.round(month.summary.best_score)}/100</span>
      </div>
    </div>
  );
}

function ArchiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
      <div className="text-white/45" style={{ fontSize: 11 }}>
        {label}
      </div>
      <div className="mt-2 text-white" style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}
