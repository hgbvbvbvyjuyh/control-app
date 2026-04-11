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
        if (goals.length) setGoals(goals as Goal[]);
        if (sessions.length) setSessions(sessions as DBSession[]);
        if (failures.length) setFailures(failures as Failure[]);
        if (journals.length) setJournals(journals as JournalEntry[]);
        if (frameworks.length) setFrameworks(frameworks as Framework[]);
      } catch (e) {
        console.error('Failed to hydrate from IndexedDB:', e);
      }
    };

    void hydrateFromIndexedDB();
  }, [setGoals, setSessions, setFailures, setJournals, setFrameworks]);

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
