import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, BookOpen, AlertCircle, Download, Trash2, ShieldAlert, UserRound, Settings, LogOut, Mail, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { ConfirmModal } from './ConfirmModal';
import { ToastContainer } from './ToastContainer';
import { useConfirmStore } from '../stores/confirmStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../utils/api';
import { useGoalStore } from '../stores/goalStore';
import { parseGoalPlan } from '../utils/goalPlan';
import { exportGoalPlanPdf } from '../utils/planPdfExport';
import { exportAllData } from '../utils/dataExport';
import { useSessionStore } from '../stores/sessionStore';
import { useDailySimpleSessionStore } from '../stores/dailySimpleSessionStore';
import type { JournalEntry } from '../db';
import type { DailySimpleSession } from '../stores/dailySimpleSessionStore';
import { APP_NAME } from '../constants/app';
import { AUTH_ENABLED } from '../config/authFlags';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/journal', icon: BookOpen, label: 'Journal' },
  { path: '/failures', icon: AlertCircle, label: 'Failures' },
  { path: '/trash', icon: Trash2, label: 'Trash' },
];

export const Layout = () => {
  const { confirm } = useConfirmStore();
  const { showToast } = useToastStore();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const showAuthChrome = AUTH_ENABLED;
  const { goals, selectedGoalId, load: loadGoals } = useGoalStore();
  const { loadForGoal: loadSessionsForGoal } = useSessionStore();
  const { loadForGoal: loadSimpleSessionsForGoal } = useDailySimpleSessionStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!profileMenuRef.current) return;
      const t = e.target as Node;
      if (!profileMenuRef.current.contains(t)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    setProfileName(user?.displayName || '');
    setProfileEmail(user?.email || '');
  }, [settingsOpen, user?.displayName, user?.email]);

  const handleExportSummaryPdf = async () => {
    try {
      if (!selectedGoalId) {
        showToast('Select a goal to export its summary', 'error');
        return;
      }

      let selected = goals.find(g => String(g.id) === String(selectedGoalId)) || null;
      if (!selected) {
        await loadGoals();
        selected = goals.find(g => String(g.id) === String(selectedGoalId)) || null;
      }

      if (!selected) {
        showToast('Selected goal not found', 'error');
        return;
      }

      const plan = parseGoalPlan(selected.data);
      if (!plan) showToast('No saved plan found for this goal; exporting PDF anyway', 'info');

      const goalId = String(selected.id);
      const subGoals = goals.filter(g => g.parentId != null && String(g.parentId) === goalId);

      const journals = await api.get<JournalEntry[]>(
        `/journals?goalId=${encodeURIComponent(goalId)}`
      );
      const journalAnswers = journals
        .map(j => ({
          date: j.date,
          q1: j.content?.answers?.q1,
          q2: j.content?.answers?.q2,
          q3: j.content?.answers?.q3,
        }))
        .filter(j => {
          const any =
            (j.q1 ?? '').trim() !== '' || (j.q2 ?? '').trim() !== '' || (j.q3 ?? '').trim() !== '';
          return any;
        });

      const timerSessions = await loadSessionsForGoal(goalId);
      let simpleSessions: DailySimpleSession[] = [];
      if (selected.goalType === 'daily') {
        await loadSimpleSessionsForGoal(goalId);
        simpleSessions = useDailySimpleSessionStore.getState().byGoalId[goalId] ?? [];
      }

      const total = (timerSessions?.length ?? 0) + (simpleSessions?.length ?? 0);
      const completed =
        (timerSessions ?? []).filter(s => s.status === 'completed').length +
        (simpleSessions ?? []).filter(s => s.status === 'done').length;
      const missed =
        (timerSessions ?? []).filter(s => s.status === 'skipped').length +
        (simpleSessions ?? []).filter(s => s.status === 'missed').length;
      const pendingOrActive =
        (timerSessions ?? []).filter(s => s.status === 'active').length +
        (simpleSessions ?? []).filter(s => s.status === 'pending').length;

      const dateStamp = new Date().toISOString().slice(0, 10);
      exportGoalPlanPdf({
        fileName: `summary-${dateStamp}.pdf`,
        goal: selected,
        plan,
        subGoals,
        journalAnswers,
        sessionSummary: total === 0 ? undefined : { total, completed, missed, pendingOrActive },
      });

      showToast('Summary exported as PDF', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed. Please try again.', 'error');
    }
  };

  const handleExportFullBackupJson = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-${dateStamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exported successfully', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed. Please try again.', 'error');
    }
  };

  const handleClear = async () => {
    confirm(
      'Clear All Data',
      'Are you sure you want to clear ALL data? This action cannot be undone and will reset your entire progress.',
      async () => {
        try {
          await Promise.all([
            db.goals.clear(),
            db.sessions.clear(),
            db.journals.clear(),
            db.failures.clear(),
            db.frameworks.clear(),
            db.users.clear(),
            api.post('/export/clear', {}),
          ]);
          localStorage.removeItem('active_productivity_session');
          alert('System wiped successfully. The app will now reload.');
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert('Failed to clear database.');
        }
      }
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#020617] text-text selection:bg-primary/30 selection:text-white overflow-hidden font-sans">
      <ConfirmModal />
      <ToastContainer />
      
      <div className="hidden md:block w-[19rem] shrink-0" />
      <aside className="hidden md:flex fixed left-4 top-6 bottom-6 w-72 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.4)] flex-col justify-between p-4 z-40">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 mb-8 px-2"
          >
            <img src="/logo.svg" alt={APP_NAME} className="w-8 h-8 rounded-lg bg-cyan-500/20 p-1" />
            <div>
              <h1 className="text-white font-semibold">{APP_NAME}</h1>
              <p className="text-xs text-white/40">v1.0.4</p>
            </div>
          </motion.div>

          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                    isActive
                      ? 'bg-white/10 text-white shadow-inner'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <item.icon size={18} />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 mt-4">
          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition"
              type="button"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-300/20 flex items-center justify-center text-cyan-300">
                <UserRound size={16} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium truncate">{profileName || user?.displayName || 'Profile'}</p>
                <p className="text-[10px] text-white/45 truncate">{profileEmail || user?.email || 'Account'}</p>
              </div>
              <span className="ml-auto text-xs opacity-60">{profileMenuOpen ? '▲' : '▼'}</span>
            </button>

            {profileMenuOpen && (
              <div className="absolute left-0 right-0 mb-2 bottom-full bg-[#0B1220] border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden z-50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-left text-sm text-secondary hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void logout();
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-left text-sm text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-6 bottom-6 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-full overflow-y-auto no-scrollbar rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.4)] p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Settings</h2>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="p-2 rounded-lg text-secondary hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Close settings"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5">
                <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-secondary/70 font-bold mb-3">Profile Settings</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <label className="text-xs text-secondary/70">
                      Name
                      <input
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60"
                      />
                    </label>
                    <label className="text-xs text-secondary/70">
                      Email
                      <input
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-secondary/70 font-bold mb-3">Data & Privacy</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => void handleExportSummaryPdf()}
                      className="w-full px-4 py-2.5 rounded-lg text-left text-sm text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} />
                      Export Summary (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExportFullBackupJson()}
                      className="w-full px-4 py-2.5 rounded-lg text-left text-sm text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} />
                      Export Full Backup (JSON)
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full px-4 py-2.5 rounded-lg text-left text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <ShieldAlert size={16} />
                      System Wipe
                    </button>
                  </div>
                </section>

                <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-secondary/70 font-bold mb-3">About</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">App Version</span>
                    <span className="text-white/80">v1.0.4</span>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full px-4 py-2.5 rounded-lg text-left text-sm text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                    onClick={() => window.open('mailto:support@example.com?subject=Feedback%20for%20Yourself', '_blank')}
                  >
                    <Mail size={16} />
                    Feedback
                  </button>
                </section>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    console.info('Settings saved (UI-only)');
                    setSettingsOpen(false);
                  }}
                  className="w-full bg-accent text-background font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area: Responsive Flex Container */}
      <main className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
        
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col h-full min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, filter: 'blur(12px)', scale: 0.995 }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, y: -15, filter: 'blur(12px)', scale: 1.005 }}
              transition={{ 
                duration: 0.6, 
                ease: [0.22, 1, 0.36, 1] 
              }}
              className={`pt-6 md:pt-8 px-10 md:px-16 ${location.pathname === '/' ? 'pb-0' : 'pb-10 md:pb-16'} max-w-[1600px] mx-auto w-full flex-1 flex flex-col h-full min-h-0`}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        </main>

      {/* Mobile Nav (Fallback) */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 glass-surface rounded-full z-50 flex justify-around items-center px-4 border border-white/10 shadow-2xl">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center p-2 rounded-full transition-all ${
                isActive ? 'text-primary bg-white/5' : 'text-secondary/60'
              }`
            }
          >
            <item.icon size={20} />
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
