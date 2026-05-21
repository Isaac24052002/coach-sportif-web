import { useState } from "react";
import { GlassCard, GlowButton } from "../primitives";
import { Mic, ShieldAlert, Trash2, Zap, CheckCircle2, Palette } from "lucide-react";
import { useAuth } from "../../../AuthContext";
import { useTheme } from "../theme";

export function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const { user, view, bootData, deleteAccount } = useAuth();
  const { t } = useTheme();
  const accountEmail = view?.account?.email ?? "";
  const isLocalAccount = accountEmail.includes("@kume.local");
  const lastLogin = view?.account?.last_login ?? "";
  const lastSession = view?.insights?.recent_sessions?.[0]?.date ?? "";
  const formatDateTime = (value: string) => {
    if (!value) return "-";
    const safe = value.includes("T") ? value : value.replace(" ", "T");
    const dt = new Date(safe);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const lastLoginLabel = lastLogin ? formatDateTime(lastLogin) : "-";
  const lastSessionLabel = lastSession ? formatDateTime(lastSession) : "Aucune";
  const [voiceOn, setVoiceOn] = useState(true);
  const [focusOn, setFocusOn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteAccount();
      onLogout();
    } catch (e: any) {
      setDeleteError(e.message ?? "Suppression impossible pour le moment.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 px-6 pb-6 pt-3 lg:px-10 lg:pb-10 lg:pt-5">
      <div>
        <h1 style={{ fontFamily: "Sora", fontSize: "clamp(24px, 4.2vw, 32px)", fontWeight: 700, color: t.textPrimary }}>
          Paramètres
        </h1>
        <p style={{ fontSize: 14, color: t.textPrimary }}>
          Préférences, ambiance KÙMÉ et sécurité du compte
        </p>
      </div>

      <GlassCard className="overflow-hidden p-6" glow>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2" style={{ color: t.accentStrong, fontSize: 12, fontWeight: 700 }}>
              <Palette size={14} />
              Thème unifié
            </div>
            <h3 style={{ fontFamily: "Sora", fontSize: "clamp(18px, 3.4vw, 20px)", fontWeight: 700, color: t.textPrimary }}>
              Le système utilise désormais le style KÙMÉ
            </h3>
            <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 620, color: t.textMuted }}>
              Les trois anciens thèmes ont été retirés. Toute l'interface reprend maintenant une palette claire,
              verte et douce inspirée du visuel de référence.
            </p>
          </div>
          <div className="rounded-[28px] border px-4 py-4" style={{ borderColor: t.border, background: t.surfaceStrong, minWidth: 220 }}>
            <div className="mb-4 flex gap-2">
              {t.preview.map((color) => (
                <span key={color} className="h-8 w-8 rounded-full" style={{ background: color, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }} />
              ))}
            </div>
            <div style={{ color: t.textMuted, fontSize: 11 }}>Thème actif</div>
            <div style={{ color: t.textPrimary, fontSize: 18, fontWeight: 700, fontFamily: "Sora" }}>KÙMÉ</div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-6">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
            Préférences séance
          </h3>
          <div className="space-y-3">
            <ToggleRow
              icon={<Mic size={18} />}
              label="Feedback vocal"
              desc="KÙMÉ peut continuer à parler pendant la séance."
              on={voiceOn}
              onToggle={() => setVoiceOn((value) => !value)}
            />
            <ToggleRow
              icon={<Zap size={18} />}
              label="Mode focus"
              desc="Prépare une vue plus épurée pendant les sessions live."
              on={focusOn}
              onToggle={() => setFocusOn((value) => !value)}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
            Système
          </h3>
          <div className="space-y-3">
            <InfoRow label="Version" value={bootData?.version ?? "3.0.0"} />
            <InfoRow label="Mode" value={isLocalAccount ? "Local (appareil)" : "Compte"} />
            <InfoRow label="Dernière connexion" value={lastLoginLabel} />
            <InfoRow label="Dernière séance" value={lastSessionLabel} />
            <InfoRow label="Niveau" value={user?.niveau === "avance" || user?.niveau === "expert" ? "Expert" : user?.niveau === "intermediaire" ? "Intermédiaire" : "Débutant"} />
            <InfoRow label="Sessions totales" value={String(view?.insights?.totals?.sessions ?? 0)} />
            <InfoRow label="Jours actifs" value={String(view?.insights?.totals?.active_days_total ?? 0)} />
            <InfoRow label="Série actuelle" value={`${view?.insights?.totals?.current_streak ?? 0} jour(s)`} />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2" style={{ color: t.secondary, fontSize: 12, fontWeight: 700 }}>
              <ShieldAlert size={14} />
              Zone sensible
            </div>
            <h3 style={{ fontFamily: "Sora", fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
              Supprimer mon compte
            </h3>
            <p className="mt-2 max-w-xl" style={{ fontSize: 13, lineHeight: 1.5, color: t.textMuted }}>
              Cette action efface le profil, l'historique des séances et les statistiques associées.
            </p>
          </div>
          {!confirmDelete && (
            <GlowButton variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Supprimer mon compte
            </GlowButton>
          )}
        </div>

        {confirmDelete && (
          <div className="mt-5 rounded-3xl border border-red-500/20 bg-red-500/8 p-5">
            <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
              Es-tu sûr de vouloir supprimer ton compte ?
            </div>
            <div className="mt-2" style={{ fontSize: 13, color: t.textMuted }}>
              Choisis clairement entre <span style={{ color: t.textPrimary }}>oui</span> ou <span style={{ color: t.textPrimary }}>non</span>.
            </div>
            {deleteError && (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-400" style={{ fontSize: 13 }}>
                {deleteError}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <GlowButton variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
                <Trash2 size={16} /> {deleting ? "Suppression…" : "Oui, supprimer"}
              </GlowButton>
              <GlowButton
                variant="secondary"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteError("");
                }}
                disabled={deleting}
              >
                Non, garder mon compte
              </GlowButton>
            </div>
          </div>
        )}
      </GlassCard>

      <div
        className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3"
        style={{ borderColor: `${t.accent}44`, background: `${t.accent}14`, color: t.accentStrong, fontSize: 13 }}
      >
        <CheckCircle2 size={16} /> KÙMÉ est bien activé sur l'ensemble du site.
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  const { t } = useTheme();

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/3 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: on ? `${t.accent}22` : t.surfaceStrong,
            color: on ? t.accentStrong : t.textMuted,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>
            {desc}
          </div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className="relative h-7 w-12 rounded-full transition-all"
        style={{
          background: on ? `linear-gradient(90deg, ${t.accent}, ${t.accentStrong})` : t.surfaceStrong,
          boxShadow: on ? `0 10px 18px ${t.accent}55` : "none",
        }}
      >
        <div className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all" style={{ left: on ? "calc(100% - 26px)" : 2 }} />
      </button>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  const { t } = useTheme();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3">
      <span style={{ fontSize: 13, color: t.textMuted }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color ?? t.textPrimary, textAlign: "right" }}>{value}</span>
    </div>
  );
}
