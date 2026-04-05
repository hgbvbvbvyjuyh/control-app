import { create } from 'zustand';
import { api } from '../utils/api';
import type { Goal, Session, JournalEntry, Failure, Framework } from '../db';
import { logClientError } from '../utils/logClientError';

export type TrashEntity = 'goal' | 'session' | 'framework' | 'journal' | 'failure';

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
  restore: (type: TrashEntity, id: string) => Promise<void>;
  purge: (type: TrashEntity, id: string) => Promise<void>;
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
      const data = await api.get<TrashState['trash']>('/trash');
      set({ trash: data, loading: false });
    } catch (err: unknown) {
      logClientError('trashStore.fetchTrash', err);
      const message = err instanceof Error ? err.message : 'Failed to load trash';
      set({ error: message, loading: false });
    }
  },

  restore: async (type, id) => {
    const cleanId = String(id ?? '').trim();
    if (!cleanId) {
      set({ error: 'Cannot restore: missing id' });
      return;
    }
    try {
      await api.post('/trash/restore', { type, id: cleanId });
      await get().fetchTrash();
      // Reload pages that might have been affected
      window.location.reload(); 
    } catch (err: unknown) {
      logClientError('trashStore.restore', err, { type, id });
      const message = err instanceof Error ? err.message : 'Restore failed';
      set({ error: message });
    }
  },

  purge: async (type, id) => {
    const cleanId = String(id ?? '').trim();
    if (!cleanId) {
      set({ error: 'Cannot delete: missing id' });
      return;
    }
    try {
      await api.delete(`/trash/${type}/${cleanId}`);
      await get().fetchTrash();
    } catch (err: unknown) {
      logClientError('trashStore.purge', err, { type, id });
      const message = err instanceof Error ? err.message : 'Purge failed';
      set({ error: message });
    }
  },
}));
