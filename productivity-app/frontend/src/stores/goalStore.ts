import { create } from 'zustand';
import { type Goal } from '../db';
import { api } from '../utils/api';
import { logClientError } from '../utils/logClientError';
import { db, saveToDB } from '../lib/persistence';

interface GoalStore {
  goals: Goal[];
  setGoals: (goals: Goal[] | ((prev: Goal[]) => Goal[])) => void;
  selectedGoalId: string | null;
  loading: boolean;
  /** IDs of goals currently being deleted to prevent them from reappearing during load() */
  deletingIds: Set<string>;
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
  setGoals: (updater) => set((state) => ({ 
    goals: typeof updater === 'function' ? (updater as (prev: Goal[]) => Goal[])(state.goals) : updater 
  })),
  selectedGoalId: null,
  loading: false,
  deletingIds: new Set(),
  loadError: null,

  clearLoadError: () => set({ loadError: null }),

  load: async () => {
    set({ loading: true, loadError: null });
    try {
      const serverGoals = await api.get<Goal[]>('/goals');
      set((state) => {
        // Preserve optimistic goals that are still pending
        const optimisticGoals = state.goals.filter((g) => String(g.id).startsWith('local-'));
        
        // Filter out goals that are currently being deleted
        const filteredServerGoals = serverGoals.filter(g => !state.deletingIds.has(String(g.id)));

        return {
          goals: [...optimisticGoals, ...filteredServerGoals],
          loading: false,
          loadError: null,
        };
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logClientError('goalStore.load', error);
      set({ loadError: msg || 'Could not load goals', loading: false });
    }
  },

  add: async (frameworkId, data, goalType = 'daily', parentId = null, isIndependent = true, category = 'health', title) => {
    const now = Date.now();
    const localId = `local-${now}`;
    const localGoal: Goal = {
      id: localId,
      title,
      frameworkId,
      data,
      goalType,
      parentId,
      isIndependent,
      category,
      progress: 0,
      status: 'active',
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    set((state) => ({ goals: [localGoal, ...state.goals] }));
    void saveToDB('goals', localGoal);

    try {
      const created = await api.post<Goal>('/goals', {
        title,
        frameworkId,
        data,
        goalType,
        parentId,
        isIndependent,
        category,
      });

      // Replace local goal with server response, but preserve the local ID for key stability
      set((state) => {
        const isAlreadyInList = state.goals.some(g => String(g.id) === String(created.id));
        if (isAlreadyInList) {
          // If load() already brought this goal in, just remove the optimistic one
          return {
            goals: state.goals.filter(g => g.id !== localId),
            selectedGoalId: state.selectedGoalId === localId ? String(created.id) : state.selectedGoalId,
          };
        }
        return {
          goals: state.goals.map((g) => (g.id === localId ? { ...created, id: localId, realId: created.id } : g)),
          selectedGoalId: state.selectedGoalId === localId ? localId : state.selectedGoalId,
        };
      });

      // A bit later, swap to the real ID to finalize (if it's still local)
      setTimeout(() => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === localId ? created : g)),
          selectedGoalId: state.selectedGoalId === localId ? String(created.id) : state.selectedGoalId,
        }));
      }, 1000);

      // Cleanup IndexedDB
      void db.table('goals').delete(localId);
      void saveToDB('goals', created);

      return created;
    } catch (error) {
      // Rollback on failure
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== localId),
      }));
      void db.table('goals').delete(localId);
      logClientError('goalStore.add', error);
      throw error;
    }
  },

  remove: async (id) => {
    const goalId = String(id);
    set((state) => {
      const nextDeleting = new Set(state.deletingIds);
      nextDeleting.add(goalId);
      return {
        goals: state.goals.filter((g) => String(g.id) !== goalId),
        selectedGoalId: String(state.selectedGoalId) === goalId ? null : state.selectedGoalId,
        deletingIds: nextDeleting,
      };
    });
    void db.table('goals').delete(goalId);
    try {
      await api.delete(`/goals/${id}`);
    } finally {
      set((state) => {
        const nextDeleting = new Set(state.deletingIds);
        nextDeleting.delete(goalId);
        return { deletingIds: nextDeleting };
      });
    }
  },

  removeSingle: async (id) => {
    const goalId = String(id);
    set((state) => {
      const nextDeleting = new Set(state.deletingIds);
      nextDeleting.add(goalId);
      return {
        goals: state.goals.filter((g) => String(g.id) !== goalId),
        selectedGoalId: String(state.selectedGoalId) === goalId ? null : state.selectedGoalId,
        deletingIds: nextDeleting,
      };
    });
    void db.table('goals').delete(goalId);
    try {
      await api.delete(`/goals/${id}?cascade=false`);
    } finally {
      set((state) => {
        const nextDeleting = new Set(state.deletingIds);
        nextDeleting.delete(goalId);
        return { deletingIds: nextDeleting };
      });
    }
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
