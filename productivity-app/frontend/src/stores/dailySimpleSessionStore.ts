import { create } from 'zustand';
import { api } from '../utils/api';
import { logClientError } from '../utils/logClientError';

export type DailySimpleSessionStatus = 'pending' | 'done' | 'missed';

export interface DailySimpleSession {
  id: string;
  goalId: string;
  duration: number;
  status: DailySimpleSessionStatus;
  note: string;
  createdAt: number;
}

interface DailySimpleSessionStore {
  byGoalId: Record<string, DailySimpleSession[]>;
  loadForGoal: (goalId: string) => Promise<void>;
  add: (goalId: string) => Promise<void>;
  remove: (sessionId: string, goalId: string) => Promise<void>;
  setStatus: (sessionId: string, goalId: string, status: 'done' | 'missed') => Promise<void>;
  updateNote: (sessionId: string, goalId: string, note: string) => Promise<void>;
}

export const useDailySimpleSessionStore = create<DailySimpleSessionStore>((set, get) => {
  /** Latest in-flight load token per goal — ignore stale responses when requests overlap or selection changes quickly. */
  const loadTokens: Record<string, number> = {};

  return {
    byGoalId: {},

    loadForGoal: async (goalId) => {
      const token = (loadTokens[goalId] = (loadTokens[goalId] ?? 0) + 1);
      try {
        const list = await api.get<DailySimpleSession[]>(
          `/daily-simple-sessions?goalId=${encodeURIComponent(goalId)}`
        );
        if (loadTokens[goalId] !== token) return;
        set((s) => ({ byGoalId: { ...s.byGoalId, [goalId]: list } }));
      } catch (err) {
        if (loadTokens[goalId] !== token) return;
        logClientError('dailySimpleSessionStore.loadForGoal', err);
      }
    },

    add: async (goalId) => {
      const created = await api.post<DailySimpleSession>('/daily-simple-sessions', { goalId });
      const cur = get().byGoalId[goalId] ?? [];
      set((s) => ({ byGoalId: { ...s.byGoalId, [goalId]: [created, ...cur] } }));
    },

    remove: async (sessionId, goalId) => {
      await api.delete(`/daily-simple-sessions/${sessionId}`);
      const cur = get().byGoalId[goalId] ?? [];
      set((s) => ({
        byGoalId: {
          ...s.byGoalId,
          [goalId]: cur.filter((x) => String(x.id) !== String(sessionId)),
        },
      }));
    },

    setStatus: async (sessionId, goalId, status) => {
      const updated = await api.put<DailySimpleSession>(`/daily-simple-sessions/${sessionId}`, { status });
      const cur = get().byGoalId[goalId] ?? [];
      set((s) => ({
        byGoalId: {
          ...s.byGoalId,
          [goalId]: cur.map((x) => (String(x.id) === String(sessionId) ? updated : x)),
        },
      }));
    },

    updateNote: async (sessionId, goalId, note) => {
      const updated = await api.put<DailySimpleSession>(`/daily-simple-sessions/${sessionId}`, { note });
      const cur = get().byGoalId[goalId] ?? [];
      set((s) => ({
        byGoalId: {
          ...s.byGoalId,
          [goalId]: cur.map((x) => (String(x.id) === String(sessionId) ? updated : x)),
        },
      }));
    },
  };
});
