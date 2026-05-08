import { Home, Activity, BarChart3, User, Settings, LogOut, Play, Dumbbell } from "lucide-react";
import { PulseDot } from "./primitives";
import { motion } from "motion/react";
import { useTheme } from "./theme";
import { useAuth } from "../../AuthContext";

export type ScreenKey = "auth" | "home" | "live" | "progress" | "profile" | "settings";

const items: { key: ScreenKey; label: string; icon: any; live?: boolean }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "live", label: "Live Session", icon: Activity, live: true },
  { key: "progress", label: "Progress", icon: BarChart3 },
  { key: "profile", label: "Profile", icon: User },
  { key: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  current, onNav, expanded, onToggleExpand, onLogout, liveActive,
}: {
  current: ScreenKey; onNav: (k: ScreenKey) => void; expanded: boolean;
  onToggleExpand: () => void; onLogout: () => void; liveActive: boolean;
}) {
  const { t } = useTheme();
  const { user } = useAuth();
  const isLight = t.mode === "light";

  const initials = user?.prenom
    ? user.prenom.split(" ").map((w) => w[0].toUpperCase()).join("").slice(0, 2)
    : "??";
  const niveauLabel = user?.niveau === "avance" ? "Avancé" : user?.niveau === "intermediaire" ? "Intermédiaire" : "Débutant";

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col backdrop-blur-2xl md:flex"
      style={{
        width: expanded ? 240 : 72,
        transition: "width 220ms ease",
        background: isLight ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)",
        borderRight: isLight ? "1px solid rgba(31,20,16,0.08)" : "1px solid rgba(255,255,255,0.05)",
        color: t.textPrimary,
      }}
    >
      <button onClick={onToggleExpand} className="flex h-20 items-center gap-3 px-4">
        <div
          className="flex shrink-0 items-center justify-center rounded-2xl"
          style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${t.accent}, ${t.accent}cc)`, boxShadow: `0 0 24px ${t.accent}73` }}
        >
          <Dumbbell size={20} color={isLight ? "#fff" : "#06181A"} strokeWidth={2.5} />
        </div>
        {expanded && (
          <div className="flex flex-col text-left leading-tight">
            <span style={{ color: t.textPrimary, fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 14, letterSpacing: 0.3 }}>
              Studio Motion
            </span>
            <span style={{ color: t.textMuted, fontSize: 10 }}>Coach Fitness IA</span>
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
              style={{ background: active ? `${t.accent}26` : "transparent", color: active ? t.accent : t.textMuted, boxShadow: active ? `0 0 24px ${t.accent}2E` : "none" }}
            >
              {active && (
                <motion.span layoutId="navIndicator"
                  className="absolute left-0 h-6 w-1 rounded-r-full"
                  style={{ background: t.accent, boxShadow: `0 0 12px ${t.accent}` }}
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

      <div className="p-3" style={{ borderTop: isLight ? "1px solid rgba(31,20,16,0.08)" : "1px solid rgba(255,255,255,0.05)" }}>
        <div className={`flex items-center gap-3 rounded-2xl p-2.5 ${expanded ? "" : "justify-center"}`}
          style={{ background: t.surfaceTint }}>
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: `linear-gradient(135deg,${t.accent},${t.gold})`, color: "#06181A", fontWeight: 700, fontSize: 13 }}>
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
  const isLight = t.mode === "light";
  const tabs: { key: ScreenKey; label: string; icon: any }[] = [
    { key: "home", label: "Home", icon: Home },
    { key: "progress", label: "Progress", icon: BarChart3 },
    { key: "live", label: "Live", icon: Activity },
    { key: "profile", label: "Profile", icon: User },
    { key: "settings", label: "More", icon: Settings },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="relative mx-3 mb-3 rounded-3xl backdrop-blur-2xl"
        style={{ background: isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.6)", border: isLight ? "1px solid rgba(31,20,16,0.08)" : "1px solid rgba(255,255,255,0.1)", boxShadow: isLight ? "0 -8px 30px rgba(31,20,16,0.1)" : "0 -8px 30px rgba(0,0,0,0.6)" }}>
        <div className="grid grid-cols-5 items-end px-2 py-2">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isFab = idx === 2;
            if (isFab) {
              return (
                <button key={tab.key} onClick={onLaunchLive}
                  className="relative -mt-8 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: `linear-gradient(135deg,${t.accent},${t.accent}cc)`, boxShadow: `0 0 28px ${t.accent}B3, 0 0 60px ${t.accent}59` }}>
                  <Play size={26} fill={isLight ? "#fff" : "#06181A"} color={isLight ? "#fff" : "#06181A"} />
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
