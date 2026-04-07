import { useConfirmStore } from '../stores/confirmStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export const ConfirmModal = () => {
  const { isOpen, title, message, confirmLabel, cancelLabel, onConfirm, close } = useConfirmStore();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    close();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={close}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="bg-surface/50 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 md:p-10 w-full max-w-sm shadow-2xl shadow-black/80 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-rose-400 opacity-60" />
            
            <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6 border border-error/20">
              <AlertCircle size={32} className="text-error" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{title}</h2>
            <p className="text-secondary text-sm leading-relaxed mb-8">
              {message}
            </p>
            
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={handleConfirm}
                className="w-full py-4 bg-error text-white font-black rounded-2xl hover:bg-error/90 transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] active:scale-95"
              >
                {confirmLabel || 'Confirm Deletion'}
              </button>
              <button
                onClick={close}
                className="w-full py-4 text-secondary hover:text-white transition-all duration-300 text-sm font-bold active:scale-95"
              >
                {cancelLabel || 'Wait, go back'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
