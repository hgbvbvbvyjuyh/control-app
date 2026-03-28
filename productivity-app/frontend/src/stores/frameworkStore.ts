import { create } from 'zustand';
import { type Framework } from '../db';
import { api } from '../utils/api';

interface FrameworkStore {
  frameworks: Framework[];
  loading: boolean;
  load: () => Promise<void>;
  add: (name: string, keys: Framework['keys']) => Promise<Framework>;
  remove: (id: string) => Promise<void>;
  update: (id: string, name: string, keys: Framework['keys']) => Promise<void>;
}

export const useFrameworkStore = create<FrameworkStore>((set, get) => ({
  frameworks: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const frameworks = await api.get<Framework[]>('/frameworks');
      set({ frameworks, loading: false });
    } catch (error) {
      console.error('Failed to load frameworks:', error);
      set({ loading: false });
    }
  },

  add: async (name, keys) => {
    const created = await api.post<Framework>('/frameworks', { name, keys });
    set({ frameworks: [created, ...get().frameworks] });
    return created;
  },

  remove: async (id) => {
    await api.delete(`/frameworks/${id}`);
    set({ frameworks: get().frameworks.filter(f => String(f.id) !== String(id)) });
  },

  update: async (id, name, keys) => {
    const updated = await api.put<Framework>(`/frameworks/${id}`, { name, keys });
    set({
      frameworks: get().frameworks.map(f =>
        String(f.id) === String(id) ? updated : f
      ),
    });
  },
}));
