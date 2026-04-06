import { create } from 'zustand';
import { type Failure } from '../db';
import { api } from '../utils/api';

interface FailureStore {
  failures: Failure[];
  loading: boolean;
  load: () => Promise<void>;
  add: (type: 'session' | 'goal' | 'app', linkedId: string, note: string) => Promise<Failure>;
  remove: (id: string) => Promise<void>;
  update: (id: string, note: string) => Promise<void>;
}

export const useFailureStore = create<FailureStore>((set, get) => ({
  failures: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const failures = await api.get<Failure[]>('/failures');
      set({ failures, loading: false });
    } catch (error) {
      console.error('Failed to load failures:', error);
      set({ loading: false });
    }
  },

  add: async (type, linkedId, note) => {
    const payload =
      type === 'app' ? { type, linkedId: 0, note } : { type, linkedId, note };
    const created = await api.post<Failure>('/failures', payload);
    set({ failures: [created, ...get().failures] });
    return created;
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
