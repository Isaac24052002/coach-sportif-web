import { useEffect, useState } from "react";
import { Sidebar, BottomNav, ScreenKey } from "./components/sm/Nav";
import { AuthScreen } from "./components/sm/screens/Auth";
import { HomeScreen } from "./components/sm/screens/Home";
import { LiveScreen } from "./components/sm/screens/Live";
import { ProgressScreen } from "./components/sm/screens/Progress";
import { ProfileScreen } from "./components/sm/screens/Profile";
import { SettingsScreen } from "./components/sm/screens/Settings";
import { SummarySheet } from "./components/sm/screens/Summary";
import { ThemeProvider, useTheme } from "./components/sm/theme";
import { AnimatePresence, motion } from "motion/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { FinishResponse } from "./api";

function Shell() {
  const { t, setId } = useTheme();
  const { user, logout } = useAuth();
  const authed = user !== null;
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [expanded, setExpanded] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<FinishResponse | null>(null);

  useEffect(() => {
    setId("kume");
  }, [setId, user?.theme]);

  if (!authed) {
    return (
      <div
        className="kume-ui min-h-screen w-full"
        style={{ fontFamily: "Manrope, ui-sans-serif", background: t.shellBg, color: t.textPrimary }}
      >
        <AuthScreen onAuth={() => {}} />
      </div>
    );
  }

  const handleComplete = (result: FinishResponse) => {
    setSummaryResult(result);
    setShowSummary(true);
  };

  const handleLogout = () => {
    logout();
    setScreen("home");
  };

  return (
    <div
      className="kume-ui relative min-h-screen w-full"
      style={{
        fontFamily: "Manrope, ui-sans-serif",
        background: `${t.bgRadial}, ${t.shellBg}`,
        color: t.textPrimary,
      }}
    >
      <div className="flex min-h-screen">
        <Sidebar
          current={screen}
          onNav={setScreen}
          expanded={expanded}
          onToggleExpand={() => setExpanded(!expanded)}
          onLogout={handleLogout}
          liveActive={screen === "live"}
        />

        <main className="flex-1 overflow-x-hidden pb-28 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {screen === "home" && <HomeScreen onLaunchLive={() => setScreen("live")} onProgress={() => setScreen("progress")} />}
              {screen === "live" && <LiveScreen onComplete={handleComplete} />}
              {screen === "progress" && <ProgressScreen />}
              {screen === "profile" && <ProfileScreen />}
              {screen === "settings" && <SettingsScreen onLogout={handleLogout} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomNav current={screen} onNav={setScreen} onLaunchLive={() => setScreen("live")} />

      <AnimatePresence>
        {showSummary && summaryResult && (
          <SummarySheet result={summaryResult} onClose={() => { setShowSummary(false); setScreen("progress"); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </AuthProvider>
  );
}
