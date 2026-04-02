import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, BookOpen, AlertCircle, Download, Trash2, ShieldAlert } from 'lucide-react';
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
  const { goals, selectedGoalId, load: loadGoals } = useGoalStore();
  const { loadForGoal: loadSessionsForGoal } = useSessionStore();
  const { loadForGoal: loadSimpleSessionsForGoal } = useDailySimpleSessionStore();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!exportRef.current) return;
      const t = e.target as Node;
      if (!exportRef.current.contains(t)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [exportOpen]);

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
      
      {/* 
        Sidebar Perfection:
        - Fixed width (w-72) flex container
        - shrink-0 prevents it from shrinking
        - glass-panel for depth
      */}
      <aside className="hidden md:flex h-full w-72 shrink-0 flex-col p-8 z-30 glass-panel border-r border-white/5 relative">
        <motion.div 
          initial={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 px-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <div className="w-3 h-3 bg-white rounded-full blur-[1px]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white leading-none">
                Control.
              </h1>
              <p className="text-[9px] text-secondary/40 uppercase tracking-[0.25em] font-bold mt-1">
                v1.0.4
              </p>
            </div>
          </div>
        </motion.div>

        <nav className="flex flex-col gap-3 relative">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative group outline-none"
            >
              {({ isActive }) => (
                <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-500 relative z-10 ${
                  isActive ? 'text-white' : 'text-secondary/60 hover:text-white hover:bg-white/[0.03]'
                }`}>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                      initial={false}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 30 
                      }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute -left-1 top-1/4 bottom-1/4 w-1 bg-primary rounded-full blur-[2px]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon size={18} className={`relative z-10 transition-all duration-500 ${isActive ? 'scale-110 text-primary' : 'group-hover:scale-105'}`} />
                  <span className="font-bold text-xs uppercase tracking-[0.1em] relative z-10">{item.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 pt-8 border-t border-white/5">
          <div ref={exportRef} className="relative">
            <motion.button
              whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.03)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setExportOpen((prev) => !prev)}
              className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-black text-secondary/40 hover:text-white/80 p-4 transition-all rounded-xl w-full"
              type="button"
            >
              <Download size={14} className="opacity-50" />
              <span>Export</span>
              <span className="ml-auto opacity-60">{exportOpen ? '▲' : '▼'}</span>
            </motion.button>

            {exportOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-[#0B1220] border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    void handleExportSummaryPdf();
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-secondary hover:bg-white/5 transition-colors"
                >
                  Export Summary (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    void handleExportFullBackupJson();
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-secondary hover:bg-white/5 transition-colors border-t border-white/5"
                >
                  Export Full Backup (JSON)
                </button>
              </div>
            )}
          </div>
          
          <motion.button 
            whileHover={{ x: 4, backgroundColor: 'rgba(239,68,68,0.05)', color: '#EF4444' }} 
            whileTap={{ scale: 0.98 }} 
            onClick={handleClear} 
            className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-black text-secondary/40 hover:text-error p-4 transition-all rounded-xl group/wipe"
          >
            <ShieldAlert size={14} className="opacity-30 group-hover/wipe:opacity-100 transition-opacity" />
            <span>System Wipe</span>
          </motion.button>
        </div>
      </aside>

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
