import { useLayoutEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Target, BookOpen, AlertCircle, Download, Trash2, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import { exportAllData } from '../utils/dataExport';
import { db } from '../db';
import { ConfirmModal } from './ConfirmModal';
import { ToastContainer } from './ToastContainer';
import { useConfirmStore } from '../stores/confirmStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../utils/api';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/journal', icon: BookOpen, label: 'Journal' },
  { path: '/failures', icon: AlertCircle, label: 'Failures' },
  { path: '/trash', icon: Archive, label: 'Trash' },
];

export const Layout = () => {
  const { confirm } = useConfirmStore();
  const { showToast } = useToastStore();

  // #region agent log
  useLayoutEffect(() => {
    const endpoint =
      'http://127.0.0.1:7360/ingest/1a627f68-9d52-4e9b-a3ff-9d87cb60833e';
    const mainEl = document.querySelector('main');
    const data = {
      docElClientH: document.documentElement.clientHeight,
      bodyScrollH: document.body.scrollHeight,
      innerH: window.innerHeight,
      mainClientH: mainEl?.clientHeight ?? null,
      mainScrollH: mainEl?.scrollHeight ?? null,
      rootH: document.getElementById('root')?.clientHeight ?? null,
    };
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '1034ba',
      },
      body: JSON.stringify({
        sessionId: '1034ba',
        hypothesisId: 'F',
        location: 'Layout.tsx:scrollChain',
        message: 'post single-scroll-surface css',
        data,
        timestamp: Date.now(),
        runId: 'verify-layout',
      }),
    }).catch(() => {});
  }, []);
  // #endregion

  const handleExport = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `control-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    <div className="flex min-h-screen w-full bg-[#020617] bg-cover bg-center bg-no-repeat font-sans text-text selection:bg-accent/30 selection:text-white">
      <ConfirmModal />
      <ToastContainer />
      
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/5 bg-background/40 backdrop-blur-xl flex-col pt-8 p-3 z-30">
        <h1 className="text-2xl font-black mb-10 px-4 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary tracking-tight">Control.</h1>
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive ? 'bg-primary/20 text-accent shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'hover:bg-white/5 text-secondary'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-semibold text-sm">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-1 pt-6 border-t border-white/5 mb-4">
          <button onClick={handleExport} className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-black text-secondary hover:text-accent p-3 transition-colors">
            <Download size={14} /> Export Plan
          </button>
          <button onClick={handleClear} className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-black text-error/60 hover:text-error p-3 transition-colors">
            <Trash2 size={14} /> System Wipe
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 overflow-auto p-4 pb-24 no-scrollbar md:p-10 md:pb-10 flex flex-col">
        <div className="w-full flex-1 flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-background/80 backdrop-blur-2xl border-t border-white/5 z-50 flex justify-around items-center px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                isActive ? 'text-accent' : 'text-secondary/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.div animate={{ y: isActive ? -4 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                  <item.icon size={24} className={isActive ? 'drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]' : ''} />
                </motion.div>
                {isActive && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="text-[9px] mt-1.5 font-black uppercase tracking-widest absolute bottom-2"
                  >
                    {item.label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
