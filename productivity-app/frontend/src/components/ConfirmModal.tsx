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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-[6px] p-4" onClick={close}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          onClick={e => e.stopPropagation()}
          className="bg-background border border-secondary/30 rounded-3xl p-8 w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border-white/10"
        >
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
                className="w-full py-4 text-secondary hover:text-white transition-colors text-sm font-bold active:scale-95"
              >
                {cancelLabel || 'Wait, go back'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
