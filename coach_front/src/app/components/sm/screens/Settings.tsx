import { useEffect, useState } from "react";
import { GlassCard, GlowButton } from "../primitives";
import { CheckCircle2, Mic, ShieldAlert, Trash2, Wifi, Zap } from "lucide-react";
import { useAuth } from "../../../AuthContext";
import { updateTheme } from "../../../api";
import { useTheme } from "../theme";

const THEMES = [
  { key: "ember", label: "Ember", desc: "Studio chaud et nerveux", colors: ["#180A06", "#FF8A5C", "#FFD166"] },
  { key: "ocean", label: "Ocean", desc: "Teal net et immersif", colors: ["#060E0F", "#00D4AA", "#5FA8D3"] },
  { key: "dawn", label: "Dawn", desc: "Lueur sportive dorée", colors: ["#0E0A06", "#FFD166", "#FF6B4A"] },
] as const;

export function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const { user, view, bootData, deleteAccount, refreshOverview } = useAuth();
  const { setId } = useTheme();
  const [voiceOn, setVoiceOn] = useState(true);
  const [focusOn, setFocusOn] = useState(false);
  const [theme, setTheme] = useState(user?.theme ?? "ember");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setTheme(user?.theme ?? "ember");
  }, [user?.theme]);

  const handleThemeChange = async (nextTheme: string) => {
    setTheme(nextTheme);
    if (nextTheme === "ember" || nextTheme === "ocean" || nextTheme === "dawn") {
      setId(nextTheme);
    }
    if (!user) return;
    try {
      await updateTheme(user.id, nextTheme);
      await refreshOverview();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch {
      setTheme(user.theme);
      if (user.theme === "ember" || user.theme === "ocean" || user.theme === "dawn") {
        setId(user.theme);
      }
    }
  };

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
    <div className="space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-white" style={{ fontFamily: "Space Grotesk", fontSize: 32, fontWeight: 700 }}>
          Paramètres
        </h1>
        <p className="text-white/50" style={{ fontSize: 14 }}>
          Préférences, rendu visuel et sécurité du compte
        </p>
      </div>

      <GlassCard className="overflow-hidden p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#FFD166]" style={{ fontSize: 12, fontWeight: 600 }}>
              <Zap size={14} />
              Personnalisation rapide
            </div>
            <h3 className="mt-2 text-white" style={{ fontSize: 20, fontWeight: 700 }}>
              Choisis l'ambiance qui te suit partout
            </h3>
            <p className="mt-2 max-w-xl text-white/50" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Le thème appliqué ici est repris sur le tableau de bord, les statistiques et les vues de séance.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
            <div className="text-white/45" style={{ fontSize: 11 }}>
              Thème actif
            </div>
            <div className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>
              {THEMES.find((item) => item.key === theme)?.label ?? "Ember"}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((item) => {
            const active = theme === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleThemeChange(item.key)}
                className="group relative overflow-hidden rounded-3xl border p-4 text-left transition-all"
                style={{
                  borderColor: active ? "#00D4AA" : "rgba(255,255,255,0.08)",
                  background: active ? "rgba(0,212,170,0.07)" : "rgba(255,255,255,0.03)",
                  boxShadow: active ? "0 0 28px rgba(0,212,170,0.18)" : "none",
                }}
              >
                <div className="mb-4 flex gap-1.5">
                  {item.colors.map((c) => (
                    <div key={c} className="h-6 w-6 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <div className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>
                  {item.label}
                </div>
                <div className="text-white/50" style={{ fontSize: 11 }}>
                  {item.desc}
                </div>
                {active && (
                  <div className="absolute right-3 top-3 text-[#00D4AA]">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-6">
          <h3 className="mb-5 text-white" style={{ fontSize: 16, fontWeight: 600 }}>
            Préférences séance
          </h3>
          <div className="space-y-3">
            <ToggleRow
              icon={<Mic size={18} />}
              label="Feedback vocal"
              desc="Le coach peut continuer à parler pendant la séance."
              on={voiceOn}
              onToggle={() => setVoiceOn((v) => !v)}
            />
            <ToggleRow
              icon={<Zap size={18} />}
              label="Mode focus"
              desc="Prépare une vue plus épurée pendant les sessions live."
              on={focusOn}
              onToggle={() => setFocusOn((v) => !v)}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-5 text-white" style={{ fontSize: 16, fontWeight: 600 }}>
            Système
          </h3>
          <div className="space-y-3">
            <InfoRow label="Version API" value={bootData?.version ?? "3.0.0"} />
            <InfoRow
              label="WebSocket"
              value={
                <span className="flex items-center gap-1">
                  <Wifi size={12} /> Opérationnel
                </span>
              }
              color="#00D4AA"
            />
            <InfoRow label="Utilisateur ID" value={user ? `#${user.id}` : "-"} />
            <InfoRow label="Niveau" value={user?.niveau === "avance" ? "Avancé" : user?.niveau === "intermediaire" ? "Intermédiaire" : "Débutant"} />
            <InfoRow label="Sessions totales" value={String(view?.insights?.totals?.sessions ?? 0)} />
            <InfoRow label="Jours actifs" value={String(view?.insights?.totals?.active_days_total ?? 0)} />
            <InfoRow label="Série actuelle" value={`${view?.insights?.totals?.current_streak ?? 0} jour(s)`} />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#FF6B4A]" style={{ fontSize: 12, fontWeight: 600 }}>
              <ShieldAlert size={14} />
              Zone sensible
            </div>
            <h3 className="mt-2 text-white" style={{ fontSize: 18, fontWeight: 700 }}>
              Supprimer mon compte
            </h3>
            <p className="mt-2 max-w-xl text-white/50" style={{ fontSize: 13, lineHeight: 1.5 }}>
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
            <div className="text-white" style={{ fontSize: 15, fontWeight: 600 }}>
              Es-tu sûr de vouloir supprimer ton compte ?
            </div>
            <div className="mt-2 text-white/55" style={{ fontSize: 13 }}>
              Choisis clairement entre <span className="text-white">oui</span> ou <span className="text-white">non</span>.
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

      {saved && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-2xl border border-[#00D4AA]/30 bg-[#00D4AA]/10 px-4 py-3 text-[#00D4AA]"
          style={{ fontSize: 13 }}
        >
          <CheckCircle2 size={16} /> Thème sauvegardé
        </div>
      )}
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
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/3 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: on ? "rgba(0,212,170,0.12)" : "rgba(255,255,255,0.05)",
            color: on ? "#00D4AA" : "rgba(255,255,255,0.5)",
          }}
        >
          {icon}
        </div>
        <div>
          <div className="text-white" style={{ fontSize: 14, fontWeight: 500 }}>
            {label}
          </div>
          <div className="text-white/40" style={{ fontSize: 11 }}>
            {desc}
          </div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className="relative h-7 w-12 rounded-full transition-all"
        style={{
          background: on ? "linear-gradient(90deg,#00D4AA,#06b89a)" : "rgba(255,255,255,0.1)",
          boxShadow: on ? "0 0 16px rgba(0,212,170,0.35)" : "none",
        }}
      >
        <div className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all" style={{ left: on ? "calc(100% - 26px)" : 2 }} />
      </button>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3">
      <span className="text-white/50" style={{ fontSize: 13 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: color ?? "rgba(255,255,255,0.8)", textAlign: "right" }}>{value}</span>
    </div>
  );
}
