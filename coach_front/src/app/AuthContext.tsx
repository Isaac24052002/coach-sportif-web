import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authLogin, authRegister, getUserOverview, RegisterPayload, APIUserView, BootstrapData, bootstrap, deleteUserAccount } from "./api";

export interface AuthUser {
  id: number;
  prenom: string;
  niveau: string;
  theme: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  view: APIUserView | null;           // vue complète incluant profile, insights, home
  bootData: BootstrapData | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  refreshOverview: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseView(v: APIUserView): AuthUser {
  return {
    id: v.account.user_id,
    prenom: v.profile.prenom,
    niveau: v.profile.niveau,
    theme: v.account.theme,
    email: v.account.email,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<APIUserView | null>(null);
  const [bootData, setBootData] = useState<BootstrapData | null>(null);

  const applyView = (v: APIUserView) => {
    const updated: AuthUser = parseView(v);
    setView(v);
    setUser(updated);
    localStorage.setItem("sm_user", JSON.stringify(updated));
  };

  // Restaurer la session depuis localStorage
  useEffect(() => {
    const raw = localStorage.getItem("sm_user");
    if (raw) {
      try {
        const u: AuthUser = JSON.parse(raw);
        setUser(u);
      } catch (_) {
        localStorage.removeItem("sm_user");
      }
    }
    bootstrap().then(setBootData).catch(() => {});
  }, []);

  // Charger la vue complète dès que l'user est connu
  useEffect(() => {
    if (user) refreshOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const refreshOverview = async () => {
    if (!user) return;
    try {
      const v = await getUserOverview(user.id);
      applyView(v);
    } catch (_) {}
  };

  const login = async (email: string, password: string) => {
    const v = await authLogin({ email, mot_de_passe: password });
    applyView(v);
  };

  const register = async (payload: RegisterPayload) => {
    const v = await authRegister(payload);
    applyView(v);
  };

  const logout = () => {
    localStorage.removeItem("sm_user");
    setUser(null);
    setView(null);
  };

  const removeAccount = async () => {
    if (!user) return;
    try {
      await deleteUserAccount(user.id);
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (!message.includes("404") && !message.includes("Compte introuvable")) {
        throw error;
      }
    }
    logout();
  };

  return (
    <AuthContext.Provider value={{ user, view, bootData, login, register, logout, deleteAccount: removeAccount, refreshOverview }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
