import { Home, Activity, BarChart3, User, Settings, LogOut, Play } from "lucide-react";
import { PulseDot } from "./primitives";
import { motion } from "motion/react";
import { useTheme } from "./theme";
import { useAuth } from "../../AuthContext";

export type ScreenKey = "auth" | "home" | "live" | "progress" | "profile" | "settings";

const BRAND_LOGO_SRC = "/static/img/logo.png";

const items: { key: ScreenKey; label: string; icon: any; live?: boolean }[] = [
  { key: "home", label: "Accueil", icon: Home },
  { key: "live", label: "Séance", icon: Activity, live: true },
  { key: "progress", label: "Suivi", icon: BarChart3 },
  { key: "profile", label: "Profil", icon: User },
  { key: "settings", label: "Réglages", icon: Settings },
];

export function Sidebar({
  current, onNav, expanded, onToggleExpand, onLogout, liveActive,
}: {
  current: ScreenKey; onNav: (k: ScreenKey) => void; expanded: boolean;
  onToggleExpand: () => void; onLogout: () => void; liveActive: boolean;
}) {
  const { t } = useTheme();
  const { user } = useAuth();

  const initials = user?.prenom
    ? user.prenom.split(" ").map((w) => w[0].toUpperCase()).join("").slice(0, 2)
    : "??";
  const niveauLabel = user?.niveau === "avance" || user?.niveau === "expert" ? "Expert" : user?.niveau === "intermediaire" ? "Intermédiaire" : "Débutant";

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col backdrop-blur-2xl md:flex"
      style={{
        width: expanded ? 240 : 72,
        transition: "width 220ms ease",
        background: "rgba(255,255,255,0.88)",
        borderRight: `1px solid ${t.border}`,
        boxShadow: "12px 0 28px rgba(44, 78, 51, 0.05)",
        color: t.textPrimary,
      }}
    >
      <button onClick={onToggleExpand} className="flex h-20 items-center gap-3 px-4">
        <img
          src={BRAND_LOGO_SRC}
          alt="HuuFit"
          className="shrink-0 object-contain"
          style={{
            width: expanded ? 128 : 48,
            height: 48,
            boxShadow: expanded ? "0 10px 22px rgba(0, 0, 0, 0.12)" : "none",
            background: "transparent",
          }}
        />
        {expanded && (
          <div className="flex flex-col text-left leading-tight">
            <span style={{ color: t.textPrimary, fontFamily: "Sora", fontWeight: 700, fontSize: 14, letterSpacing: 0.3 }}>
              KÙMÉ
            </span>
          </div>
        )}
      </button>

      <nav className="flex-1 px-3">
        {items.map((it) => {
          const Icon = it.icon;
          const active = current === it.key;
          return (
            <button key={it.key} onClick={() => onNav(it.key)}
              className="group relative my-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-all"
              style={{
                background: active ? `linear-gradient(135deg, ${t.accentDim}, rgba(255,255,255,0.72))` : "transparent",
                color: active ? t.accentStrong : t.textMuted,
                boxShadow: active ? "0 12px 24px rgba(79, 214, 108, 0.14)" : "none",
              }}
            >
              {active && (
                <motion.span layoutId="navIndicator"
                  className="absolute left-0 h-6 w-1 rounded-r-full"
                  style={{ background: t.accentStrong, boxShadow: `0 0 12px ${t.accent}` }}
                />
              )}
              <Icon size={20} strokeWidth={2} />
              {expanded && <span style={{ fontSize: 14, fontWeight: 500 }}>{it.label}</span>}
              {it.live && liveActive && (
                <span className={expanded ? "ml-auto" : "absolute right-2 top-2"}>
                  <PulseDot color={t.secondary} />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className={`flex items-center gap-3 rounded-2xl p-2.5 ${expanded ? "" : "justify-center"}`}
          style={{ background: t.surfaceStrong }}>
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: `linear-gradient(135deg,${t.accent},${t.gold})`, color: t.accentStrong, fontWeight: 700, fontSize: 13 }}>
              {initials}
            </div>
          </div>
          {expanded && (
            <div className="flex-1 min-w-0 leading-tight">
              <div className="truncate" style={{ color: t.textPrimary, fontSize: 12, fontWeight: 600 }}>
                {user?.prenom ?? "Utilisateur"}
              </div>
              <div style={{ color: t.textMuted, fontSize: 10 }}>{niveauLabel}</div>
            </div>
          )}
          {expanded && (
            <button onClick={onLogout} className="rounded-xl p-2 shrink-0" style={{ color: t.textMuted }}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export function BottomNav({
  current, onNav, onLaunchLive,
}: { current: ScreenKey; onNav: (k: ScreenKey) => void; onLaunchLive: () => void; }) {
  const { t } = useTheme();
  const tabs: { key: ScreenKey; label: string; icon: any }[] = [
    { key: "home", label: "Accueil", icon: Home },
    { key: "progress", label: "Suivi", icon: BarChart3 },
    { key: "live", label: "Séance", icon: Activity },
    { key: "profile", label: "Profil", icon: User },
    { key: "settings", label: "Menu", icon: Settings },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="relative mx-3 mb-3 rounded-3xl backdrop-blur-2xl"
        style={{ background: "rgba(255,255,255,0.92)", border: `1px solid ${t.border}`, boxShadow: "0 -10px 32px rgba(44, 78, 51, 0.08)" }}>
        <div className="grid grid-cols-5 items-end px-2 py-2">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isFab = idx === 2;
            if (isFab) {
              return (
                <button key={tab.key} onClick={onLaunchLive}
                  className="relative -mt-8 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: `linear-gradient(135deg,${t.accent},${t.accentStrong})`, boxShadow: `0 18px 30px ${t.accent}80` }}>
                  <Play size={26} fill="#ffffff" color="#ffffff" />
                </button>
              );
            }
            const active = current === tab.key;
            return (
              <button key={tab.key} onClick={() => onNav(tab.key)}
                className="flex flex-col items-center gap-1 rounded-2xl py-2"
                style={{ color: active ? t.accent : t.textMuted }}>
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
