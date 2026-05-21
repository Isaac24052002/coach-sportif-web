import { useState } from "react";
import { GlassCard, GlowButton } from "../primitives";
import {
  AlertCircle,
  Eye,
  ScanLine,
  Sparkles,
  User,
  Wifi,
} from "lucide-react";
import { useAuth } from "../../../AuthContext";
import { useTheme } from "../theme";

const AUTH_BG_URL = "/static/img/coach.png";
const BRAND_LOGO_SRC = "/static/img/logo.png";

export function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const { t } = useTheme();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { startLocalSession } = useAuth();

  const [prenom, setPrenom] = useState("");
  const [niveau, setNiveau] = useState<"debutant" | "intermediaire" | "avance">("debutant");
  const [imc, setImc] = useState("");
  const [besoinConsommation, setBesoinConsommation] = useState("");

  const imcValue = Number(imc.replace(",", "."));
  const besoinValue = Number(besoinConsommation.replace(",", "."));
  const canSubmit =
    prenom.trim().length >= 2 &&
    Number.isFinite(imcValue) && imcValue > 0 &&
    Number.isFinite(besoinValue) && besoinValue > 0;

  const featureCards = [
    { icon: <Eye size={18} />, title: "Vision KÙMÉ", desc: "Détection 17 keypoints" },
    { icon: <ScanLine size={18} />, title: "10 exercices", desc: "Bibliothèque experte" },
    { icon: <Wifi size={18} />, title: "Temps réel", desc: "WebSocket < 50ms" },
  ];

  const statPoints = [
    "● Coach visuel guidé",
    "● Score qualité /100",
    "● Historique par jour",
    "● Exports PDF",
  ];

  const handleValidate = async () => {
    if (!canSubmit) {
      setError("Merci de renseigner un IMC et un besoin valides (en chiffres).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await startLocalSession({
        prenom: prenom.trim(),
        niveau,
        imc: imc.trim(),
        besoin_consommation: besoinConsommation.trim(),
      });
      onAuth();
    } catch (e: any) {
      setError(e?.message ?? "Impossible de demarrer la session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 auth-bg"
          style={{
            backgroundImage: `url(${AUTH_BG_URL})`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 30%, rgba(79,214,108,0.18), transparent 70%), radial-gradient(50% 40% at 80% 70%, rgba(255,255,255,0.10), transparent 70%), linear-gradient(180deg, rgba(31,122,55,0.62), rgba(20,55,27,0.78))",
          }}
        />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <div className="auth-hero flex flex-col justify-between p-8 lg:p-14">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_LOGO_SRC}
              alt="HuuFit"
              className="object-contain"
              style={{ width: 132, height: 50, background: "transparent", boxShadow: "0 12px 24px rgba(0,0,0,0.18)" }}
            />
            <div>
              <div className="text-white" style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 18 }}>
                KÙMÉ
              </div>
            </div>
          </div>

          <div className="my-12 max-w-xl">
            <h1
              className="text-white"
              style={{ fontFamily: "Sora", fontSize: 52, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}
            >
              Ton coach fitness personnel.
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg,#CFF8D7,#7EF09B)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                KÙMÉ
              </span>{" "}
              te guide à chaque séance.
            </h1>
            <p className="mt-5 text-white/55" style={{ fontSize: 16, maxWidth: 500 }}>
              Analyse posturale en temps réel, comptage intelligent des reps et recommandations visuelles pour garder
              une progression propre.
            </p>
            <div className="mt-10 hidden grid-cols-1 gap-3 sm:grid-cols-3 lg:grid">
              {featureCards.map((f) => (
                <GlassCard key={f.title} className="p-4">
                  <div style={{ color: "#4FD66C" }}>{f.icon}</div>
                  <div className="mt-3" style={{ color: "#0b0b0b", fontSize: 14, fontWeight: 600 }}>
                    {f.title}
                  </div>
                  <div style={{ color: "#0b0b0b", opacity: 0.7, fontSize: 11 }}>
                    {f.desc}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          <div className="hidden flex-wrap gap-x-6 gap-y-2 text-white/40 lg:flex" style={{ fontSize: 11 }}>
            {statPoints.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-6 p-6 lg:p-12">
          <GlassCard glow className="w-full max-w-lg p-8" style={{ borderRadius: 32 } as any}>
            <div className="mb-5">
              <div className="flex items-center gap-2" style={{ color: t.accentStrong, fontSize: 12, fontWeight: 700 }}>
                <Sparkles size={14} />
                Merci de renseigner
              </div>
              <h2 className="mt-2 text-white" style={{ fontFamily: "Sora", fontSize: 28, fontWeight: 700 }}>
                Tes informations de départ
              </h2>
              <p className="mt-2 text-white/50" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Renseigne ton prénom, ton niveau et ton besoin de consommation pour accéder à l'espace.
              </p>
            </div>

            {error && (
              <div
                className="mb-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400"
                style={{ fontSize: 13 }}
              >
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="space-y-4">
              <FI
                icon={<User size={16} />}
                label="Prénom"
                value={prenom}
                onChange={setPrenom}
                autoComplete="given-name"
              />
              <SelectorGroup
                title="Niveau"
                items={[
                  { key: "debutant", label: "Débutant" },
                  { key: "intermediaire", label: "Intermédiaire" },
                  { key: "avance", label: "Expert" },
                ]}
                value={niveau}
                onChange={(value) => setNiveau(value as "debutant" | "intermediaire" | "avance")}
              />
              <FI
                label="IMC"
                value={imc}
                onChange={setImc}
                type="number"
                inputMode="decimal"
              />
              <FI
                label="Besoin de consommation (kcal)"
                value={besoinConsommation}
                onChange={setBesoinConsommation}
                type="number"
                inputMode="decimal"
              />
              <GlowButton className="w-full" onClick={handleValidate} disabled={loading}>
                Valider
              </GlowButton>
            </div>

            <p className="mt-6 text-center text-white/35" style={{ fontSize: 11 }}>
              En continuant, tu acceptes nos conditions d'utilisation.
            </p>
          </GlassCard>

          <div className="w-full max-w-lg lg:hidden">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {featureCards.map((f) => (
                <GlassCard key={f.title} className="p-4">
                  <div style={{ color: "#4FD66C" }}>{f.icon}</div>
                  <div className="mt-3" style={{ color: "#0b0b0b", fontSize: 14, fontWeight: 600 }}>
                    {f.title}
                  </div>
                  <div style={{ color: "#0b0b0b", opacity: 0.7, fontSize: 11 }}>
                    {f.desc}
                  </div>
                </GlassCard>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-white/40" style={{ fontSize: 11 }}>
              {statPoints.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FI({
  icon,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  inputMode,
  help,
  helpTone = "neutral",
}: {
  icon?: React.ReactNode;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  help?: string;
  helpTone?: "neutral" | "success" | "danger";
}) {
  const { t } = useTheme();
  const [focus, setFocus] = useState(false);
  const float = focus || value.length > 0;
  const helpColor =
    helpTone === "success" ? t.accentStrong : helpTone === "danger" ? t.secondary : t.textSoft;

  return (
    <div>
      <div
        className="relative rounded-2xl border bg-white/5 transition-all"
        style={{
          borderColor: focus ? "rgba(79,214,108,0.45)" : "rgba(38,89,49,0.10)",
          boxShadow: focus ? "0 14px 26px rgba(79,214,108,0.14)" : "none",
        }}
      >
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>}
        <label
          className="pointer-events-none absolute transition-all"
          style={{
            left: icon ? 44 : 16,
            top: float ? 8 : "50%",
            transform: float ? "none" : "translateY(-50%)",
            fontSize: float ? 10 : 13,
            color: float ? t.accentStrong : t.textMuted,
          }}
        >
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className="w-full bg-transparent pb-2.5 pr-4 pt-6 text-white outline-none"
          style={{ fontSize: 14, paddingLeft: icon ? 44 : 16 }}
        />
      </div>
      {help && (
        <div className="mt-1 px-1" style={{ fontSize: 11, color: helpColor }}>
          {help}
        </div>
      )}
    </div>
  );
}

function SelectorGroup({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-white/50" style={{ fontSize: 11 }}>
        {title}
      </div>
      <div className="flex gap-2">
        {items.map((item) => {
          const active = value === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex-1 rounded-xl border px-3 py-2.5 transition-all ${
                active ? "border-[#4FD66C] bg-[#4FD66C]/10 text-[#1F7A37]" : "border-white/10 text-white/50"
              }`}
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
