import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Goals } from './pages/Goals';
import { Journal } from './pages/Journal';
import { Failures } from './pages/Failures';
import { Session } from './pages/Session';
import { Trash } from './pages/Trash';
import { Login } from './pages/Login';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { Navigate } from 'react-router-dom';
import { useGoalStore } from './stores/goalStore';
import { useSessionStore } from './stores/sessionStore';
import { useFailureStore } from './stores/failureStore';
import { useJournalStore } from './stores/journalStore';
import { useFrameworkStore } from './stores/frameworkStore';
import { getAllFromDB } from './lib/persistence';
import type { Goal, Session as DBSession, Failure, JournalEntry, Framework } from './db';

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-text">
        <div className="text-secondary/60 text-sm font-semibold">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { init } = useAuthStore();
  const setGoals = useGoalStore((s) => s.setGoals);
  const setSessions = useSessionStore((s) => s.setSessions);
  const setFailures = useFailureStore((s) => s.setFailures);
  const setJournals = useJournalStore((s) => s.setJournals);
  const setFrameworks = useFrameworkStore((s) => s.setFrameworks);

  useEffect(() => {
    init();
  }, [init]);

  // Hydrate Zustand from IndexedDB on every mount.
  // Runs ONCE — dependency array is empty so it never re-runs and never races with itself.
  // Uses unconditional setters so the UI always reflects IDB state on refresh.
  useEffect(() => {
    const hydrateFromIndexedDB = async () => {
      try {
        const [goals, sessions, failures, journals, frameworks] = await Promise.all([
          getAllFromDB('goals'),
          getAllFromDB('sessions'),
          getAllFromDB('failures'),
          getAllFromDB('journals'),
          getAllFromDB('frameworks'),
        ]);

        // Debug: if these log empty arrays, the SAVE path is broken (check saveToDB calls).
        // If these log data but the UI is still empty, there is an OVERWRITE bug in a load() call.
        console.log('[IDB hydrate] goals:', goals.length, '| sessions:', sessions.length,
          '| failures:', failures.length, '| journals:', journals.length,
          '| frameworks:', frameworks.length);

        // Always set — even empty arrays are valid state (new user / after wipe).
        setGoals(goals as Goal[]);
        setSessions(sessions as DBSession[]);
        setFailures(failures as Failure[]);
        setJournals(journals as JournalEntry[]);
        setFrameworks(frameworks as Framework[]);
      } catch (e) {
        console.error('[IDB hydrate] Failed to hydrate from IndexedDB:', e);
      }
    };

    void hydrateFromIndexedDB();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />
        <Route path="/signup" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGate>
              <Layout />
            </AuthGate>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="goals" element={<Goals />} />
          <Route path="journal" element={<Journal />} />
          <Route path="failures" element={<Failures />} />
          <Route path="session" element={<Session />} />
          <Route path="trash" element={<Trash />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
