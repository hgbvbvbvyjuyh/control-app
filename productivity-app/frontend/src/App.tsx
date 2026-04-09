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
import { getAllFromDB } from './lib/persistence';

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
  const { setGoals } = useGoalStore();
  const { setSessions } = useSessionStore();
  const failureStore = useFailureStore();
  const journalStore = useJournalStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const hydrateFromIndexedDB = async () => {
      const goals = await getAllFromDB('goals');
      setGoals(goals);

      const sessions = await getAllFromDB('sessions');
      setSessions(sessions);

      if ('setFailures' in failureStore && typeof failureStore.setFailures === 'function') {
        const failures = await getAllFromDB('failures');
        failureStore.setFailures(failures);
      }

      if ('setJournals' in journalStore && typeof journalStore.setJournals === 'function') {
        const journals = await getAllFromDB('journals');
        journalStore.setJournals(journals);
      }
    };

    void hydrateFromIndexedDB();
  }, [setGoals, setSessions, failureStore, journalStore]);

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
