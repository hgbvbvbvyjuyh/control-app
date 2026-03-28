import { useToastStore, type Toast } from '../stores/toastStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastMessage = ({ toast }: { toast: Toast }) => {
  const { removeToast } = useToastStore();
  
  const icons = {
    success: <CheckCircle className="text-success" size={18} />,
    error: <AlertCircle className="text-error" size={18} />,
    info: <Info className="text-accent" size={18} />,
  };

  const bgColors = {
    success: 'bg-success/10 border-success/20',
    error: 'bg-error/10 border-error/20',
    info: 'bg-accent/10 border-accent/20',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-lg min-w-[280px] max-w-sm ${bgColors[toast.type]}`}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
      <button 
        onClick={() => removeToast(toast.id)}
        className="text-secondary hover:text-white transition-colors p-1"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastMessage toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
