import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type ThemeId = "kume";

export const themes: Record<
  ThemeId,
  {
    name: string;
    desc: string;
    mode: "light" | "dark";
    bg: string;
    bgRadial: string;
    shellBg: string;
    accent: string;
    accentStrong: string;
    accentDim: string;
    secondary: string;
    gold: string;
    textPrimary: string;
    textMuted: string;
    textSoft: string;
    surfaceTint: string;
    surfaceSoft: string;
    surfaceStrong: string;
    border: string;
    shadow: string;
    preview: [string, string, string];
  }
> = {
  kume: {
    name: "KUME",
    desc: "Vert énergie, fond clair et cartes douces",
    mode: "light",
    bg: "#F4F6F0",
    bgRadial:
      "radial-gradient(90% 120% at 15% 0%, rgba(79, 214, 108, 0.18), transparent 55%), radial-gradient(70% 70% at 100% 12%, rgba(46, 122, 63, 0.10), transparent 52%)",
    shellBg:
      "linear-gradient(180deg, #32C95D 0px, #32C95D 180px, #F4F6F0 180px, #F4F6F0 100%)",
    accent: "#4FD66C",
    accentStrong: "#1F7A37",
    accentDim: "rgba(79, 214, 108, 0.16)",
    secondary: "#F68B3C",
    gold: "#A4D65E",
    textPrimary: "#18261C",
    textMuted: "rgba(24, 38, 28, 0.76)",
    textSoft: "rgba(24, 38, 28, 0.56)",
    surfaceTint: "rgba(255, 255, 255, 0.94)",
    surfaceSoft: "rgba(244, 251, 244, 0.96)",
    surfaceStrong: "#EAF7EC",
    border: "rgba(32, 79, 41, 0.14)",
    shadow: "0 18px 40px rgba(40, 79, 48, 0.09)",
    preview: ["#32C95D", "#F4F6F0", "#1F7A37"],
  },
};

type ThemeType = typeof themes.kume;
type Ctx = { id: ThemeId; setId: (id: ThemeId) => void; t: ThemeType };
const ThemeCtx = createContext<Ctx | null>(null);

function normaliseTheme(_value?: string | null): ThemeId {
  return "kume";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setIdState] = useState<ThemeId>(() => normaliseTheme(localStorage.getItem("sm-theme")));
  const t = useMemo(() => themes[id], [id]);

  const setId = (nextId: ThemeId) => {
    setIdState(normaliseTheme(nextId));
  };

  useEffect(() => {
    const resolved = normaliseTheme(id);
    if (resolved !== id) {
      setIdState(resolved);
      return;
    }

    localStorage.setItem("sm-theme", resolved);

    const root = document.documentElement.style;
    root.setProperty("--sm-accent", t.accent);
    root.setProperty("--sm-accent-strong", t.accentStrong);
    root.setProperty("--sm-accent-dim", t.accentDim);
    root.setProperty("--sm-secondary", t.secondary);
    root.setProperty("--sm-gold", t.gold);
    root.setProperty("--sm-text", t.textPrimary);
    root.setProperty("--sm-text-muted", t.textMuted);
    root.setProperty("--sm-text-soft", t.textSoft);
    root.setProperty("--sm-surface", t.surfaceTint);
    root.setProperty("--sm-surface-soft", t.surfaceSoft);
    root.setProperty("--sm-surface-strong", t.surfaceStrong);
    root.setProperty("--sm-border", t.border);
    root.setProperty("--sm-shadow", t.shadow);
    root.setProperty("--sm-bg", t.bg);

    document.body.style.background = t.bg;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#32C95D");
  }, [id, t]);

  return <ThemeCtx.Provider value={{ id, setId, t }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("ThemeProvider missing");
  return v;
}
