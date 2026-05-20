// ── API Client — KÙMÉ ───────────────────────────────────────────────────────
// L'API N'utilise PAS de token JWT. Même origine : FastAPI sert le build React.
//const API_BASE_URL = import.meta.env.VITE_API_URL;

async function parseResponseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await parseResponseBody<{ detail?: string; message?: string }>(res.clone());
      msg = j?.detail ?? j?.message ?? msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return parseResponseBody<T>(res);
}

// ── Structure retournée par login / register / overview (vue_utilisateur) ────
export interface APIUserView {
  profile: {
    id: number; prenom: string; age: number; taille_cm: number; poids_kg: number;
    sexe: string; niveau: string; date_creation: string; imc: number; fc_max: number; tdee: number;
  };
  account: { user_id: number; email: string; theme: string; last_login: string | null };
  home: {
    welcome: { headline: string; subline: string; next_action: string };
    strengths: { exercise: string; score: number }[];
    improvements: { exercise: string; score: number; tip: string }[];
    blueprint: { name: string; target_label: string }[];
    latest_session: { date: string; duration_sec: number; calories: number; score: number; note: string } | null;
  };
  insights: {
    totals: {
      sessions: number;
      sessions_14d: number;
      calories_14d: number;
      duration_14d_sec: number;
      avg_score: number;
      active_days_14d: number;
      active_days_total: number;
      current_streak: number;
      best_score_14d: number;
      consistency_pct: number;
      today_completed: boolean;
    };
    progression: { date: string; calories: number; score: number; duration_sec: number }[];
    repetitions: { exercise: string; reps: number }[];
    quality: { exercise: string; score: number }[];
    recent_sessions: { date: string; duration_sec: number; calories: number; score: number; note: string }[];
    monthly_badges: {
      month_key: string;
      month_label: string;
      earned_count: number;
      summary: {
        sessions: number;
        active_days: number;
        calories: number;
        duration_sec: number;
        best_score: number;
        avg_score: number;
      };
      badges: {
        id: string;
        title: string;
        description: string;
        icon: string;
        tone: string;
        target: number;
        current: number;
        unit: string;
        unlocked: boolean;
        progress_pct: number;
      }[];
    }[];
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface RegisterPayload {
  prenom: string; email: string; mot_de_passe: string;
  age: number; taille_cm: number; poids_kg: number;
  sexe: "M" | "F"; niveau: "debutant" | "intermediaire" | "avance"; theme: string;
}
export interface LoginPayload { email: string; mot_de_passe: string; }

export interface LocalAuthPayload {
  prenom: string;
  niveau: "debutant" | "intermediaire" | "avance";
  local_id: string;
}

export const authRegister = (p: RegisterPayload) =>
  req<APIUserView>("/api/auth/register", { method: "POST", body: JSON.stringify(p) });
export const authLogin = (p: LoginPayload) =>
  req<APIUserView>("/api/auth/login", { method: "POST", body: JSON.stringify(p) });

export const authLocal = (p: LocalAuthPayload) =>
  req<APIUserView>("/api/auth/local", { method: "POST", body: JSON.stringify(p) });

// ── Bootstrap ─────────────────────────────────────────────────────────────────
export interface BootstrapData {
  app_name: string; version?: string; themes: unknown[]; exercises: unknown[];
  camera: { width: number; height: number; fps: number };
}
export const bootstrap = () => req<BootstrapData>("/api/bootstrap");

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUserOverview = (userId: number) =>
  req<APIUserView>(`/api/users/${userId}/overview`);

export interface UpdateProfilePayload {
  id?: number; prenom: string; age: number; taille_cm: number; poids_kg: number; sexe: string; niveau: string;
}
// PUT /api/users/{id}/profile
export const updateProfile = (userId: number, p: UpdateProfilePayload) =>
  req<APIUserView>(`/api/users/${userId}/profile`, { method: "PUT", body: JSON.stringify({ ...p, id: userId }) });
// PATCH /api/users/{id}/theme
export const updateTheme = (userId: number, theme: string) =>
  req<APIUserView>(`/api/users/${userId}/theme`, { method: "PATCH", body: JSON.stringify({ theme }) });
export const deleteUserAccount = async (userId: number) => {
  try {
    return await req<{ deleted: boolean; message: string }>(`/api/users/${userId}/delete`, { method: "POST" });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (message.includes("404") || message.includes("Compte introuvable")) throw error;
    return req<{ deleted: boolean; message: string }>(`/api/users/${userId}`, { method: "DELETE" });
  }
};

// ── Exercises ─────────────────────────────────────────────────────────────────
export interface ExerciseDef {
  key: string; name: string; mode: string; default_target: number; target_label: string; met: number; touch: string;
}
export const getExercises = () =>
  req<{ exercises: ExerciseDef[]; total: number }>("/api/exercises").then((r) => r.exercises);

// ── Auto-plan ─────────────────────────────────────────────────────────────────
export interface PlanItem { key: string; name: string; mode: string; target: number; target_label: string; }
export interface AutoPlanResponse { items: PlanItem[]; estimated_sec: number; }

// POST /api/plans/auto — nécessite le profil complet
export const getAutoPlan = (profile: APIUserView["profile"]) =>
  req<AutoPlanResponse>("/api/plans/auto", {
    method: "POST",
    body: JSON.stringify({ id: profile.id, prenom: profile.prenom, age: profile.age, taille_cm: profile.taille_cm, poids_kg: profile.poids_kg, sexe: profile.sexe, niveau: profile.niveau }),
  });

// ── Sessions ──────────────────────────────────────────────────────────────────
export interface PlanExercise { cle: string; mode?: string; objectif_reps?: number; objectif_secondes?: number; }
export interface LocalProfilePayload { prenom: string; niveau: "debutant" | "intermediaire" | "avance"; }
export interface SessionCreatePayload { user_id: number; plan: PlanExercise[]; local_profile?: LocalProfilePayload; }

export interface SessionCreateResponse {
  session_id: string;
  profile?: APIUserView["profile"];
  account?: APIUserView["account"];
}

export interface LiveResponse {
  session_id: string; is_complete: boolean; elapsed_sec: number; average_fps: number;
  live_calories: number; orientation: string; coach_variant: "good" | "warn" | "bad";
  analysis: {
    message: string; voix: string | null; taux_reussite: number; angle_principal: number | null;
    repetitions_correctes: number; repetitions_invalides: number; objectif: number; mode_objectif: string;
  };
  stats: Record<string, unknown>;
  plan: {
    session_progress_pct: number; current_progress_pct: number;
    items: PlanItem[];
    next_exercise: { key: string; name: string; target_label: string } | null;
  };
  active_exercise: { key: string; name: string; mode: string };
}

export interface AnalyzePayload {
  landmarks: Record<string, { x: number; y: number; z: number; visibility: number }>;
  elapsed_sec: number; fps: number;
}

export const createSession = (p: SessionCreatePayload) =>
  req<SessionCreateResponse>("/api/sessions", { method: "POST", body: JSON.stringify(p) });
export const analyzeFrame = (sessionId: string, p: AnalyzePayload) =>
  req<LiveResponse>(`/api/sessions/${sessionId}/analyze`, { method: "POST", body: JSON.stringify(p) });

// ── Finish ────────────────────────────────────────────────────────────────────
export interface ExerciseResult {
  nom_exercice: string; reps_cibles: number; reps_realisees: number; reps_validees: number;
  duree_sec: number; calories: number; score_qualite: number; fatigue_detectee: boolean;
}
export interface FinishResponse {
  pending?: boolean;
  summary: { date: string; duree_totale_sec: number; nb_exercices: number; calories_totales: number; score_global: number; note_qualite: string; objectif_pct: number; };
  exercises: ExerciseResult[];
  exports: { csv?: string; json?: string; pdf?: string; dashboard?: string };
  warnings: string[];
  insights: Record<string, unknown>;
}
export const finishSession = (sessionId: string) =>
  req<FinishResponse>(`/api/sessions/${sessionId}/finish`, { method: "POST" });
