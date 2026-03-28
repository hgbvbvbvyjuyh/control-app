import { create } from 'zustand';
import { api } from '../utils/api';
import type { Goal, Session, JournalEntry, Failure, Framework } from '../db';

interface TrashState {
  trash: {
    goals: Goal[];
    sessions: Session[];
    frameworks: Framework[];
    journals: JournalEntry[];
    failures: Failure[];
  };
  loading: boolean;
  error: string | null;
  fetchTrash: () => Promise<void>;
  restore: (type: 'goal' | 'session' | 'framework' | 'journal' | 'failure', id: string) => Promise<void>;
  purge: (type: 'goal' | 'session' | 'framework' | 'journal' | 'failure', id: string) => Promise<void>;
}

export const useTrashStore = create<TrashState>((set, get) => ({
  trash: {
    goals: [],
    sessions: [],
    frameworks: [],
    journals: [],
    failures: [],
  },
  loading: false,
  error: null,

  fetchTrash: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/trash');
      set({ trash: data as any, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  restore: async (type, id) => {
    try {
      await api.post('/trash/restore', { type, id });
      await get().fetchTrash();
      // Reload pages that might have been affected
      window.location.reload(); 
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  purge: async (type, id) => {
    try {
      await api.delete(`/trash/${type}/${id}`);
      await get().fetchTrash();
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
