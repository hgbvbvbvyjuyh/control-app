import { create } from 'zustand';
import { type Failure } from '../db';
import { api } from '../utils/api';
import { saveToDB, deleteFromDB } from '../lib/persistence';

interface FailureStore {
  failures: Failure[];
  setFailures: (failures: Failure[]) => void;
  loading: boolean;
  load: () => Promise<void>;
  add: (type: 'session' | 'goal' | 'app', linkedId: string, note: string) => Promise<Failure>;
  remove: (id: string | number) => Promise<void>;
  update: (id: string | number, note: string) => Promise<void>;
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
    const idStr = String(id);
    console.log('[failureStore] remove called for id:', idStr);
    try {
      await api.delete(`/failures/${idStr}`);
      set((state) => ({
        failures: state.failures.filter(f => String(f.id) !== idStr)
      }));
      void deleteFromDB('failures', id);
      console.log('[failureStore] remove success');
    } catch (error) {
      console.error('[failureStore] remove failed:', error);
      throw error;
    }
  },
  
  update: async (id, note) => {
    const idStr = String(id);
    const updated = await api.put<Failure>(`/failures/${idStr}`, { note });
    set({
      failures: get().failures.map(f =>
        String(f.id) === idStr ? updated : f
      ),
    });
    void saveToDB('failures', updated);
  },
}));
