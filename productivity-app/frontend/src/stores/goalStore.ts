import { create } from 'zustand';
import { type Goal } from '../db';
import { api } from '../utils/api';
import { logClientError } from '../utils/logClientError';

interface GoalStore {
  goals: Goal[];
  selectedGoalId: string | null;
  loading: boolean;
  /** Set when the last goals fetch failed (cleared on success). */
  loadError: string | null;
  clearLoadError: () => void;
  load: () => Promise<void>;
  add: (
    frameworkId: string | null,
    data: Record<string, string>,
    goalType?: Goal['goalType'],
    parentId?: string | null,
    isIndependent?: boolean,
    category?: Goal['category'],
    title?: string
  ) => Promise<Goal>;
  remove: (id: string) => Promise<void>;
  removeSingle: (id: string) => Promise<void>;
  update: (
    id: string,
    data: Record<string, string>,
    goalType?: Goal['goalType'],
    category?: Goal['category'],
    frameworkId?: string | null,
    title?: string
  ) => Promise<void>;
  patchStatus: (id: string, status: Goal['status']) => Promise<void>;
  select: (id: string | null) => void;
  getByFramework: (frameworkId: string | null) => Goal[];
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  selectedGoalId: null,
  loading: false,
  loadError: null,

  clearLoadError: () => set({ loadError: null }),

  load: async () => {
    set({ loading: true, loadError: null });
    try {
      const goals = await api.get<Goal[]>('/goals');
      set({ goals, loading: false, loadError: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logClientError('goalStore.load', error);
      set({ loadError: msg || 'Could not load goals', loading: false });
    }
  },

  add: async (frameworkId, data, goalType = 'daily', parentId = null, isIndependent = true, category = 'health', title) => {
    const created = await api.post<Goal>('/goals', { title, frameworkId, data, goalType, parentId, isIndependent, category });
    set({ goals: [created, ...get().goals] });
    return created;
  },

  remove: async (id) => {
    // Default backend behavior is cascade delete, so reload after deletion
    // to remove the entire deleted subtree from local state.
    await api.delete(`/goals/${id}`);
    void get().load();
  },

  removeSingle: async (id) => {
    // Non-cascading delete: delete only this goal (no descendants).
    await api.delete(`/goals/${id}?cascade=false`);
    void get().load();
  },

  update: async (id, data, goalType, category, frameworkId, title) => {
    const payload: Record<string, unknown> = { data, goalType, category };
    if (frameworkId !== undefined) payload.frameworkId = frameworkId;
    if (title !== undefined) payload.title = title;
    const updated = await api.put<Goal>(`/goals/${id}`, payload);
    set({
      goals: get().goals.map(g =>
        String(g.id) === String(id) ? updated : g
      ),
    });
  },

  patchStatus: async (id, status) => {
    const updated = await api.put<Goal>(`/goals/${id}`, { status });
    set({
      goals: get().goals.map(g =>
        String(g.id) === String(id) ? { ...g, status: updated.status ?? status } : g
      ),
    });
  },

  select: (id) => set({ selectedGoalId: id }),

  getByFramework: (frameworkId) => {
    return get().goals.filter(g => {
      if (frameworkId == null) return g.frameworkId == null;
      return String(g.frameworkId) === String(frameworkId);
    });
  },
}));
