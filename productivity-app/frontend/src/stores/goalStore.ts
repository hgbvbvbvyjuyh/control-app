import { create } from 'zustand';
import { type Goal } from '../db';
import { api } from '../utils/api';

interface GoalStore {
  goals: Goal[];
  selectedGoalId: string | null;
  loading: boolean;
  load: () => Promise<void>;
  add: (frameworkId: string, data: Record<string, string>, goalType?: Goal['goalType'], parentId?: string | null, isIndependent?: boolean, category?: Goal['category']) => Promise<Goal>;
  remove: (id: string) => Promise<void>;
  update: (id: string, data: Record<string, string>, goalType?: Goal['goalType'], category?: Goal['category']) => Promise<void>;
  select: (id: string | null) => void;
  getByFramework: (frameworkId: string) => Goal[];
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  selectedGoalId: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const goals = await api.get<Goal[]>('/goals');
      set({ goals, loading: false });
    } catch (error) {
      console.error('Failed to load goals:', error);
      set({ loading: false });
    }
  },

  add: async (frameworkId, data, goalType = 'daily', parentId = null, isIndependent = true, category = 'health') => {
    const created = await api.post<Goal>('/goals', { frameworkId, data, goalType, parentId, isIndependent, category });
    set({ goals: [created, ...get().goals] });
    return created;
  },

  remove: async (id) => {
    await api.delete(`/goals/${id}`);
    set({ goals: get().goals.filter(g => String(g.id) !== String(id)) });
  },

  update: async (id, data, goalType, category) => {
    const updated = await api.put<Goal>(`/goals/${id}`, { data, goalType, category });
    set({
      goals: get().goals.map(g =>
        String(g.id) === String(id) ? updated : g
      ),
    });
  },

  select: (id) => set({ selectedGoalId: id }),

  getByFramework: (frameworkId) => {
    return get().goals.filter(g => String(g.frameworkId) === String(frameworkId));
  },
}));
