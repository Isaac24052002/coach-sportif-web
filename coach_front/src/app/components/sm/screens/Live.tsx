import { useState, useEffect, useRef, useCallback } from "react";
import { GlassCard, GlowButton, PulseDot, QualityRing, StatusChip } from "../primitives";
import { Eye, Wifi, Sun, Crop, Mic, MicOff, Maximize2, Minimize2, Square, Play, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../../AuthContext";
import {
  createSession, analyzeFrame, finishSession, getExercises,
  getAutoPlan, LiveResponse, FinishResponse, ExerciseDef, PlanExercise,
} from "../../../api";

const SKELETON_PAIRS = [[11,13],[13,15],[12,14],[14,16],[11,12],[23,24],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
const LANDMARK_NAMES = [
  "nose","left_eye_inner","left_eye","left_eye_outer","right_eye_inner","right_eye","right_eye_outer",
  "left_ear","right_ear","mouth_left","mouth_right","left_shoulder","right_shoulder","left_elbow",
  "right_elbow","left_wrist","right_wrist","left_pinky","right_pinky","left_index","right_index",
  "left_thumb","right_thumb","left_hip","right_hip","left_knee","right_knee","left_ankle",
  "right_ankle","left_heel","right_heel","left_foot_index","right_foot_index",
];
const BODY_KEYS = new Set(["left_shoulder","right_shoulder","left_elbow","right_elbow","left_wrist","right_wrist","left_hip","right_hip","left_knee","right_knee","left_ankle","right_ankle"]);

export function LiveScreen({ onComplete }: { onComplete: (result: FinishResponse) => void }) {
  const { user, view } = useAuth();
  const [exercises, setExercises] = useState<ExerciseDef[]>([]);
  const [plan, setPlan] = useState<PlanExercise[]>([]);
  const [running, setRunning] = useState(false);
  const [focus, setFocus] = useState(false);
  const [voice, setVoice] = useState(true);
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "stopping">("idle");
  const [error, setError] = useState("");
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connected">("disconnected");
  const [elapsedSec, setElapsedSec] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const lastVideoTimeRef = useRef(-1);
  const sessionIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const lastAnalysisRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const elapsedRef = useRef(0);          // ref pour éviter fermeture obsolète dans RAF
  const liveRef = useRef<LiveResponse | null>(null);
  const voiceRef = useRef(true);
  const startTimeRef = useRef(0);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Sync refs
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  useEffect(() => { liveRef.current = live; }, [live]);

  // Pré-charger les voix TTS au montage (Chrome charge les voix de façon asynchrone)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Charger les exercices au montage + auto-sélectionner le premier
  useEffect(() => {
    getExercises().then(list => {
      setExercises(list);
      // Pré-sélectionner les 3 premiers exercices pour que le bouton soit actif d'emblée
      if (list.length > 0) {
        setPlan(list.slice(0, 3).map(e => ({
          cle: e.key, mode: e.mode,
          objectif_reps: e.mode === "reps" ? e.default_target : undefined,
          objectif_secondes: e.mode === "time" ? e.default_target : undefined,
        })));
      }
    }).catch(() => {});
  }, []);

  // Timer basé sur les refs (pas de re-render sur chaque tick)
  useEffect(() => {
    if (!running) return;
    startTimeRef.current = performance.now() - elapsedRef.current * 1000;
    const id = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      elapsedRef.current = elapsed;
      setElapsedSec(Math.floor(elapsed));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  // ── Voice feedback ────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!voiceRef.current || !("speechSynthesis" in window)) return;
    try {
      // Annuler ce qui parle déjà
      window.speechSynthesis.cancel();
      // Bug Chrome/Linux : speechSynthesis peut être suspendu sans raison
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      const utt = new SpeechSynthesisUtterance(text);
      // Utiliser les voix pré-chargées
      const voices = voicesRef.current.length > 0
        ? voicesRef.current
        : window.speechSynthesis.getVoices();
      const fr = voices.find(v => v.lang.startsWith("fr-")) ??
                 voices.find(v => v.lang.startsWith("fr")) ??
                 voices[0] ?? null;
      if (fr) utt.voice = fr;
      utt.lang = "fr-FR"; utt.rate = 0.9; utt.pitch = 1.0; utt.volume = 1.0;
      window.speechSynthesis.speak(utt);
    } catch { /* TTS non disponible */ }
  }, []);

  // ── MediaPipe ──────────────────────────────────────────────────────────────
  const initPose = useCallback(async () => {
    // Si déjà chargé, ne pas recharger
    if (poseLandmarkerRef.current) return;
    let FilesetResolver: any, PoseLandmarker: any;
    try {
      const mod = await import(
        /* @vite-ignore */
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
      ) as any;
      FilesetResolver = mod.FilesetResolver;
      PoseLandmarker = mod.PoseLandmarker;
    } catch (e) {
      throw new Error("Impossible de charger MediaPipe. Connexion internet requise.");
    }
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    // Essayer GPU d'abord, fallback CPU
    try {
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO", numPoses: 1,
      });
    } catch {
      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO", numPoses: 1,
      });
    }
  }, []);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      return false;
    }
    return true;
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const startWs = useCallback((sid: string) => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    try {
      const ws = new WebSocket(`${proto}://${location.host}/api/ws/sessions/${sid}`);
      ws.onopen = () => setWsStatus("connected");
      ws.onclose = () => setWsStatus("disconnected");
      ws.onerror = () => setWsStatus("disconnected");
      wsRef.current = ws;
    } catch { /* WebSocket optionnel */ }
  }, []);

  const stopWs = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setWsStatus("disconnected");
  }, []);

  // ── Squelette ─────────────────────────────────────────────────────────────
  const drawSkeleton = useCallback((ctx: CanvasRenderingContext2D, pose: any[], w: number, h: number) => {
    const variant = liveRef.current?.coach_variant ?? "warn";
    const color = variant === "good" ? "#00D4AA" : variant === "bad" ? "#FF6B4A" : "#FFD166";
    ctx.save();
    ctx.lineWidth = Math.max(3, w / 320);
    ctx.lineCap = "round";
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.shadowBlur = 18; ctx.shadowColor = color;
    for (const [a, b] of SKELETON_PAIRS) {
      const pa = pose[a], pb = pose[b];
      if (!pa || !pb || (pa.visibility ?? 0) < 0.35 || (pb.visibility ?? 0) < 0.35) continue;
      ctx.beginPath(); ctx.moveTo(pa.x * w, pa.y * h); ctx.lineTo(pb.x * w, pb.y * h); ctx.stroke();
    }
    for (const p of pose) {
      if ((p.visibility ?? 0) < 0.35) continue;
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, Math.max(4, w / 280), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }, []);

  // ── Boucle rendu ──────────────────────────────────────────────────────────
  const processFrame = useCallback(async (timestamp: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    // Miroir horizontal : l'utilisateur voit son reflet
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    let pose: any = null;
    if (poseLandmarkerRef.current && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const result = poseLandmarkerRef.current.detectForVideo(video, performance.now());
      pose = result?.landmarks?.[0] ?? null;
    }

    if (pose) {
      // Miroir des coords X pour correspondre à l'affichage
      const mirrored = pose.map((p: any) => ({ ...p, x: 1 - p.x }));
      drawSkeleton(ctx, mirrored, canvas.width, canvas.height);
    }

    // Envoyer à l'API
    const sid = sessionIdRef.current;
    if (sid && !inFlightRef.current && timestamp - lastAnalysisRef.current > 120) {
      lastAnalysisRef.current = timestamp;
      inFlightRef.current = true;
      const elapsed = elapsedRef.current;
      const landmarks: Record<string, any> = {};
      if (pose) {
        LANDMARK_NAMES.forEach((name, i) => {
          if (BODY_KEYS.has(name) && pose[i]) {
            landmarks[name] = { x: pose[i].x, y: pose[i].y, z: pose[i].z ?? 0, visibility: pose[i].visibility ?? 0 };
          }
        });
      }
      analyzeFrame(sid, { landmarks, elapsed_sec: elapsed, fps: 30 })
        .then(lv => {
          setLive(lv);
          liveRef.current = lv;
          if (lv.is_complete) handleStopRef.current(true);
          if (lv.analysis?.voix) speak(lv.analysis.voix);
        })
        .catch(() => {})
        .finally(() => { inFlightRef.current = false; });
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [drawSkeleton, speak]);

  // ── handleStop via ref pour éviter re-capture dans processFrame ───────────
  const handleStopRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});

  const handleStop = useCallback(async (auto = false) => {
    if (status === "stopping") return;
    setStatus("stopping");
    cancelAnimationFrame(rafRef.current);
    stopCamera(); stopWs(); setRunning(false);
    if (sessionIdRef.current) {
      try {
        const result = await finishSession(sessionIdRef.current);
        sessionIdRef.current = null;
        onComplete(result);
      } catch { sessionIdRef.current = null; }
    }
    setStatus("idle"); setLive(null); setElapsedSec(0); elapsedRef.current = 0;
  }, [status, stopCamera, stopWs, onComplete]);

  useEffect(() => { handleStopRef.current = handleStop; }, [handleStop]);

  // ── Démarrer ───────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!user) { setError("Connecte-toi d'abord."); return; }
    if (plan.length === 0) { setError("Sélectionne au moins un exercice."); return; }
    setError(""); setStatus("starting");

    // 1. Caméra en premier (feedback immédiat)
    const ok = await startCamera();
    if (!ok) { setStatus("idle"); return; }

    // 2. Lancer la boucle de rendu immédiatement (la caméra est visible même sans pose)
    rafRef.current = requestAnimationFrame(processFrame);

    // 3. Charger MediaPipe en parallèle (peut prendre 5-15s)
    try {
      speak("Chargement du modèle de détection de posture…");
      await initPose();
      speak("Modèle prêt. Séance démarrée.");
    } catch (e: any) {
      // MediaPipe échoue → on continue sans pose (analyse envoyée sans landmarks)
      setError(`Détection de posture indisponible : ${e.message ?? "erreur réseau"}. La séance continue sans analyse de posture.`);
    }

    // 4. Créer la session côté API
    let sid: string;
    try {
      const res = await createSession({ user_id: user.id, plan });
      sid = (res as any).session_id as string;
    } catch (e: any) {
      setError(e.message ?? "Impossible de créer la session");
      cancelAnimationFrame(rafRef.current);
      stopCamera(); setStatus("idle"); return;
    }

    sessionIdRef.current = sid;
    startWs(sid);
    elapsedRef.current = 0;
    setRunning(true); setStatus("running");
  }, [user, plan, startCamera, initPose, startWs, processFrame, speak, stopCamera]);

  // ── Plan auto ──────────────────────────────────────────────────────────────
  const handleAutoPlan = async () => {
    if (!view?.profile) return;
    try {
      const r = await getAutoPlan(view.profile);
      const newPlan: PlanExercise[] = r.items.map(item => ({
        cle: item.key,
        mode: item.mode,
        objectif_reps: item.mode === "reps" ? item.target : undefined,
        objectif_secondes: item.mode === "time" ? item.target : undefined,
      }));
      setPlan(newPlan);
    } catch {}
  };

  const toggleExercise = (key: string) => {
    const ex = exercises.find(e => e.key === key)!;
    if (plan.some(p => p.cle === key)) {
      setPlan(p => p.filter(e => e.cle !== key));
    } else {
      setPlan(p => [...p, {
        cle: key, mode: ex.mode,
        objectif_reps: ex.mode === "reps" ? ex.default_target : undefined,
        objectif_secondes: ex.mode === "time" ? ex.default_target : undefined,
      }]);
    }
  };

  const score = live?.analysis?.taux_reussite ?? 0;
  const coachMsg = live?.analysis?.message ?? "Place-toi au centre, garde la tête et les pieds visibles, puis lance la séance.";
  const coachVariant = live?.coach_variant ?? "warn";
  const isLive = status === "running";

  return (
    <div className={`${focus ? "fixed inset-0 z-50 bg-black p-0" : "p-6 lg:p-10"}`}>
      <div className={focus ? "h-full" : "space-y-5"}>

        {/* ── Caméra + HUD ── */}
        <div className="relative overflow-hidden rounded-3xl"
          style={{
            border: isLive ? "1px solid rgba(0,212,170,0.4)" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: isLive ? "0 0 60px rgba(0,212,170,0.25), inset 0 0 40px rgba(0,212,170,0.08)" : "none",
            aspectRatio: focus ? undefined : "16/9",
            height: focus ? "100%" : undefined,
            background: "#060E0F",
          }}>

          {/* Video caché (source MediaPipe) */}
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover opacity-0 pointer-events-none" playsInline muted />
          {/* Canvas visible : image miroir + squelette. Quand le canvas est vide (avant start), la vidéo sert de fallback */}
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" style={{ background: "transparent" }} />
          {/* Message de chargement du modèle */}
          {status === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#00D4AA]" />
              <div className="text-white/70" style={{ fontSize: 14 }}>Chargement du modèle IA…</div>
              <div className="text-white/40" style={{ fontSize: 11 }}>Première utilisation : ~10 secondes</div>
            </div>
          )}

          {/* HUD haut */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div className="flex flex-wrap gap-2">
              <StatusChip label={isLive ? "LIVE" : "PRÊT"} color={isLive ? "#FF6B4A" : "#00D4AA"} pulsing={isLive} />
              <div className="rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-white backdrop-blur-xl"
                style={{ fontSize: 12, fontFamily: "Space Grotesk", fontWeight: 600 }}>
                {mm}:{ss}
              </div>
              {live && (
                <div className="rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-white/80 backdrop-blur-xl" style={{ fontSize: 12 }}>
                  {Math.round(live.plan?.session_progress_pct ?? 0)}%
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!focus && (
                <>
                  <HudPill icon={<Eye size={12} />} label={`${live?.average_fps?.toFixed(0) ?? "--"} fps`} />
                  <HudPill icon={<Sun size={12} />} label="Lumière" tone="good" />
                  <HudPill icon={<Crop size={12} />} label="Cadre" tone="good" />
                  <HudPill icon={<Wifi size={12} />} label={wsStatus === "connected" ? "WS" : "WS ✗"} tone={wsStatus === "connected" ? "good" : undefined} />
                </>
              )}
              <button onClick={() => setFocus(f => !f)}
                className="rounded-full border border-white/10 bg-black/50 p-1.5 text-white/60 backdrop-blur-xl hover:text-white">
                {focus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {/* Message coach */}
          <motion.div className="absolute bottom-4 left-4 max-w-sm rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-xl"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-2">
              <PulseDot color={coachVariant === "good" ? "#00D4AA" : coachVariant === "bad" ? "#FF6B4A" : "#FFD166"} />
              <div>
                <div className="text-[#00D4AA]" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>COACH IA</div>
                <div className="text-white" style={{ fontSize: 13, lineHeight: 1.35 }}>{coachMsg}</div>
                {live?.active_exercise && (
                  <div className="mt-1 text-white/50" style={{ fontSize: 11 }}>{live.active_exercise.name}</div>
                )}
                {live?.plan?.next_exercise && (
                  <div className="mt-1 text-[#FFD166]" style={{ fontSize: 11 }}>
                    Prochain : {live.plan.next_exercise.name} · {live.plan.next_exercise.target_label}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Anneau qualité */}
          <div className="absolute bottom-4 right-4 rounded-3xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl">
            <QualityRing value={Math.round(score)} size={focus ? 140 : 96} label="Qualité" />
          </div>
        </div>

        {!focus && (
          <>
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400" style={{ fontSize: 13 }}>{error}</div>
            )}

            {/* Stats en temps réel */}
            {live && (
              <GlassCard className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Stat label="Exercice actif" value={live.active_exercise?.name ?? "-"} accent />
                  <Divider />
                  <Stat label="Reps validées" value={String(live.analysis?.repetitions_correctes ?? 0)} color="#00D4AA" />
                  <Divider />
                  <Stat label="Reps invalides" value={String(live.analysis?.repetitions_invalides ?? 0)} color="#FF6B4A" />
                  <Divider />
                  <Stat label="Angle" value={live.analysis?.angle_principal != null ? `${Math.round(live.analysis.angle_principal)}°` : "--"} color="#FFD166" />
                  <Divider />
                  <Stat label="Calories" value={`${(live.live_calories ?? 0).toFixed(1)} kcal`} color="#FF6B4A" />
                </div>
              </GlassCard>
            )}

            {/* Plan + contrôles */}
            <div className="grid gap-4 lg:grid-cols-3">
              <GlassCard className="p-5 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>Plan de séance</h3>
                  <button onClick={handleAutoPlan} disabled={running}
                    className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-white/70 hover:text-white disabled:opacity-40"
                    style={{ fontSize: 12 }}>
                    <Zap size={12} /> Plan auto
                  </button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {exercises.map(e => {
                    const inPlan = plan.some(p => p.cle === e.key);
                    return (
                      <button key={e.key} onClick={() => !running && toggleExercise(e.key)} disabled={running}
                        className="rounded-xl px-3 py-1.5 border transition-all disabled:opacity-40"
                        style={{ fontSize: 12, borderColor: inPlan ? "#00D4AA" : "rgba(255,255,255,0.1)", background: inPlan ? "rgba(0,212,170,0.1)" : "rgba(255,255,255,0.03)", color: inPlan ? "#00D4AA" : "rgba(255,255,255,0.6)" }}>
                        {inPlan ? "✓ " : ""}{e.name}
                        <span className="ml-1 text-white/30" style={{ fontSize: 10 }}>({e.default_target} {e.target_label})</span>
                      </button>
                    );
                  })}
                </div>
                {plan.length > 0 && (
                  <div className="text-white/40" style={{ fontSize: 11 }}>
                    {plan.length} exercice{plan.length > 1 ? "s" : ""} sélectionné{plan.length > 1 ? "s" : ""}
                  </div>
                )}
              </GlassCard>

              <GlassCard className="flex flex-col gap-3 p-5">
                <h3 className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>Contrôles</h3>

                <button onClick={() => { setVoice(v => !v); voiceRef.current = !voiceRef.current; }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/70 hover:text-white transition-all"
                  style={{ fontSize: 12, borderColor: voice ? "rgba(0,212,170,0.4)" : "rgba(255,255,255,0.1)", color: voice ? "#00D4AA" : "rgba(255,255,255,0.5)" }}>
                  {voice ? <Mic size={14} /> : <MicOff size={14} />}
                  Voix {voice ? "activée" : "désactivée"}
                </button>

                {!running ? (
                  <GlowButton onClick={handleStart} disabled={plan.length === 0 || status === "starting"} className="w-full">
                    {status === "starting" ? "Démarrage…" : <><Play size={14} /> Démarrer</>}
                  </GlowButton>
                ) : (
                  <GlowButton variant="danger" onClick={() => handleStop(false)} disabled={status === "stopping"} className="w-full">
                    {status === "stopping" ? "Fin…" : <><Square size={14} /> Terminer</>}
                  </GlowButton>
                )}
              </GlassCard>
            </div>
          </>
        )}

        {focus && (
          <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-10">
            {!running ? (
              <GlowButton onClick={handleStart} disabled={plan.length === 0}><Play size={14} /></GlowButton>
            ) : (
              <GlowButton variant="danger" onClick={() => handleStop(false)}><Square size={14} /></GlowButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sous-composants locaux ────────────────────────────────────────────────────
function HudPill({ icon, label, tone }: { icon: React.ReactNode; label: string; tone?: "good" }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-white/70 backdrop-blur-xl"
      style={{ fontSize: 11, color: tone === "good" ? "#00D4AA" : undefined }}>
      {icon} {label}
    </div>
  );
}
function Stat({ label, value, color, accent }: { label: string; value: string; color?: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-white/40" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ color: accent ? "#00D4AA" : (color ?? "white"), fontFamily: "Space Grotesk", fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
function Divider() {
  return <div className="hidden h-8 w-px bg-white/10 sm:block" />;
}
