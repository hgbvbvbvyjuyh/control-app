import { create } from 'zustand';
import { DateTime } from 'luxon';
import { type Session } from '../db';
import { api } from '../utils/api';
import { getBrowserIanaTimeZone } from '../utils/browserTimezone';
import { logClientError } from '../utils/logClientError';
import { useGoalStore } from './goalStore';
import { saveToDB } from '../lib/persistence';

const SESSION_LOCK_KEY = 'active_productivity_session';

interface SessionStore {
  activeSession: Session | null;
  sessions: Session[];
  setSessions: (sessions: Session[]) => void;
  loading: boolean;
  load: () => Promise<void>;
  loadForGoal: (goalId: string) => Promise<Session[]>;
  start: (goalId: string, frameworkData?: Record<string, string>, workTime?: number, restTime?: number) => Promise<Session | null>;
  end: (didAchieveGoal: boolean, mistake?: string, improvementSuggestion?: string) => Promise<void>;
  skip: (reason: string) => Promise<void>;
  tick: () => void;
  restoreSession: () => void;
  resetSession: () => void;
  remove: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeSession: null,
  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const zone = getBrowserIanaTimeZone();
      const since = DateTime.now()
        .setZone(zone)
        .startOf('year')
        .minus({ days: 14 })
        .toMillis();
      const sessions = await api.get<Session[]>(`/sessions?since=${since}`);
      set({ sessions, loading: false });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ loading: false });
    }
  },

  loadForGoal: async (goalId: string) => {
    return api.get<Session[]>(`/sessions?goalId=${goalId}`);
  },

  start: async (goalId: string, frameworkData?: Record<string, string>, workTime?: number, restTime?: number) => {
    try {
      const payload: Record<string, unknown> = { goalId };
      if (frameworkData) payload.frameworkData = JSON.stringify(frameworkData);
      if (workTime) payload.workTime = workTime;
      if (restTime) payload.restTime = restTime;
      
      const created = await api.post<Session>('/sessions', payload);
      await saveToDB('sessions', created);
      set((state) => ({ sessions: [...state.sessions, created] }));
      set({ activeSession: created });
      localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify(created));
      return created;
    } catch (error) {
      console.error('Failed to start session:', error);
      return null;
    }
  },

  end: async (didAchieveGoal: boolean, mistake?: string, improvementSuggestion?: string) => {
    const { activeSession } = get();
    if (!activeSession?.id) return;

    try {
      const updated = await api.post<Session>(`/sessions/${activeSession.id}/end`, {
        didAchieveGoal,
        mistake,
        improvementSuggestion
      });
      set({ activeSession: null, sessions: [updated, ...get().sessions] });
      localStorage.removeItem(SESSION_LOCK_KEY);
      void useGoalStore.getState().load();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  },

  skip: async (reason: string) => {
    const { activeSession } = get();
    if (!activeSession?.id) return;

    try {
      const updated = await api.post<Session>(`/sessions/${activeSession.id}/skip`, {
        skipReason: reason
      });
      set({ activeSession: null, sessions: [updated, ...get().sessions] });
      localStorage.removeItem(SESSION_LOCK_KEY);
      void useGoalStore.getState().load();
    } catch (error) {
      console.error('Failed to skip session:', error);
    }
  },

  tick: () => {
    // Simple elapsed time tracker if needed, otherwise no-op for this version
    // since we use server-side start/end times.
  },

  restoreSession: () => {
    const saved = localStorage.getItem(SESSION_LOCK_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        set({ activeSession: session });
      } catch (err) {
        logClientError('sessionStore.restoreSession.parse', err);
        localStorage.removeItem(SESSION_LOCK_KEY);
      }
    }
  },

  resetSession: () => {
    set({ activeSession: null });
    localStorage.removeItem(SESSION_LOCK_KEY);
  },

  remove: async (id: string) => {
    await api.delete(`/sessions/${id}`);
    const filtered = get().sessions.filter(s => String(s.id) !== String(id));
    set({ sessions: filtered });
    void useGoalStore.getState().load();
  }
}));
