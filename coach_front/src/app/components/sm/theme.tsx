import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId = "ember" | "ocean" | "dawn";

export const themes: Record<ThemeId, {
  name: string;
  desc: string;
  mode: "dark" | "light";
  bg: string;
  bgRadial: string;
  accent: string;
  accentDim: string;
  secondary: string;
  gold: string;
  textPrimary: string;
  textMuted: string;
  surfaceTint: string;
  preview: [string, string, string];
}> = {
  ocean: {
    name: "Ocean",
    desc: "Cool teal",
    mode: "dark",
    bg: "linear-gradient(180deg,#060E0F,#0B1A1C)",
    bgRadial: "radial-gradient(80% 60% at 70% 0%, rgba(0,212,170,0.08), transparent 70%)",
    accent: "#00D4AA",
    accentDim: "rgba(0,212,170,0.15)",
    secondary: "#FF6B4A",
    gold: "#FFD166",
    textPrimary: "#ffffff",
    textMuted: "rgba(255,255,255,0.55)",
    surfaceTint: "rgba(255,255,255,0.04)",
    preview: ["#060E0F", "#00D4AA", "#5fa8d3"],
  },
  ember: {
    name: "Ember",
    desc: "Warm dark",
    mode: "dark",
    bg: "linear-gradient(180deg,#180A06,#2A0F08)",
    bgRadial: "radial-gradient(80% 60% at 70% 0%, rgba(255,107,74,0.12), transparent 70%)",
    accent: "#FF8A5C",
    accentDim: "rgba(255,138,92,0.18)",
    secondary: "#FFD166",
    gold: "#FFD166",
    textPrimary: "#ffffff",
    textMuted: "rgba(255,255,255,0.55)",
    surfaceTint: "rgba(255,255,255,0.04)",
    preview: ["#1a0e0a", "#FF6B4A", "#FFD166"],
  },
  dawn: {
    name: "Dawn",
    desc: "Gold sunrise",
    mode: "dark",
    bg: "linear-gradient(180deg,#0E0A06,#1C1408)",
    bgRadial: "radial-gradient(80% 60% at 70% 0%, rgba(255,209,102,0.12), transparent 70%)",
    accent: "#FFD166",
    accentDim: "rgba(255,209,102,0.18)",
    secondary: "#FF6B4A",
    gold: "#FFD166",
    textPrimary: "#ffffff",
    textMuted: "rgba(255,255,255,0.55)",
    surfaceTint: "rgba(255,255,255,0.04)",
    preview: ["#0E0A06", "#FFD166", "#FF6B4A"],
  },
};

type Ctx = { id: ThemeId; setId: (id: ThemeId) => void; t: typeof themes[ThemeId] };
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>(() => (localStorage.getItem("sm-theme") as ThemeId) || "ocean");
  const t = themes[id];

  useEffect(() => {
    localStorage.setItem("sm-theme", id);
    const r = document.documentElement.style;
    r.setProperty("--sm-accent", t.accent);
    r.setProperty("--sm-accent-dim", t.accentDim);
    r.setProperty("--sm-secondary", t.secondary);
    r.setProperty("--sm-gold", t.gold);
    r.setProperty("--sm-text", t.textPrimary);
    r.setProperty("--sm-text-muted", t.textMuted);
    r.setProperty("--sm-surface-tint", t.surfaceTint);
  }, [id, t]);

  return <ThemeCtx.Provider value={{ id, setId, t }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("ThemeProvider missing");
  return v;
}
