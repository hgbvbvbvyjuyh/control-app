import { create } from 'zustand';
import { type Failure } from '../db';
import { api } from '../utils/api';
import { saveToDB } from '../lib/persistence';

interface FailureStore {
  failures: Failure[];
  setFailures: (failures: Failure[]) => void;
  loading: boolean;
  load: () => Promise<void>;
  add: (type: 'session' | 'goal' | 'app', linkedId: string, note: string) => Promise<Failure>;
  remove: (id: string) => Promise<void>;
  update: (id: string, note: string) => Promise<void>;
}

export const useFailureStore = create<FailureStore>((set, get) => ({
  failures: [],
  setFailures: (failures) => set({ failures }),
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const failures = await api.get<Failure[]>('/failures');
      set({ failures, loading: false });
      // Sync to IndexedDB
      for (const f of failures) {
        void saveToDB('failures', f);
      }
    } catch (error) {
      console.error('Failed to load failures:', error);
      set({ loading: false });
    }
  },

  add: async (type, linkedId, note) => {
    console.log('[failureStore] add called:', { type, linkedId, note });
    const payload =
      type === 'app' ? { type, linkedId: 0, note } : { type, linkedId, note };
    try {
      const created = await api.post<Failure>('/failures', payload);
      console.log('[failureStore] add success:', created);
      set((state) => ({ failures: [...state.failures, created] }));
      void saveToDB('failures', created);
      return created;
    } catch (error) {
      console.error('[failureStore] add failed:', error);
      throw error;
    }
  },

  remove: async (id) => {
    await api.delete(`/failures/${id}`);
    set({ failures: get().failures.filter(f => String(f.id) !== String(id)) });
  },
  
  update: async (id, note) => {
    const updated = await api.put<Failure>(`/failures/${id}`, { note });
    set({
      failures: get().failures.map(f =>
        String(f.id) === String(id) ? updated : f
      ),
    });
  },
}));
