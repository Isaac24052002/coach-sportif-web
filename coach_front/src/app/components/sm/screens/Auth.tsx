import { useState } from "react";
import { GlassCard, GlowButton } from "../primitives";
import {
  AlertCircle,
  BadgeCheck,
  Dumbbell,
  Eye,
  Lock,
  Mail,
  Ruler,
  ScanLine,
  Sparkles,
  User,
  Weight,
  Wifi,
} from "lucide-react";
import { useAuth } from "../../../AuthContext";
import { RegisterPayload } from "../../../api";

const AUTH_BG_URL = "/static/img/coach.png";

export function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState("");
  const { login, register } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [reg, setReg] = useState({
    prenom: "",
    email: "",
    mot_de_passe: "",
    age: "24",
    taille_cm: "175",
    poids_kg: "70",
    sexe: "M" as "M" | "F",
    niveau: "debutant" as RegisterPayload["niveau"],
    theme: "ember",
  });

  const passwordStrength =
    reg.mot_de_passe.length >= 10 ? "Robuste" : reg.mot_de_passe.length >= 6 ? "Correct" : "Trop court";
  const passwordsMatch = confirmPwd.length > 0 && reg.mot_de_passe === confirmPwd;

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(loginEmail, loginPwd);
      onAuth();
    } catch (e: any) {
      setError(e.message ?? "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    if (reg.prenom.trim().length < 2) {
      setError("Entre un prénom valide.");
      return;
    }
    if (reg.mot_de_passe.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (reg.mot_de_passe !== confirmPwd) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await register({
        ...reg,
        prenom: reg.prenom.trim(),
        email: reg.email.trim(),
        age: Number(reg.age),
        taille_cm: Number(reg.taille_cm),
        poids_kg: Number(reg.poids_kg),
      });
      onAuth();
    } catch (e: any) {
      setError(e.message ?? "Erreur inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${AUTH_BG_URL})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 30%, rgba(0,212,170,0.12), transparent 70%), radial-gradient(50% 40% at 80% 70%, rgba(255,107,74,0.10), transparent 70%), linear-gradient(180deg, rgba(6,14,15,0.78), rgba(11,26,28,0.90))",
          }}
        />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <div className="flex flex-col justify-between p-8 lg:p-14">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg,#00D4AA,#06b89a)", boxShadow: "0 0 24px rgba(0,212,170,0.45)" }}
            >
              <Dumbbell size={22} color="#06181A" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-white" style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 18 }}>
                Studio Motion
              </div>
              <div className="text-white/40" style={{ fontSize: 11 }}>
                Coach Fitness IA
              </div>
            </div>
          </div>

          <div className="my-12 max-w-xl">
            <h1
              className="text-white"
              style={{ fontFamily: "Space Grotesk", fontSize: 52, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}
            >
              Ton coach IA
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg,#00D4AA,#FFD166)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                qui voit
              </span>{" "}
              ce que les autres ne voient pas.
            </h1>
            <p className="mt-5 text-white/55" style={{ fontSize: 16, maxWidth: 500 }}>
              Analyse posturale en temps réel, comptage intelligent des reps et recommandations visuelles pour garder
              une progression propre.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: <Eye size={18} />, title: "Vision IA", desc: "Détection 17 keypoints" },
                { icon: <ScanLine size={18} />, title: "10 exercices", desc: "Bibliothèque experte" },
                { icon: <Wifi size={18} />, title: "Temps réel", desc: "WebSocket < 50ms" },
              ].map((f) => (
                <GlassCard key={f.title} className="p-4">
                  <div className="text-[#00D4AA]">{f.icon}</div>
                  <div className="mt-3 text-white" style={{ fontSize: 14, fontWeight: 600 }}>
                    {f.title}
                  </div>
                  <div className="text-white/50" style={{ fontSize: 11 }}>
                    {f.desc}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-white/40" style={{ fontSize: 11 }}>
            <span>● Coach visuel guidé</span>
            <span>● Score qualité /100</span>
            <span>● Historique par jour</span>
            <span>● Exports PDF</span>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-12">
          <GlassCard glow className={`w-full ${tab === "register" ? "max-w-2xl" : "max-w-md"} p-8`} style={{ borderRadius: 32 } as any}>
            <div className="mb-6 flex rounded-2xl bg-white/5 p-1">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setError("");
                  }}
                  className={`flex-1 rounded-xl py-2.5 transition-all ${
                    tab === t ? "bg-[#00D4AA] text-black shadow-[0_0_20px_rgba(0,212,170,0.4)]" : "text-white/60"
                  }`}
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {t === "login" ? "Connexion" : "Inscription"}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <div className="flex items-center gap-2 text-[#FFD166]" style={{ fontSize: 12, fontWeight: 600 }}>
                <Sparkles size={14} />
                {tab === "login" ? "Retour au studio" : "Créer ton espace personnel"}
              </div>
              <h2 className="mt-2 text-white" style={{ fontFamily: "Space Grotesk", fontSize: 28, fontWeight: 700 }}>
                {tab === "login" ? "Reprends ta progression" : "Prépare un profil plus précis"}
              </h2>
              <p className="mt-2 text-white/50" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {tab === "login"
                  ? "Connecte-toi pour retrouver tes séances, tes scores et ton tableau de progression."
                  : "Un profil complet permet d'affiner les objectifs, le TDEE et les retours affichés dans le suivi."}
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

            {tab === "login" ? (
              <div className="space-y-4">
                <FI icon={<Mail size={16} />} label="Email" type="email" value={loginEmail} onChange={setLoginEmail} autoComplete="email" />
                <FI
                  icon={<Lock size={16} />}
                  label="Mot de passe"
                  type="password"
                  value={loginPwd}
                  onChange={setLoginPwd}
                  autoComplete="current-password"
                />
                <GlowButton className="w-full" onClick={handleLogin} disabled={loading}>
                  {loading ? "Connexion…" : "Se connecter"}
                </GlowButton>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-[#00D4AA]/15 bg-[#00D4AA]/8 p-4">
                  <div className="flex items-center gap-2 text-[#00D4AA]" style={{ fontSize: 12, fontWeight: 600 }}>
                    <BadgeCheck size={14} />
                    Profil guidé
                  </div>
                  <div className="mt-2 text-white" style={{ fontSize: 14, fontWeight: 600 }}>
                    Renseigne tes infos une seule fois pour obtenir un suivi plus juste.
                  </div>
                  <div className="mt-1 text-white/45" style={{ fontSize: 11 }}>
                    Le mot de passe doit être confirmé avant la création du compte.
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-white/45" style={{ fontSize: 11, letterSpacing: 0.6 }}>
                    IDENTITÉ
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FI
                      icon={<User size={16} />}
                      label="Prénom"
                      value={reg.prenom}
                      onChange={(v) => setReg((r) => ({ ...r, prenom: v }))}
                      autoComplete="given-name"
                    />
                    <FI
                      icon={<Mail size={16} />}
                      label="Email"
                      type="email"
                      value={reg.email}
                      onChange={(v) => setReg((r) => ({ ...r, email: v }))}
                      autoComplete="email"
                    />
                    <FI
                      icon={<Lock size={16} />}
                      label="Mot de passe"
                      type="password"
                      value={reg.mot_de_passe}
                      onChange={(v) => setReg((r) => ({ ...r, mot_de_passe: v }))}
                      autoComplete="new-password"
                      help={reg.mot_de_passe ? `Niveau: ${passwordStrength}` : "Minimum 6 caractères"}
                    />
                    <FI
                      icon={<Lock size={16} />}
                      label="Confirmer le mot de passe"
                      type="password"
                      value={confirmPwd}
                      onChange={setConfirmPwd}
                      autoComplete="new-password"
                      help={confirmPwd ? (passwordsMatch ? "Les mots de passe correspondent" : "Les mots de passe sont différents") : "Retape le même mot de passe"}
                      helpTone={confirmPwd ? (passwordsMatch ? "success" : "danger") : "neutral"}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-white/45" style={{ fontSize: 11, letterSpacing: 0.6 }}>
                    PROFIL SPORTIF
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FI label="Âge" type="number" value={reg.age} onChange={(v) => setReg((r) => ({ ...r, age: v }))} inputMode="numeric" />
                    <FI
                      icon={<Ruler size={16} />}
                      label="Taille (cm)"
                      type="number"
                      value={reg.taille_cm}
                      onChange={(v) => setReg((r) => ({ ...r, taille_cm: v }))}
                      inputMode="decimal"
                    />
                    <FI
                      icon={<Weight size={16} />}
                      label="Poids (kg)"
                      type="number"
                      value={reg.poids_kg}
                      onChange={(v) => setReg((r) => ({ ...r, poids_kg: v }))}
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectorGroup
                    title="Sexe"
                    items={[
                      { key: "M", label: "Homme" },
                      { key: "F", label: "Femme" },
                    ]}
                    value={reg.sexe}
                    onChange={(value) => setReg((r) => ({ ...r, sexe: value as "M" | "F" }))}
                  />
                  <SelectorGroup
                    title="Niveau"
                    items={[
                      { key: "debutant", label: "Débutant" },
                      { key: "intermediaire", label: "Intermédiaire" },
                      { key: "avance", label: "Avancé" },
                    ]}
                    value={reg.niveau}
                    onChange={(value) =>
                      setReg((r) => ({ ...r, niveau: value as RegisterPayload["niveau"] }))
                    }
                  />
                </div>

                <GlowButton className="w-full" onClick={handleRegister} disabled={loading || !passwordsMatch}>
                  {loading ? "Création…" : "Créer mon espace"}
                </GlowButton>
              </div>
            )}

            <p className="mt-6 text-center text-white/35" style={{ fontSize: 11 }}>
              En continuant, tu acceptes nos conditions d'utilisation.
            </p>
          </GlassCard>
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
  const [focus, setFocus] = useState(false);
  const float = focus || value.length > 0;
  const helpColor =
    helpTone === "success" ? "#00D4AA" : helpTone === "danger" ? "#FF6B4A" : "rgba(255,255,255,0.35)";

  return (
    <div>
      <div
        className="relative rounded-2xl border bg-white/5 transition-all"
        style={{
          borderColor: focus ? "rgba(0,212,170,0.6)" : "rgba(255,255,255,0.08)",
          boxShadow: focus ? "0 0 24px rgba(0,212,170,0.2)" : "none",
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
            color: float ? "#00D4AA" : "rgba(255,255,255,0.45)",
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
                active ? "border-[#00D4AA] bg-[#00D4AA]/10 text-[#00D4AA]" : "border-white/10 text-white/50"
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
