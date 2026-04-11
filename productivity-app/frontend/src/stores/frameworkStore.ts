import { create } from 'zustand';
import { type Framework } from '../db';
import { api } from '../utils/api';
import { saveToDB, deleteFromDB, getAllFromDB } from '../lib/persistence';

interface FrameworkStore {
  frameworks: Framework[];
  setFrameworks: (frameworks: Framework[]) => void;
  loading: boolean;
  load: () => Promise<void>;
  add: (name: string, keys: Framework['keys']) => Promise<Framework>;
  remove: (id: string) => Promise<void>;
  update: (id: string, name: string, keys: Framework['keys']) => Promise<void>;
}

export const useFrameworkStore = create<FrameworkStore>((set, get) => ({
  frameworks: [],
  setFrameworks: (frameworks) => set({ frameworks }),
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const frameworks = await api.get<Framework[]>('/frameworks');
      set({ frameworks, loading: false });
      // Sync to IndexedDB for offline resilience
      for (const f of frameworks) {
        void saveToDB('frameworks', f);
      }
    } catch (error) {
      console.error('Failed to load frameworks:', error);
      // FALLBACK: restore from IndexedDB so data survives offline/crash
      try {
        const cached = (await getAllFromDB('frameworks')) as Framework[];
        if (cached.length > 0) {
          set({ frameworks: cached, loading: false });
          return;
        }
      } catch (dbErr) {
        console.error('[frameworkStore] IndexedDB fallback failed:', dbErr);
      }
      set({ loading: false });
    }
  },

  add: async (name, keys) => {
    try {
      const created = await api.post<Framework>('/frameworks', { name, keys });
      set({ frameworks: [created, ...get().frameworks] });
      void saveToDB('frameworks', created);
      return created;
    } catch (error) {
      console.error('Failed to add framework:', error);
      throw error;
    }
  },

  remove: async (id) => {
    try {
      await api.delete(`/frameworks/${id}`);
      set({ frameworks: get().frameworks.filter(f => String(f.id) !== String(id)) });
      void deleteFromDB('frameworks', id);
    } catch (error) {
      console.error('Failed to remove framework:', error);
      throw error;
    }
  },

  update: async (id, name, keys) => {
    try {
      const updated = await api.put<Framework>(`/frameworks/${id}`, { name, keys });
      set({
        frameworks: get().frameworks.map(f =>
          String(f.id) === String(id) ? updated : f
        ),
      });
      void saveToDB('frameworks', updated);
    } catch (error) {
      console.error('Failed to update framework:', error);
      throw error;
    }
  },
}));
