import {
  FilesetResolver,
  PoseLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const LANDMARK_NAMES = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
];

const REQUIRED_LANDMARK_KEYS = [
  "left_shoulder",
  "right_shoulder",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
];

const SKELETON_CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [28, 30],
  [30, 32],
];

const MODELS = {
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
};

const STORAGE_KEYS = {
  userId: "coachfit.userId",
  theme: "coachfit.theme",
};

const state = {
  bootstrap: null,
  currentUser: null,
  currentTheme: "ember",
  activeView: "home",
  authTab: "login",
  exerciseCatalog: [],
  exerciseMap: new Map(),
  planItems: [],
  sessionId: null,
  sessionLive: null,
  stream: null,
  poseLandmarker: null,
  isLive: false,
  focus: false,
  voiceEnabled: true,
  lastSpokenMessage: "",
  lastSpeechAt: 0,
  facingMode: "user",
  sessionStartedAt: 0,
  timerInterval: null,
  rafId: null,
  lastVideoTime: -1,
  inFlight: false,
  lastAnalysisAt: 0,
  localFps: 0,
  lastFrameTimestamp: 0,
  frameSamples: [],
  pendingFinish: false,
  stopping: false,
  previewExerciseKey: null,
};

const elements = {
  body: document.body,
  authShell: document.getElementById("authShell"),
  authMessage: document.getElementById("authMessage"),
  authTabs: Array.from(document.querySelectorAll("[data-auth-tab]")),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  registerForm: document.getElementById("registerForm"),
  registerFirstName: document.getElementById("registerFirstName"),
  registerEmail: document.getElementById("registerEmail"),
  registerPassword: document.getElementById("registerPassword"),
  registerAge: document.getElementById("registerAge"),
  registerHeight: document.getElementById("registerHeight"),
  registerWeight: document.getElementById("registerWeight"),
  registerSex: document.getElementById("registerSex"),
  registerLevel: document.getElementById("registerLevel"),
  registerTheme: document.getElementById("registerTheme"),
  appShell: document.getElementById("appShell"),
  navButtons: Array.from(document.querySelectorAll("[data-view]")),
  headerUserName: document.getElementById("headerUserName"),
  headerUserLevel: document.getElementById("headerUserLevel"),
  headerThemeButton: document.getElementById("headerThemeButton"),
  headerThemeDuplicate: document.getElementById("headerThemeDuplicate"),
  logoutButton: document.getElementById("logoutButton"),
  heroStartSession: document.getElementById("heroStartSession"),
  heroGoProgress: document.getElementById("heroGoProgress"),
  welcomeHeadline: document.getElementById("welcomeHeadline"),
  welcomeSubline: document.getElementById("welcomeSubline"),
  heroNextAction: document.getElementById("heroNextAction"),
  blueprintList: document.getElementById("blueprintList"),
  homeSessionsValue: document.getElementById("homeSessionsValue"),
  homeCaloriesValue: document.getElementById("homeCaloriesValue"),
  homeDurationValue: document.getElementById("homeDurationValue"),
  homeScoreValue: document.getElementById("homeScoreValue"),
  strengthList: document.getElementById("strengthList"),
  improvementList: document.getElementById("improvementList"),
  lastSessionCard: document.getElementById("lastSessionCard"),
  sessionView: document.getElementById("sessionView"),
  video: document.getElementById("cameraVideo"),
  canvas: document.getElementById("overlayCanvas"),
  stageFrame: document.getElementById("stageFrame"),
  statusChip: document.getElementById("statusChip"),
  timerChip: document.getElementById("timerChip"),
  progressChip: document.getElementById("progressChip"),
  focusChip: document.getElementById("focusChip"),
  stageTitle: document.getElementById("stageTitle"),
  lightPill: document.getElementById("lightPill"),
  framePill: document.getElementById("framePill"),
  fpsPill: document.getElementById("fpsPill"),
  stageNotice: document.getElementById("stageNotice"),
  coachLine: document.getElementById("coachLine"),
  coachHint: document.getElementById("coachHint"),
  coachCard: document.getElementById("coachCard"),
  coachMessage: document.getElementById("coachMessage"),
  coachSub: document.getElementById("coachSub"),
  qualityRing: document.getElementById("qualityRing"),
  qualityValue: document.getElementById("qualityValue"),
  objectiveValue: document.getElementById("objectiveValue"),
  validRepsValue: document.getElementById("validRepsValue"),
  invalidRepsValue: document.getElementById("invalidRepsValue"),
  orientationValue: document.getElementById("orientationValue"),
  angleValue: document.getElementById("angleValue"),
  caloriesValue: document.getElementById("caloriesValue"),
  sessionProgressBar: document.getElementById("sessionProgressBar"),
  sessionProgressValue: document.getElementById("sessionProgressValue"),
  startButtons: [
    document.getElementById("startButton"),
    document.getElementById("dockStartButton"),
  ],
  stopButtons: [
    document.getElementById("stopButton"),
    document.getElementById("dockStopButton"),
  ],
  focusButtons: [
    document.getElementById("focusButton"),
    document.getElementById("dockFocusButton"),
  ],
  voiceButtons: [
    document.getElementById("voiceButton"),
    document.getElementById("dockVoiceButton"),
    document.getElementById("settingsVoiceButton"),
  ],
  settingsFocusButton: document.getElementById("settingsFocusButton"),
  settingsGoSessionButton: document.getElementById("settingsGoSessionButton"),
  settingsLogoutButton: document.getElementById("settingsLogoutButton"),
  cameraFacingSelect: document.getElementById("cameraFacingSelect"),
  saveProfileButton: document.getElementById("saveProfileButton"),
  autoPlanButton: document.getElementById("autoPlanButton"),
  selectAllButton: document.getElementById("selectAllButton"),
  clearPlanButton: document.getElementById("clearPlanButton"),
  exercisePicker: document.getElementById("exercisePicker"),
  planComposer: document.getElementById("planComposer"),
  estimatedTimeValue: document.getElementById("estimatedTimeValue"),
  firstNameInput: document.getElementById("firstNameInput"),
  ageInput: document.getElementById("ageInput"),
  heightInput: document.getElementById("heightInput"),
  weightInput: document.getElementById("weightInput"),
  sexInput: document.getElementById("sexInput"),
  levelInput: document.getElementById("levelInput"),
  profileEmailValue: document.getElementById("profileEmailValue"),
  imcValue: document.getElementById("imcValue"),
  tdeeValue: document.getElementById("tdeeValue"),
  hrValue: document.getElementById("hrValue"),
  sessionsTotalValue: document.getElementById("sessionsTotalValue"),
  caloriesTotalValue: document.getElementById("caloriesTotalValue"),
  durationTotalValue: document.getElementById("durationTotalValue"),
  scoreTotalValue: document.getElementById("scoreTotalValue"),
  progressChart: document.getElementById("progressChart"),
  qualityChart: document.getElementById("qualityChart"),
  recentSessions: document.getElementById("recentSessions"),
  themeGrid: document.getElementById("themeGrid"),
  summarySheet: document.getElementById("summarySheet"),
  summaryBackdrop: document.getElementById("summaryBackdrop"),
  closeSummaryButton: document.getElementById("closeSummaryButton"),
  summaryMetrics: document.getElementById("summaryMetrics"),
  summaryWarnings: document.getElementById("summaryWarnings"),
  summaryExports: document.getElementById("summaryExports"),
  summaryExercises: document.getElementById("summaryExercises"),
};

const overlayContext = elements.canvas.getContext("2d");
const lightCanvas = document.createElement("canvas");
lightCanvas.width = 24;
lightCanvas.height = 14;
const lightContext = lightCanvas.getContext("2d", { willReadFrequently: true });

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  boot().catch((error) => {
    console.error(error);
    setAuthMessage("Impossible de charger l application. Relance le serveur puis reessaie.");
  });
});

function bindEvents() {
  elements.authTabs.forEach((button) => button.addEventListener("click", () => setAuthTab(button.dataset.authTab)));
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.registerForm.addEventListener("submit", handleRegisterSubmit);
  elements.navButtons.forEach((button) => button.addEventListener("click", () => setActiveView(button.dataset.view)));
  elements.headerThemeButton.addEventListener("click", () => setActiveView("settings"));
  elements.headerThemeDuplicate.addEventListener("click", () => setActiveView("settings"));
  elements.logoutButton.addEventListener("click", logout);
  elements.heroStartSession.addEventListener("click", () => {
    setActiveView("session");
    startSession();
  });
  elements.heroGoProgress.addEventListener("click", () => setActiveView("progress"));
  elements.startButtons.forEach((button) => button.addEventListener("click", startSession));
  elements.stopButtons.forEach((button) => button.addEventListener("click", () => stopSession({ auto: false })));
  elements.focusButtons.forEach((button) => button.addEventListener("click", toggleFocus));
  elements.voiceButtons.forEach((button) => button?.addEventListener("click", toggleVoice));
  elements.settingsFocusButton.addEventListener("click", () => {
    setActiveView("session");
    setFocus(true);
  });
  elements.settingsGoSessionButton.addEventListener("click", () => setActiveView("session"));
  elements.settingsLogoutButton.addEventListener("click", logout);
  elements.cameraFacingSelect.addEventListener("change", handleFacingModeChange);
  elements.saveProfileButton.addEventListener("click", saveProfile);
  elements.autoPlanButton.addEventListener("click", refreshAutoPlan);
  elements.selectAllButton.addEventListener("click", selectAllExercises);
  elements.clearPlanButton.addEventListener("click", clearPlan);
  elements.exercisePicker.addEventListener("click", handleExercisePickerClick);
  elements.planComposer.addEventListener("click", handlePlanComposerClick);
  elements.planComposer.addEventListener("input", handlePlanComposerInput);
  elements.levelInput.addEventListener("change", updateDerivedMetrics);
  elements.sexInput.addEventListener("change", updateDerivedMetrics);
  elements.ageInput.addEventListener("input", updateDerivedMetrics);
  elements.heightInput.addEventListener("input", updateDerivedMetrics);
  elements.weightInput.addEventListener("input", updateDerivedMetrics);
  elements.firstNameInput.addEventListener("input", updateDerivedMetrics);
  elements.summaryBackdrop.addEventListener("click", closeSummary);
  elements.closeSummaryButton.addEventListener("click", closeSummary);
  elements.themeGrid.addEventListener("click", handleThemeGridClick);
  window.addEventListener("resize", resizeCanvasToVideo);
}

async function boot() {
  const bootstrap = await apiFetch("/api/bootstrap");
  state.bootstrap = bootstrap;
  state.exerciseCatalog = bootstrap.exercises ?? [];
  state.exerciseMap = new Map(state.exerciseCatalog.map((exercise) => [exercise.key, exercise]));
  renderThemeSelect(bootstrap.themes ?? []);
  renderThemeGrid(bootstrap.themes ?? []);
  setPlanFromSerialized(bootstrap.default_plan?.items ?? []);
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || "ember", false);
  updateFocusUi();
  updateVoiceUi();
  setButtonsState(false);
  updateDerivedMetrics();

  const storedUserId = localStorage.getItem(STORAGE_KEYS.userId);
  if (storedUserId) {
    try {
      const overview = await apiFetch(`/api/users/${storedUserId}/overview`);
      hydrateAuthenticatedApp(overview, { preservePlan: false });
      return;
    } catch (error) {
      console.error(error);
      localStorage.removeItem(STORAGE_KEYS.userId);
    }
  }

  showAuth();
}

async function apiFetch(url, options = {}) {
  const requestOptions = { ...options };
  requestOptions.headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, requestOptions);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Une erreur est survenue.";
    throw new Error(detail);
  }
  return data;
}

function setAuthTab(tab) {
  state.authTab = tab === "register" ? "register" : "login";
  elements.authTabs.forEach((button) => button.classList.toggle("active", button.dataset.authTab === state.authTab));
  elements.loginForm.hidden = state.authTab !== "login";
  elements.registerForm.hidden = state.authTab !== "register";
  setAuthMessage(
    state.authTab === "login"
      ? "Connecte-toi pour retrouver ton studio."
      : "Cree ton compte pour acceder a ton espace d entrainement.",
  );
}

function setAuthMessage(message) {
  elements.authMessage.textContent = message;
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  try {
    setAuthMessage("Connexion en cours...");
    const payload = {
      email: elements.loginEmail.value.trim(),
      mot_de_passe: elements.loginPassword.value,
    };
    const overview = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    hydrateAuthenticatedApp(overview, { preservePlan: false });
    setAuthMessage("Connexion reussie.");
  } catch (error) {
    console.error(error);
    setAuthMessage(error.message);
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  try {
    setAuthMessage("Creation du compte en cours...");
    const payload = {
      prenom: elements.registerFirstName.value.trim(),
      email: elements.registerEmail.value.trim(),
      mot_de_passe: elements.registerPassword.value,
      age: Number(elements.registerAge.value || 24),
      taille_cm: Number(elements.registerHeight.value || 170),
      poids_kg: Number(elements.registerWeight.value || 70),
      sexe: elements.registerSex.value,
      niveau: elements.registerLevel.value,
      theme: elements.registerTheme.value || "ember",
    };
    const overview = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    hydrateAuthenticatedApp(overview, { preservePlan: false });
    setAuthMessage("Compte cree avec succes.");
  } catch (error) {
    console.error(error);
    setAuthMessage(error.message);
  }
}

function hydrateAuthenticatedApp(overview, { preservePlan }) {
  state.currentUser = overview;
  localStorage.setItem(STORAGE_KEYS.userId, String(overview.profile.id));
  applyTheme(overview.account?.theme || state.currentTheme, true);
  fillProfileForm(overview.profile, overview.account);
  renderOverview(overview);
  if (!preservePlan) {
    refreshAutoPlan().catch((error) => console.error(error));
  }
  showApp();
}

function showAuth() {
  elements.authShell.hidden = false;
  elements.appShell.hidden = true;
  setAuthTab("login");
}

function showApp() {
  elements.authShell.hidden = true;
  elements.appShell.hidden = false;
  setActiveView("home");
}

function setActiveView(view) {
  state.activeView = view;
  if (view !== "session" && state.focus) {
    setFocus(false);
  }
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}View`));
  elements.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
}

function renderThemeSelect(themes) {
  elements.registerTheme.innerHTML = themes
    .map((theme) => `<option value="${theme.key}">${escapeHtml(theme.label)}</option>`)
    .join("");
}

function renderThemeGrid(themes) {
  elements.themeGrid.innerHTML = themes
    .map((theme) => {
      return `
        <button class="theme-card ${theme.key === state.currentTheme ? "active" : ""}" type="button" data-theme-key="${theme.key}">
          <div class="theme-preview ${theme.key}"></div>
          <strong>${escapeHtml(theme.label)}</strong>
          <span>${escapeHtml(theme.description)}</span>
        </button>
      `;
    })
    .join("");
}

function handleThemeGridClick(event) {
  const button = event.target.closest("[data-theme-key]");
  if (!button) {
    return;
  }
  updateTheme(button.dataset.themeKey).catch((error) => {
    console.error(error);
    setCoachMessage("Impossible de changer le theme.", error.message, "warn");
  });
}

async function updateTheme(themeKey) {
  applyTheme(themeKey, true);
  if (!state.currentUser?.profile?.id) {
    return;
  }
  const overview = await apiFetch(`/api/users/${state.currentUser.profile.id}/theme`, {
    method: "PATCH",
    body: JSON.stringify({ theme: themeKey }),
  });
  state.currentUser = overview;
  renderOverview(overview);
}

function applyTheme(themeKey, persist) {
  const theme = themeKey || "ember";
  state.currentTheme = theme;
  elements.body.dataset.theme = theme;
  if (persist) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }
  renderThemeGrid(state.bootstrap?.themes ?? []);
}

function fillProfileForm(profile, account) {
  elements.firstNameInput.value = profile.prenom ?? "Coach";
  elements.ageInput.value = profile.age ?? 24;
  elements.heightInput.value = profile.taille_cm ?? 170;
  elements.weightInput.value = profile.poids_kg ?? 70;
  elements.sexInput.value = profile.sexe ?? "M";
  elements.levelInput.value = profile.niveau ?? "debutant";
  elements.profileEmailValue.textContent = account?.email ?? "-";
  updateDerivedMetrics();
}

function collectProfilePayload() {
  return {
    id: state.currentUser?.profile?.id ?? null,
    prenom: elements.firstNameInput.value.trim() || "Coach",
    age: Number(elements.ageInput.value || 24),
    taille_cm: Number(elements.heightInput.value || 170),
    poids_kg: Number(elements.weightInput.value || 70),
    sexe: elements.sexInput.value,
    niveau: elements.levelInput.value,
  };
}

function updateDerivedMetrics() {
  const profile = collectProfilePayload();
  const tailleM = profile.taille_cm > 0 ? profile.taille_cm / 100 : 0;
  const imc = tailleM > 0 ? profile.poids_kg / (tailleM * tailleM) : 0;
  const fcMax = Math.max(0, 220 - profile.age);

  let bmr = 0;
  if (String(profile.sexe).toUpperCase().startsWith("F")) {
    bmr = 447.593 + (9.247 * profile.poids_kg) + (3.098 * profile.taille_cm) - (4.33 * profile.age);
  } else {
    bmr = 88.362 + (13.397 * profile.poids_kg) + (4.799 * profile.taille_cm) - (5.677 * profile.age);
  }

  const factors = {
    debutant: 1.2,
    intermediaire: 1.375,
    avance: 1.55,
  };
  const tdee = bmr * (factors[profile.niveau] ?? 1.2);

  elements.imcValue.textContent = Number.isFinite(imc) ? imc.toFixed(1) : "0.0";
  elements.tdeeValue.textContent = Number.isFinite(tdee) ? String(Math.round(tdee)) : "0";
  elements.hrValue.textContent = String(fcMax);
}

async function saveProfile() {
  if (!state.currentUser?.profile?.id) {
    return;
  }

  try {
    const overview = await apiFetch(`/api/users/${state.currentUser.profile.id}/profile`, {
      method: "PUT",
      body: JSON.stringify(collectProfilePayload()),
    });
    state.currentUser = overview;
    fillProfileForm(overview.profile, overview.account);
    renderOverview(overview);
    await refreshAutoPlan();
    setCoachMessage("Profil mis a jour.", "Les metriques et recommandations ont ete rafraichies.", "good");
  } catch (error) {
    console.error(error);
    setCoachMessage("Impossible de mettre a jour le profil.", error.message, "warn");
  }
}

function renderOverview(overview) {
  state.currentUser = overview;
  elements.headerUserName.textContent = overview.profile.prenom;
  elements.headerUserLevel.textContent = overview.profile.niveau;
  renderHome(overview.home ?? {}, overview.insights ?? {});
  renderProgress(overview.insights ?? {});
  fillProfileForm(overview.profile, overview.account);
}

function renderHome(home, insights) {
  elements.welcomeHeadline.textContent = home.welcome?.headline ?? "Bienvenue";
  elements.welcomeSubline.textContent = home.welcome?.subline ?? "Ton espace de coaching est pret.";
  elements.heroNextAction.textContent = home.welcome?.next_action ?? "Prepare ta prochaine seance.";
  elements.homeSessionsValue.textContent = String(insights.totals?.sessions ?? 0);
  elements.homeCaloriesValue.textContent = formatNumber(insights.totals?.calories_14d ?? 0, 0);
  elements.homeDurationValue.textContent = formatDurationShort(insights.totals?.duration_14d_sec ?? 0);
  elements.homeScoreValue.textContent = formatNumber(insights.totals?.avg_score ?? 0, 0);
  renderBlueprint(home.blueprint ?? []);
  renderStrengths(home.strengths ?? []);
  renderImprovements(home.improvements ?? []);
  renderLastSession(home.latest_session);
}

function renderBlueprint(items) {
  if (!items.length) {
    elements.blueprintList.innerHTML = `<div class="session-row"><strong>Plan suggere</strong><span>Un plan automatique sera propose apres mise a jour du profil.</span></div>`;
    return;
  }

  elements.blueprintList.innerHTML = items
    .map((item) => {
      return `
        <div class="blueprint-row">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.target_label)}</span>
        </div>
      `;
    })
    .join("");
}

function renderStrengths(items) {
  if (!items.length) {
    elements.strengthList.innerHTML = `<div class="stack-item"><strong>Aucune donnee encore</strong><span>Termine une seance pour faire ressortir tes points forts.</span></div>`;
    return;
  }

  elements.strengthList.innerHTML = items
    .map((item) => {
      return `<div class="stack-item"><strong>${escapeHtml(item.exercise)}</strong><span>Score moyen ${formatNumber(item.score, 0)}%</span></div>`;
    })
    .join("");
}

function renderImprovements(items) {
  if (!items.length) {
    elements.improvementList.innerHTML = `<div class="stack-item"><strong>Tout est propre pour l instant</strong><span>Les futurs axes d amelioration apparaitront ici.</span></div>`;
    return;
  }

  elements.improvementList.innerHTML = items
    .map((item) => {
      return `<div class="stack-item"><strong>${escapeHtml(item.exercise)} • ${formatNumber(item.score, 0)}%</strong><span>${escapeHtml(item.tip)}</span></div>`;
    })
    .join("");
}

function renderLastSession(session) {
  if (!session) {
    elements.lastSessionCard.innerHTML = `<div class="session-row"><strong>Aucune seance recente</strong><span>Lance une seance pour voir un recap ici.</span></div>`;
    return;
  }
  elements.lastSessionCard.innerHTML = `
    <div class="session-row">
      <strong>${escapeHtml(formatDateTime(session.date))} • ${escapeHtml(session.note)}</strong>
      <span>${formatDuration(session.duration_sec)} • ${formatNumber(session.calories, 1)} kcal • score ${formatNumber(session.score, 0)}</span>
    </div>
  `;
}

function renderProgress(insights) {
  elements.sessionsTotalValue.textContent = String(insights.totals?.sessions ?? 0);
  elements.caloriesTotalValue.textContent = formatNumber(insights.totals?.calories_14d ?? 0, 0);
  elements.durationTotalValue.textContent = formatDurationShort(insights.totals?.duration_14d_sec ?? 0);
  elements.scoreTotalValue.textContent = formatNumber(insights.totals?.avg_score ?? 0, 0);
  renderBarChart(
    elements.progressChart,
    insights.progression ?? [],
    (item) => item.calories,
    (item) => formatDay(item.date),
    (item) => `${formatNumber(item.calories, 0)} kcal`,
  );
  renderBarChart(
    elements.qualityChart,
    insights.quality ?? [],
    (item) => item.score,
    (item) => item.exercise,
    (item) => `${formatNumber(item.score, 0)}%`,
  );
  renderRecentSessions(insights.recent_sessions ?? []);
}

function renderBarChart(container, items, valueAccessor, labelAccessor, valueLabelAccessor) {
  if (!items.length) {
    container.innerHTML = `<div class="session-row"><strong>Aucune donnee</strong><span>Les prochaines seances rempliront cette vue.</span></div>`;
    return;
  }

  const maxValue = Math.max(...items.map((item) => Number(valueAccessor(item) || 0)), 1);
  container.innerHTML = items
    .map((item) => {
      const rawValue = Number(valueAccessor(item) || 0);
      const pct = Math.max(4, (rawValue / maxValue) * 100);
      return `
        <div class="bar-row">
          <div class="bar-row-label">
            <span>${escapeHtml(labelAccessor(item))}</span>
            <strong>${escapeHtml(valueLabelAccessor(item))}</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRecentSessions(items) {
  if (!items.length) {
    elements.recentSessions.innerHTML = `<div class="session-row"><strong>Aucune seance recente</strong><span>Ton historique apparaitra ici apres ta premiere session.</span></div>`;
    return;
  }

  elements.recentSessions.innerHTML = items
    .map((item) => {
      return `
        <div class="session-row">
          <strong>${escapeHtml(formatDateTime(item.date))} • ${escapeHtml(item.note)}</strong>
          <span>${formatDuration(item.duration_sec)} • ${formatNumber(item.calories, 1)} kcal • score ${formatNumber(item.score, 0)}</span>
        </div>
      `;
    })
    .join("");
}

async function refreshAutoPlan() {
  const profile = collectProfilePayload();
  const result = await apiFetch("/api/plans/auto", {
    method: "POST",
    body: JSON.stringify(profile),
  });
  setPlanFromSerialized(result.items ?? []);
  setNotice(`Plan automatique charge. Temps estime: ${formatDuration(result.estimated_sec ?? 0)}.`);
}

function setPlanFromSerialized(items) {
  state.planItems = items.map((item) => ({
    key: item.key,
    name: item.name ?? state.exerciseMap.get(item.key)?.name ?? item.key,
    mode: item.mode ?? state.exerciseMap.get(item.key)?.mode ?? "reps",
    target: Number(item.target ?? state.exerciseMap.get(item.key)?.default_target ?? 10),
  }));
  state.previewExerciseKey = state.planItems[0]?.key ?? null;
  renderExercisePicker();
  renderPlanComposer();
  syncStagePreviewTitle();
}

function selectAllExercises() {
  const items = state.exerciseCatalog.map((exercise) => ({
    key: exercise.key,
    name: exercise.name,
    mode: exercise.mode,
    target: exercise.default_target,
  }));
  setPlanFromSerialized(items);
  setNotice("Tous les exercices ont ete ajoutes au plan.");
}

function clearPlan() {
  state.planItems = [];
  state.previewExerciseKey = null;
  renderExercisePicker();
  renderPlanComposer();
  syncStagePreviewTitle();
  setNotice("Le plan est vide. Ajoute des exercices ou utilise le plan auto.");
}

function renderExercisePicker() {
  elements.exercisePicker.innerHTML = state.exerciseCatalog
    .map((exercise) => {
      const active = state.planItems.some((item) => item.key === exercise.key) ? "active" : "";
      return `<button class="exercise-pill ${active}" type="button" data-key="${exercise.key}">${escapeHtml(exercise.name)}</button>`;
    })
    .join("");
}

function renderPlanComposer() {
  elements.estimatedTimeValue.textContent = `Temps estime: ${formatDuration(getPlanEstimateSec())}`;

  if (!state.planItems.length) {
    elements.planComposer.innerHTML = `<div class="session-row"><strong>Plan vide</strong><span>Selectionne tes exercices ou active le plan automatique.</span></div>`;
    return;
  }

  const sessionPlanMap = new Map((state.sessionLive?.plan?.items ?? []).map((item) => [item.key, item]));
  elements.planComposer.innerHTML = state.planItems
    .map((item, index) => {
      const sessionItem = sessionPlanMap.get(item.key);
      const stateClass = sessionItem?.is_active ? "active" : sessionItem?.is_complete ? "complete" : "";
      return `
        <div class="plan-editor-card ${stateClass}" data-key="${item.key}">
          <div class="plan-editor-top">
            <div class="plan-editor-main">
              <div class="plan-order">${index + 1}</div>
              <div class="plan-copy">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.mode === "time" ? "Maintien" : "Repetitions")}</span>
              </div>
            </div>
            <input
              class="target-input"
              type="number"
              min="${item.mode === "time" ? 5 : 1}"
              max="${item.mode === "time" ? 1800 : 200}"
              step="1"
              value="${item.target}"
              data-role="target"
              data-key="${item.key}"
              aria-label="Cible ${escapeHtml(item.name)}"
            >
          </div>
          <div class="plan-editor-bottom">
            <span class="plan-estimate">${escapeHtml(formatPlanTarget(item))}</span>
            <div class="order-buttons">
              <button class="ghost small" type="button" data-action="up" data-key="${item.key}" aria-label="Monter">↑</button>
              <button class="ghost small" type="button" data-action="down" data-key="${item.key}" aria-label="Descendre">↓</button>
              <button class="ghost small" type="button" data-action="preview" data-key="${item.key}" aria-label="Voir">Voir</button>
              <button class="ghost small" type="button" data-action="remove" data-key="${item.key}" aria-label="Retirer">✕</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function handleExercisePickerClick(event) {
  const button = event.target.closest("[data-key]");
  if (!button) {
    return;
  }
  const key = button.dataset.key;
  const existingIndex = state.planItems.findIndex((item) => item.key === key);
  if (existingIndex >= 0) {
    state.planItems.splice(existingIndex, 1);
    if (state.previewExerciseKey === key) {
      state.previewExerciseKey = state.planItems[0]?.key ?? null;
    }
  } else {
    const exercise = state.exerciseMap.get(key);
    if (!exercise) {
      return;
    }
    state.planItems.push({
      key: exercise.key,
      name: exercise.name,
      mode: exercise.mode,
      target: exercise.default_target,
    });
    state.previewExerciseKey = key;
  }
  renderExercisePicker();
  renderPlanComposer();
  syncStagePreviewTitle();
}

function handlePlanComposerClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const key = button.dataset.key;
  const action = button.dataset.action;
  const index = state.planItems.findIndex((item) => item.key === key);
  if (index < 0) {
    return;
  }

  if (action === "up" && index > 0) {
    [state.planItems[index - 1], state.planItems[index]] = [state.planItems[index], state.planItems[index - 1]];
  } else if (action === "down" && index < state.planItems.length - 1) {
    [state.planItems[index + 1], state.planItems[index]] = [state.planItems[index], state.planItems[index + 1]];
  } else if (action === "remove") {
    state.planItems.splice(index, 1);
  } else if (action === "preview") {
    state.previewExerciseKey = key;
    if (state.isLive && state.sessionId) {
      changeActiveExercise(key).catch((error) => {
        console.error(error);
        setCoachMessage("Impossible de changer d exercice.", error.message, "warn");
      });
    }
  }

  if (state.previewExerciseKey && !state.planItems.some((item) => item.key === state.previewExerciseKey)) {
    state.previewExerciseKey = state.planItems[0]?.key ?? null;
  }

  renderExercisePicker();
  renderPlanComposer();
  syncStagePreviewTitle();
}

function handlePlanComposerInput(event) {
  const input = event.target.closest("input[data-role='target']");
  if (!input) {
    return;
  }

  const key = input.dataset.key;
  const item = state.planItems.find((entry) => entry.key === key);
  if (!item) {
    return;
  }

  const value = Number(input.value || item.target || 1);
  item.target = Math.max(item.mode === "time" ? 5 : 1, Math.round(value));
  elements.estimatedTimeValue.textContent = `Temps estime: ${formatDuration(getPlanEstimateSec())}`;
}

function getPlanEstimateSec() {
  return state.planItems.reduce((total, item) => {
    if (item.mode === "time") {
      return total + item.target;
    }
    const perRep = item.key === "mountain_climber" ? 2.2 : 3.0;
    return total + (item.target * perRep);
  }, 0);
}

function getSessionPlanPayload() {
  return state.planItems.map((item) => ({
    cle: item.key,
    mode: item.mode,
    objectif_reps: item.mode === "time" ? null : item.target,
    objectif_secondes: item.mode === "time" ? item.target : null,
  }));
}

function syncStagePreviewTitle() {
  if (state.isLive && state.sessionLive?.active_exercise?.name) {
    elements.stageTitle.textContent = state.sessionLive.active_exercise.name;
    return;
  }

  if (state.previewExerciseKey) {
    const exercise = state.exerciseMap.get(state.previewExerciseKey);
    if (exercise) {
      elements.stageTitle.textContent = exercise.name;
      return;
    }
  }

  elements.stageTitle.textContent = "Studio pret";
}

async function startSession() {
  if (state.isLive || !state.currentUser?.profile?.id) {
    return;
  }

  try {
    closeSummary();
    setActiveView("session");
    setNotice("Preparation de la session...");
    if (!state.planItems.length) {
      await refreshAutoPlan();
    }

    await initializeVision();
    await ensureCamera();

    const session = await apiFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        user_id: state.currentUser.profile.id,
        plan: getSessionPlanPayload(),
      }),
    });

    state.sessionId = session.session_id;
    state.isLive = true;
    state.pendingFinish = false;
    state.sessionStartedAt = performance.now();
    state.sessionLive = session.live;
    state.lastAnalysisAt = 0;
    state.lastVideoTime = -1;
    state.frameSamples = [];
    state.localFps = 0;
    state.lastFrameTimestamp = 0;
    setStatus("live", true);
    setButtonsState(true);
    setNotice("Session live active.");
    setCoachMessage("Session lancee.", "Reste visible de la tete aux pieds et suis les retours du coach.", "good");
    updateLivePayload(session.live);
    startTimer();
    startDetectionLoop();

    if (window.innerWidth <= 820) {
      setFocus(true);
    }
  } catch (error) {
    console.error(error);
    setStatus("erreur", false);
    setCoachMessage("Impossible de demarrer.", error.message, "bad");
  }
}

async function stopSession({ auto }) {
  if (state.stopping) {
    return;
  }

  state.stopping = true;
  let summary = null;

  try {
    if (state.sessionId) {
      setNotice(auto ? "Finalisation automatique..." : "Finalisation de la seance...");
      summary = await apiFetch(`/api/sessions/${state.sessionId}/finish`, {
        method: "POST",
      });
    }
  } catch (error) {
    console.error(error);
    setCoachMessage("La finalisation a rencontre un probleme.", error.message, "warn");
  } finally {
    state.sessionId = null;
    state.isLive = false;
    state.pendingFinish = false;
    stopDetectionLoop();
    stopTimer();
    stopCameraStream();
    state.sessionStartedAt = 0;
    setButtonsState(false);
    setStatus(auto ? "terminee" : "stoppee", false);
    elements.fpsPill.textContent = "FPS: --";
    elements.framePill.textContent = "Cadre: attente";
    elements.framePill.className = "pill warn";
    elements.lightPill.textContent = "Lumiere: attente";
    elements.lightPill.className = "pill warn";
    elements.progressChip.textContent = "Progression: 0%";
    elements.sessionProgressBar.style.width = "0%";
    elements.sessionProgressValue.textContent = "0%";
    state.sessionLive = null;
    syncStagePreviewTitle();
    state.stopping = false;
  }

  if (summary) {
    renderSummary(summary);
    if (summary.insights) {
      renderProgress(summary.insights);
    }
    if (summary.home) {
      renderHome(summary.home, summary.insights ?? {});
    }
    setCoachMessage("Seance terminee.", "Le resume complet et les exports sont prets.", "good");
    setNotice("Seance terminee. Resume disponible.");
    setActiveView("home");
  }
}

async function logout() {
  if (state.isLive) {
    await stopSession({ auto: false });
  }
  localStorage.removeItem(STORAGE_KEYS.userId);
  state.currentUser = null;
  setFocus(false);
  showAuth();
}

async function changeActiveExercise(key) {
  if (!state.sessionId) {
    return;
  }

  const live = await apiFetch(`/api/sessions/${state.sessionId}/active-exercise`, {
    method: "POST",
    body: JSON.stringify({
      exercise_key: key,
      elapsed_sec: getElapsedSeconds(),
    }),
  });
  updateLivePayload(live);
}

async function initializeVision() {
  if (state.poseLandmarker) {
    return;
  }

  setNotice("Chargement du moteur de posture...");
  const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
  const modelPath = shouldUseLiteModel() ? MODELS.lite : MODELS.full;
  const vision = await FilesetResolver.forVisionTasks(wasmPath);

  try {
    state.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  } catch (error) {
    state.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }
}

function shouldUseLiteModel() {
  const shortestSide = Math.min(window.innerWidth, window.innerHeight);
  const memory = navigator.deviceMemory ?? 4;
  return shortestSide < 900 || memory <= 4;
}

async function ensureCamera() {
  if (state.stream) {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Le navigateur ne supporte pas l acces camera.");
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: state.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });
    elements.video.srcObject = state.stream;
    await elements.video.play();
    resizeCanvasToVideo();
    elements.stageFrame.classList.toggle("is-mirrored", state.facingMode === "user");
  } catch (error) {
    const insecure = location.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(location.hostname);
    if (insecure) {
      throw new Error("La camera web demande un site securise sur mobile. Utilise localhost ou HTTPS.");
    }
    throw new Error("Acces camera refuse ou indisponible.");
  }
}

function stopCameraStream() {
  if (!state.stream) {
    return;
  }

  for (const track of state.stream.getTracks()) {
    track.stop();
  }
  state.stream = null;
  elements.video.srcObject = null;
  clearOverlay();
}

async function handleFacingModeChange(event) {
  state.facingMode = event.target.value;
  if (!state.stream) {
    elements.stageFrame.classList.toggle("is-mirrored", state.facingMode === "user");
    return;
  }
  const keepLive = state.isLive;
  stopCameraStream();
  await ensureCamera();
  if (keepLive) {
    setNotice("Camera basculee pendant la session.");
  }
}

function startDetectionLoop() {
  stopDetectionLoop();
  state.rafId = window.requestAnimationFrame(processFrame);
}

function stopDetectionLoop() {
  if (state.rafId) {
    window.cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  state.lastFrameTimestamp = 0;
  state.inFlight = false;
}

async function processFrame(timestamp) {
  if (!state.isLive) {
    return;
  }

  state.rafId = window.requestAnimationFrame(processFrame);

  if (!state.poseLandmarker || !state.stream || elements.video.readyState < 2) {
    return;
  }

  if (state.lastFrameTimestamp) {
    const instantFps = 1000 / Math.max(timestamp - state.lastFrameTimestamp, 1);
    state.frameSamples.push(instantFps);
    if (state.frameSamples.length > 24) {
      state.frameSamples.shift();
    }
    state.localFps = average(state.frameSamples);
    elements.fpsPill.textContent = `FPS: ${formatNumber(state.localFps, 0)}`;
  }
  state.lastFrameTimestamp = timestamp;

  if (elements.video.currentTime === state.lastVideoTime) {
    return;
  }
  state.lastVideoTime = elements.video.currentTime;

  const result = state.poseLandmarker.detectForVideo(elements.video, performance.now());
  const pose = result?.landmarks?.[0] ?? null;
  drawPose(pose);
  updateFrameQuality(pose);
  updateLightStatus();

  if (!state.sessionId || state.inFlight || timestamp - state.lastAnalysisAt < 120) {
    return;
  }

  state.lastAnalysisAt = timestamp;
  state.inFlight = true;

  try {
    const live = await apiFetch(`/api/sessions/${state.sessionId}/analyze`, {
      method: "POST",
      body: JSON.stringify({
        landmarks: buildLandmarkPayload(pose),
        elapsed_sec: getElapsedSeconds(),
        fps: state.localFps,
      }),
    });
    updateLivePayload(live);
    if (live.is_complete && !state.pendingFinish) {
      state.pendingFinish = true;
      window.setTimeout(() => stopSession({ auto: true }), 800);
    }
  } catch (error) {
    console.error(error);
    setCoachMessage("Le flux live a ete interrompu.", error.message, "warn");
  } finally {
    state.inFlight = false;
  }
}

function buildLandmarkPayload(pose) {
  if (!pose) {
    return {};
  }

  const payload = {};
  for (let index = 0; index < LANDMARK_NAMES.length; index += 1) {
    const name = LANDMARK_NAMES[index];
    if (!REQUIRED_LANDMARK_KEYS.includes(name)) {
      continue;
    }
    const point = pose[index];
    if (!point) {
      continue;
    }
    payload[name] = {
      x: point.x,
      y: point.y,
      z: point.z ?? 0,
      visibility: point.visibility ?? 0,
    };
  }
  return payload;
}

function drawPose(pose) {
  resizeCanvasToVideo();
  clearOverlay();
  if (!pose || !elements.canvas.width || !elements.canvas.height) {
    return;
  }

  const width = elements.canvas.width;
  const height = elements.canvas.height;
  const color = getFeedbackColor();

  overlayContext.save();
  overlayContext.lineWidth = Math.max(4, width / 280);
  overlayContext.lineCap = "round";
  overlayContext.strokeStyle = color.line;
  overlayContext.fillStyle = color.point;
  overlayContext.shadowBlur = 20;
  overlayContext.shadowColor = color.glow;

  for (const [start, end] of SKELETON_CONNECTIONS) {
    const pointA = pose[start];
    const pointB = pose[end];
    if (!pointA || !pointB) {
      continue;
    }
    if ((pointA.visibility ?? 0) < 0.35 || (pointB.visibility ?? 0) < 0.35) {
      continue;
    }
    overlayContext.beginPath();
    overlayContext.moveTo(pointA.x * width, pointA.y * height);
    overlayContext.lineTo(pointB.x * width, pointB.y * height);
    overlayContext.stroke();
  }

  for (const point of pose) {
    if ((point.visibility ?? 0) < 0.35) {
      continue;
    }
    overlayContext.beginPath();
    overlayContext.arc(point.x * width, point.y * height, Math.max(4, width / 240), 0, Math.PI * 2);
    overlayContext.fill();
  }

  overlayContext.restore();
}

function clearOverlay() {
  overlayContext.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
}

function resizeCanvasToVideo() {
  const width = elements.video.videoWidth || 1280;
  const height = elements.video.videoHeight || 720;
  if (elements.canvas.width !== width) {
    elements.canvas.width = width;
  }
  if (elements.canvas.height !== height) {
    elements.canvas.height = height;
  }
}

function getFeedbackColor() {
  const variant = state.sessionLive?.coach_variant ?? "warn";
  if (variant === "good") {
    return {
      line: "rgba(46, 212, 122, 0.95)",
      point: "rgba(200, 255, 223, 0.95)",
      glow: "rgba(46, 212, 122, 0.28)",
    };
  }
  if (variant === "bad") {
    return {
      line: "rgba(255, 101, 101, 0.95)",
      point: "rgba(255, 206, 206, 0.95)",
      glow: "rgba(255, 101, 101, 0.24)",
    };
  }
  return {
    line: "rgba(255, 209, 102, 0.95)",
    point: "rgba(255, 240, 198, 0.95)",
    glow: "rgba(255, 209, 102, 0.24)",
  };
}

function updateFrameQuality(pose) {
  if (!pose) {
    elements.framePill.textContent = "Cadre: aucun corps";
    elements.framePill.className = "pill warn";
    return;
  }

  const visiblePoints = pose.filter((point) => (point.visibility ?? 0) >= 0.5);
  if (!visiblePoints.length) {
    elements.framePill.textContent = "Cadre: instable";
    elements.framePill.className = "pill warn";
    return;
  }
  const minX = Math.min(...visiblePoints.map((point) => point.x));
  const maxX = Math.max(...visiblePoints.map((point) => point.x));
  const minY = Math.min(...visiblePoints.map((point) => point.y));
  const maxY = Math.max(...visiblePoints.map((point) => point.y));
  const spanY = maxY - minY;

  let label = "Cadre: propre";
  let variant = "pill good";

  if (visiblePoints.length < 8) {
    label = "Cadre: incomplet";
    variant = "pill warn";
  } else if (minY < 0.04 || maxY > 0.98 || minX < 0.04 || maxX > 0.98) {
    label = "Cadre: recule";
    variant = "pill warn";
  } else if (spanY < 0.55) {
    label = "Cadre: approche";
    variant = "pill warn";
  }

  elements.framePill.textContent = label;
  elements.framePill.className = variant;
}

function updateLightStatus() {
  if (!state.stream || elements.video.readyState < 2) {
    return;
  }

  lightContext.drawImage(elements.video, 0, 0, lightCanvas.width, lightCanvas.height);
  const pixels = lightContext.getImageData(0, 0, lightCanvas.width, lightCanvas.height).data;
  let total = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    total += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
  }
  const brightness = total / (pixels.length / 4);

  if (brightness < 55) {
    elements.lightPill.textContent = "Lumiere: faible";
    elements.lightPill.className = "pill warn";
  } else if (brightness > 205) {
    elements.lightPill.textContent = "Lumiere: forte";
    elements.lightPill.className = "pill warn";
  } else {
    elements.lightPill.textContent = "Lumiere: ok";
    elements.lightPill.className = "pill good";
  }
}

function updateLivePayload(live) {
  state.sessionLive = live;
  syncStagePreviewTitle();

  const analysis = live.analysis ?? {};
  const stats = live.stats ?? {};
  const plan = live.plan ?? {};
  const progress = Number(plan.session_progress_pct ?? 0);
  const currentProgress = Number(plan.current_progress_pct ?? 0);

  elements.progressChip.textContent = `Progression: ${formatNumber(progress, 0)}%`;
  elements.sessionProgressBar.style.width = `${progress}%`;
  elements.sessionProgressValue.textContent = `${formatNumber(progress, 0)}%`;
  elements.objectiveValue.textContent = formatObjective(stats);
  elements.validRepsValue.textContent = String(stats.repetitions_correctes ?? 0);
  elements.invalidRepsValue.textContent = String(stats.repetitions_invalides ?? 0);
  elements.orientationValue.textContent = live.orientation ?? "-";
  elements.angleValue.textContent = analysis.angle_principal ? `${formatNumber(analysis.angle_principal, 0)}°` : "--";
  elements.caloriesValue.textContent = formatNumber(live.live_calories ?? 0, 1);
  updateQualityRing(analysis.taux_reussite ?? currentProgress ?? 0);
  setCoachMessage(
    analysis.message ?? "Analyse en cours.",
    buildCoachHint(live),
    live.coach_variant ?? "warn",
  );
  setNotice(buildStageNotice(live));
  renderPlanComposer();

  if (analysis.voix) {
    speak(analysis.voix);
  }
}

function formatObjective(stats) {
  const mode = stats.mode_objectif ?? "reps";
  const cible = Number(stats.objectif ?? 0);
  if (mode === "time") {
    return `${formatNumber(stats.temps_tenu_sec ?? 0, 0)} / ${cible} sec`;
  }
  return `${stats.repetitions_correctes ?? 0} / ${cible}`;
}

function buildCoachHint(live) {
  const plan = live.plan ?? {};
  const next = plan.next_exercise;
  if (next?.name) {
    return `Exercice suivant: ${next.name} • ${next.target_label}`;
  }
  if (live.is_complete) {
    return "Bravo. La seance est complete et le resume est pret.";
  }
  return "Reste bien visible et execute le mouvement proprement.";
}

function buildStageNotice(live) {
  if (live.is_complete) {
    return "Objectifs atteints. Finalisation de la seance...";
  }
  const averageFps = Number(live.average_fps ?? 0);
  if (averageFps > 0) {
    return `Analyse active • ${formatNumber(averageFps, 0)} FPS • ${formatNumber(live.elapsed_sec ?? 0, 1)} sec`;
  }
  return "Analyse active.";
}

function updateQualityRing(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent || 0)));
  elements.qualityRing.style.setProperty("--ring", `${clamped}%`);
  elements.qualityValue.textContent = `${formatNumber(clamped, 0)}%`;
}

function startTimer() {
  stopTimer();
  elements.timerChip.textContent = "Temps: 00:00";
  state.timerInterval = window.setInterval(() => {
    elements.timerChip.textContent = `Temps: ${formatClock(getElapsedSeconds())}`;
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  elements.timerChip.textContent = "Temps: 00:00";
}

function getElapsedSeconds() {
  if (!state.sessionStartedAt) {
    return 0;
  }
  return (performance.now() - state.sessionStartedAt) / 1000;
}

function setButtonsState(live) {
  elements.startButtons.forEach((button) => {
    if (button) {
      button.disabled = live;
    }
  });
  elements.stopButtons.forEach((button) => {
    if (button) {
      button.disabled = !live;
    }
  });
}

function setStatus(text, live) {
  elements.statusChip.textContent = `Statut: ${text}`;
  elements.statusChip.classList.toggle("live", live);
  elements.body.classList.toggle("session-live", live);
}

function setFocus(active) {
  state.focus = active;
  elements.body.classList.toggle("focus-mode", active);
  updateFocusUi();
}

function updateFocusUi() {
  elements.focusChip.textContent = state.focus ? "Mode: focus" : "Mode: normal";
  elements.settingsFocusButton.textContent = state.focus ? "Quitter le mode focus" : "Activer le mode focus";
}

function toggleFocus() {
  setActiveView("session");
  setFocus(!state.focus);
}

function updateVoiceUi() {
  const label = state.voiceEnabled ? "Voix active" : "Voix coupee";
  elements.voiceButtons.forEach((button) => {
    if (!button) {
      return;
    }
    if (button.id === "dockVoiceButton") {
      button.textContent = state.voiceEnabled ? "Voix on" : "Voix off";
    } else {
      button.textContent = label;
    }
  });
}

function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  updateVoiceUi();
  if (!state.voiceEnabled && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  setNotice(state.voiceEnabled ? "Feedback vocal active." : "Feedback vocal coupe.");
}

function speak(message) {
  if (!state.voiceEnabled || !window.speechSynthesis) {
    return;
  }

  const now = Date.now();
  const clean = String(message).trim();
  if (!clean) {
    return;
  }
  if (clean === state.lastSpokenMessage && now - state.lastSpeechAt < 2200) {
    return;
  }

  state.lastSpokenMessage = clean;
  state.lastSpeechAt = now;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "fr-FR";
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

function setCoachMessage(message, subMessage, variant = "warn") {
  elements.coachCard.className = `card coach-card ${variant}`;
  elements.coachLine.textContent = message;
  elements.coachHint.textContent = subMessage;
  elements.coachMessage.textContent = message;
  elements.coachSub.textContent = subMessage;
}

function setNotice(message) {
  elements.stageNotice.textContent = message;
}

function renderSummary(result) {
  const summary = result.summary ?? {};
  const exercises = result.exercises ?? [];
  const exportsMap = result.exports ?? {};
  const warnings = result.warnings ?? [];

  elements.summaryMetrics.innerHTML = [
    createSummaryCard("Duree", formatDuration(summary.duree_totale_sec ?? 0)),
    createSummaryCard("Calories", `${formatNumber(summary.calories_totales ?? 0, 1)} kcal`),
    createSummaryCard("Score", `${formatNumber(summary.score_global ?? 0, 0)} / 100`),
    createSummaryCard("Qualite", summary.note_qualite ?? "-"),
  ].join("");

  elements.summaryWarnings.innerHTML = warnings.length
    ? warnings.map((warning) => `<div class="session-row"><strong>Note</strong><span>${escapeHtml(warning)}</span></div>`).join("")
    : "";

  elements.summaryExports.innerHTML = Object.entries(exportsMap)
    .map(([label, href]) => `<a class="summary-link" href="${href}" target="_blank" rel="noreferrer">${escapeHtml(label.toUpperCase())}</a>`)
    .join("");

  elements.summaryExercises.innerHTML = exercises
    .map((exercise) => {
      return `
        <article class="summary-exercise">
          <div class="summary-exercise-top">
            <strong>${escapeHtml(exercise.nom_exercice)}</strong>
            <span>${formatNumber(exercise.score_qualite ?? 0, 0)}%</span>
          </div>
          <div class="summary-exercise-meta">
            <span>${exercise.reps_validees ?? 0} / ${exercise.reps_cibles ?? 0} valides</span>
            <span>${formatNumber(exercise.calories ?? 0, 1)} kcal</span>
            <span>angle ${formatNumber(exercise.angle_moyen ?? 0, 0)}°</span>
          </div>
        </article>
      `;
    })
    .join("");

  elements.summarySheet.hidden = false;
}

function createSummaryCard(label, value) {
  return `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function closeSummary() {
  elements.summarySheet.hidden = true;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remain = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remain}`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  if (minutes <= 0) {
    return `${remain} sec`;
  }
  return `${minutes} min ${String(remain).padStart(2, "0")} sec`;
}

function formatDurationShort(totalSeconds) {
  const minutes = Math.round((Number(totalSeconds || 0) / 60));
  return `${minutes} min`;
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toFixed(digits);
}

function formatPlanTarget(item) {
  return item.mode === "time" ? `${item.target} sec` : `${item.target} reps`;
}

function formatDay(rawDate) {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatDateTime(rawDate) {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
