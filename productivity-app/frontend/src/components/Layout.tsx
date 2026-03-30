import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, BookOpen, AlertCircle, Download, Trash2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const location = useLocation();

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
    <div className="flex min-h-screen w-full bg-[#0F172A] font-sans text-text selection:bg-accent/30 selection:text-white overflow-hidden">
      <ConfirmModal />
      <ToastContainer />
      
      {/* Sidebar — h-full fills the flex-row container */}
      <aside className="hidden md:flex h-full w-64 shrink-0 border-r border-white/5 bg-surface/40 backdrop-blur-2xl flex-col pt-8 p-4 z-30 shadow-[4px_0_32px_rgba(0,0,0,0.4)]">
        <motion.h1 
          initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl font-black mb-10 px-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent tracking-tighter drop-shadow-sm"
        >
          Control.
        </motion.h1>
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
          className="flex flex-col gap-2 relative"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative rounded-xl outline-none"
            >
              {({ isActive }) => (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors relative z-10 ${
                    isActive ? 'text-white' : 'text-secondary hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_20px_rgba(59,130,246,0.1)] z-0"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.icon size={20} className="relative z-10" />
                  <span className="font-medium text-sm tracking-wide relative z-10">{item.label}</span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </motion.div>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-1 pt-6 border-t border-white/10 mb-4">
          <motion.button whileHover={{ scale: 1.02, x: 2 }} whileTap={{ scale: 0.98 }} onClick={handleExport} className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-secondary hover:text-white p-3 transition-colors rounded-xl hover:bg-white/5">
            <Download size={14} /> Export Plan
          </motion.button>
          <motion.button whileHover={{ scale: 1.02, x: 2 }} whileTap={{ scale: 0.98 }} onClick={handleClear} className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-error/80 hover:text-error p-3 transition-colors rounded-xl hover:bg-error/10">
            <Trash2 size={14} /> System Wipe
          </motion.button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 min-h-0 overflow-hidden flex flex-col bg-transparent">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, filter: 'blur(8px)', scale: 0.99 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, y: -10, filter: 'blur(8px)', scale: 0.99 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex-1 min-h-0 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
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
