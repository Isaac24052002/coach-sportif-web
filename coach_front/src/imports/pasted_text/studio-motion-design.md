Design a premium AI fitness coaching web app called "Studio Motion — Coach Fitness IA".

Product concept: A personal AI coach that uses the device camera to analyze body posture in real time during workouts. It counts reps, detects form errors, gives vocal feedback, tracks calories and progress. Think Whoop meets Mirror meets Apple Fitness+.

Design language:

Ultra-premium dark mode first, with a light mode toggle
Glassmorphism panels with subtle frosted-glass blur (backdrop-filter: blur 20px), semi-transparent backgrounds
Deep background: near-black with a very subtle teal/emerald gradient (#060E0F to #0B1A1C)
Primary accent: Electric teal / jade green (#00D4AA)
Secondary accent: Coral / flame orange (#FF6B4A) for warnings and calories
Gold accent (#FFD166) for achievements and quality score
Typography: "Clash Display" or "Space Grotesk" for headings (bold, modern), "Inter" or "DM Sans" for body
Border radius: 24px on cards, 14px on buttons, 50px on pills
Shadows: neon glow shadows matching accent colors (e.g., 0 0 40px rgba(0,212,170,0.15))
Micro-animations implied (skeleton loading, live pulse dot, progress ring animation)
Navigation — CRITICAL:

Desktop (≥1024px): Left sidebar, 72px wide when collapsed (icons only), 240px when expanded. Logo at top. Nav items with icon + label: Home, Live Session (with a pulsing dot when active), Progress, Profile, Settings. Bottom of sidebar: user avatar with level badge + logout. NO top nav bar on desktop.
Mobile (<768px): Bottom tab bar, 5 tabs with icons + small labels, frosted glass, safe-area aware. A floating action button (FAB) in the center position — glowing teal circle with a play icon — to instantly launch a live session.
Tablet (768–1024px): Collapsed sidebar (icons only).
Screen 1 — Auth / Onboarding:

Full-screen split: left half = animated abstract mesh background with the logo, tagline ("Ton coach IA qui voit ce que les autres ne voient pas"), 3 feature cards with glassmorphism, and live metrics (10 exercises / 360° analysis / WebSocket real-time / PDF exports)
Right half = floating auth card, rounded 32px, with Login / Register tabs. Clean inputs with floating labels. CTA button full-width, teal gradient.
On mobile: single screen with logo + tagline at top, auth card below.
Screen 2 — Dashboard / Home:

Hero section: personalized greeting ("Bonjour Isaac 👋") with today's date, a motivational sub-line, a large primary button "Lancer une séance" (teal glow CTA), secondary button "Ma progression"
4 KPI cards in a 2×2 grid (or horizontal scroll on mobile): Sessions / Calories 14j / Temps 14j / Score moyen. Each card has a large number, icon, and a mini sparkline trend bar.
"Prochaine action" suggestion card: shows AI-recommended exercises as colored chips
Two columns below: "Ce que tu maîtrises" (trophy icon, green tags) and "À corriger" (target icon, orange tags)
Last session card at bottom: date, score ring, exercise count, calories, duration
Screen 3 — Live Session (the most important screen):

Camera feed takes 60% of the viewport, full width, rounded 24px, with a very subtle teal border glow when active. SHOW the real user in the camera — no black box.
Overlaid on the camera feed (HUD style):
Top-left: Status chip (LIVE / Prêt), Timer, Progression %
Top-right: FPS pill, Light indicator (OK/Faible), Frame quality (Cadre: OK/Approche), WebSocket indicator
Bottom-left: Coach message card (glassmorphism, max 2 lines, pulsing coach dot)
Bottom-right: Circular quality score ring (0–100%, colored green/orange/red)
Below the camera feed: horizontal stats strip (Exercice actif / Reps validées / Reps invalides / Angle / Calories)
Bottom panel: Exercise plan (horizontal scrollable chips) on the left, large Coach IA card on the right with coach guidance text
Control bar: Start/Stop buttons (teal/red), Focus toggle (minimize UI for immersion), Voice toggle, Camera flip
Focus mode: camera goes full screen, all UI fades out except the quality ring and one coach message line
Screen 4 — Progress / Analytics:

4 KPI cards at top (same style as Home)
Calories chart: custom bar chart, teal bars, 14-day range, hover tooltips
Quality by exercise: horizontal bar chart with color-coded bars (green > 70%, orange > 40%, red below)
Recent sessions list: each row = date / exercise count / score ring (small, 40px) / duration / calories / chevron
Masteries section: green pills for mastered exercises, orange pills for improvement areas
Screen 5 — Profile:

Large user avatar (initials or photo placeholder) at top center, with level badge overlay (Débutant / Intermédiaire / Avancé)
Edit form in a glassmorphism card: First name, Age, Height (cm), Weight (kg), Sex (segmented control: Homme/Femme), Level (segmented control)
Personal metrics panel: BMI (with gauge), TDEE kcal/day, Max HR bpm — each with an icon and a small colored badge
Save button: primary teal, full width on mobile
Screen 6 — Settings:

Theme selector: 3 theme cards side by side (Ember = warm dark, Ocean = cool teal, Dawn = light warm). Each shows a mini preview of the color palette. Active theme has a glowing teal border.
Preferences: toggle switches (NOT plain buttons) for Voice feedback and Focus mode. Each toggle has an icon, label, and a description sub-text.
Info section: API version, WebSocket status (green dot = active, gray = inactive)
Danger zone: Déconnexion button, red outlined, with a trash/logout icon
Screen 7 — Post-session Summary (modal/overlay):

Slides up from bottom (bottom sheet), full screen on mobile
Large score ring centered at top (80px), color coded, with label ("Excellent" / "Bien" / "À améliorer")
Grid of metrics: duration, calories, reps validated, reps invalid, exercises completed
Per-exercise breakdown: each row = exercise name + icon + score ring (small) + reps count
Export buttons: PDF (primary), CSV (secondary outline), Share (ghost)
Close button top-right (X)
Key reusable components to design:

Status chip (colored border, pulsing dot variant)
Metric card (icon + big number + sparkline)
Exercise pill (icon + name, active/inactive/selected states)
Quality ring SVG (3 variants: good/warn/bad)
Glassmorphism panel card (20px blur, 1px semi-white border)
Toast notification (bottom-right, 4 variants: success/error/warn/info)
Bottom nav bar (mobile)
Sidebar nav (desktop, collapsed and expanded states)
Toggle switch (on/off with animation)
Floating Action Button (FAB)
Responsive breakpoints: 375px (mobile S), 430px (mobile L), 768px (tablet), 1024px (desktop), 1440px (desktop XL)

Tone & feel: High-end sports tech. Confident. Clean. Like a $50/month premium fitness platform. Not playful — serious, data-driven, empowering. Every pixel serves a purpose.