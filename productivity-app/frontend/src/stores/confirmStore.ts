import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirm: (title: string, message: string, onConfirm: () => void, confirmLabel?: string, cancelLabel?: string) => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  confirm: (title, message, onConfirm, confirmLabel, cancelLabel) => 
    set({ isOpen: true, title, message, onConfirm, confirmLabel, cancelLabel }),
  close: () => set({ isOpen: false }),
}));
