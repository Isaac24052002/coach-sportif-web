import React from "react";
import { motion } from "motion/react";
import { useTheme } from "./theme";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function GlassCard({
  children,
  className = "",
  glow = false,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  const { t } = useTheme();
  return (
    <div
      {...rest}
      className={`relative rounded-3xl backdrop-blur-2xl ${className}`}
      style={{
        border: `1px solid ${t.border}`,
        background: glow ? t.surfaceSoft : t.surfaceTint,
        boxShadow: glow ? `0 18px 44px ${t.accent}22` : t.shadow,
        color: t.textPrimary,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PulseDot({ color, size = 8 }: { color?: string; size?: number }) {
  const { t } = useTheme();
  const c = color ?? t.accent;
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: c }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
      <span className="absolute inset-0 rounded-full" style={{ background: c }} />
    </span>
  );
}

export function StatusChip({
  label,
  color,
  pulsing = false,
}: {
  label: string;
  color?: string;
  pulsing?: boolean;
}) {
  const { t } = useTheme();
  const c = color ?? t.accent;
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-xl"
      style={{ background: `${c}1A`, border: `1px solid ${c}55`, color: c }}
    >
      {pulsing && <PulseDot color={c} size={7} />}
      <span style={{ fontSize: 12, letterSpacing: 0.4 }}>{label}</span>
    </div>
  );
}

export function QualityRing({
  value,
  size = 96,
  stroke = 8,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const { t } = useTheme();
  const safeValue = clampPercent(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (safeValue / 100) * c;
  const color = safeValue >= 70 ? t.accent : safeValue >= 40 ? t.gold : t.secondary;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={t.border} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ color, fontSize: size * 0.28, fontWeight: 700, fontFamily: "Sora" }}>{Math.round(safeValue)}</span>
        {label && <span style={{ fontSize: 10, letterSpacing: 0.5, color: t.textMuted }}>{label}</span>}
      </div>
    </div>
  );
}

export function Sparkline({ data, color, width = 90, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const { t } = useTheme();
  const c = color ?? t.accent;
  const safeData = data.length > 0 ? data : [0];
  const max = Math.max(...safeData);
  const min = Math.min(...safeData);
  const range = Math.max(1, max - min);
  const denominator = Math.max(safeData.length - 1, 1);
  const pts = safeData.map((d, i) => {
    const x = (i / denominator) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  const gid = `spark-${c.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.4" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={c} strokeWidth="2" points={pts} strokeLinecap="round" strokeLinejoin="round" />
      <polygon fill={`url(#${gid})`} points={`0,${height} ${pts} ${width},${height}`} />
    </svg>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: number[];
  color?: string;
}) {
  const { t } = useTheme();
  const c = color ?? t.accent;
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 40, height: 40, background: `${c}1F`, color: c }}
        >
          {icon}
        </div>
        {trend && trend.length > 0 && <Sparkline data={trend} color={c} />}
      </div>
      <div className="mt-4">
        <div className="flex items-baseline gap-1.5">
          <span style={{ color: t.textPrimary, fontSize: 28, fontWeight: 700, fontFamily: "Sora" }}>{value}</span>
          {unit && <span style={{ color: t.textMuted, fontSize: 12 }}>{unit}</span>}
        </div>
        <div style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{label}</div>
      </div>
    </GlassCard>
  );
}

export function GlowButton({
  children,
  variant = "primary",
  className = "",
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const { t } = useTheme();
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${t.accent}, ${t.accentStrong})`,
      color: "#ffffff",
      boxShadow: `0 16px 32px ${t.accent}55`,
    },
    secondary: {
      background: t.surfaceStrong,
      color: t.textPrimary,
      border: `1px solid ${t.border}`,
    },
    danger: {
      background: `linear-gradient(135deg, ${t.secondary}, #db6f24)`,
      color: "#fff",
      boxShadow: `0 16px 32px ${t.secondary}48`,
    },
    ghost: { color: t.textMuted, background: "transparent" },
  };
  return (
    <button
      {...rest}
      type={rest.type ?? "button"}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 transition-all active:scale-[0.98] ${className}`}
      style={{ fontWeight: 700, fontSize: 14, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  active = false,
  tone = "neutral",
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  tone?: "good" | "warn" | "neutral";
  onClick?: () => void;
}) {
  const { t } = useTheme();
  const tones: Record<string, React.CSSProperties> = {
    good: { borderColor: `${t.accent}66`, background: `${t.accent}1A`, color: t.accent },
    warn: { borderColor: `${t.secondary}66`, background: `${t.secondary}1A`, color: t.secondary },
    neutral: {
      borderColor: t.border,
      background: t.surfaceStrong,
      color: t.textPrimary,
    },
  };
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-all"
      style={{
        ...tones[tone],
        fontSize: 12,
        fontWeight: 500,
        boxShadow: active ? `0 0 20px ${t.accent}59` : undefined,
        outline: active ? `2px solid ${t.accent}` : undefined,
      }}
    >
      {children}
    </button>
  );
}

export function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTheme();
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative inline-flex items-center rounded-full transition-all"
      style={{
        width: 48,
        height: 28,
        background: on ? `linear-gradient(90deg, ${t.accent}, ${t.accentStrong})` : t.surfaceStrong,
        boxShadow: on ? `0 10px 24px ${t.accent}66` : "none",
      }}
    >
      <motion.span
        className="absolute rounded-full bg-white"
        style={{ width: 22, height: 22, top: 3 }}
        animate={{ left: on ? 23 : 3 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
