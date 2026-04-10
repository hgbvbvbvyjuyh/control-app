import { create } from 'zustand';
import { DateTime } from 'luxon';
import { type Session } from '../db';
import { api } from '../utils/api';
import { getBrowserIanaTimeZone } from '../utils/browserTimezone';
import { logClientError } from '../utils/logClientError';
import { useGoalStore } from './goalStore';
import { saveToDB, getAllFromDB } from '../lib/persistence';

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
  restoreSession: () => Promise<void>;
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
      
      // Per point 1: Define active session separately.
      // Since it's from API, we trust the status is correct.
      const activeSession = sessions.find(s => s.status === 'active') || null;
      
      set({ sessions, activeSession, loading: false });
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
      // Check for active session before starting
      const active = await api.get<Session | null>('/sessions/active');
      if (active) {
        set({ activeSession: active });
        throw new Error('Another session is already active. Redirecting...');
      }

      const payload: Record<string, unknown> = { goalId };
      if (frameworkData) payload.frameworkData = JSON.stringify(frameworkData);
      if (workTime) payload.workTime = workTime;
      if (restTime) payload.restTime = restTime;
      
      const created = await api.post<Session>('/sessions', payload);
      set((state) => ({ sessions: [...state.sessions, created] }));
      set({ activeSession: created });
      localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify(created));
      void saveToDB('sessions', created);
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
      // Point 3 & 4: Ensure it's not active anymore and saved to DB
      void saveToDB('sessions', updated);
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
      // Point 4: Ensure it's not active anymore and saved to DB
      void saveToDB('sessions', updated);
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

  restoreSession: async () => {
    try {
      // 1. First, check with the backend for a truly active session.
      // This ensures we are in sync with the source of truth (the server).
      const activeFromServer = await api.get<Session | null>('/sessions/active');
      
      if (activeFromServer) {
        set({ activeSession: activeFromServer });
        void saveToDB('sessions', activeFromServer);
        localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify(activeFromServer));
        return;
      }

      // 2. If the server says there's no active session, we MUST clear our local active state.
      // This prevents the 409 "Another session is already active" error when trying to start a new one.
      set({ activeSession: null });
      localStorage.removeItem(SESSION_LOCK_KEY);
      
      // Still load history for the UI
      const sessions = await getAllFromDB('sessions');
      set({ sessions });
    } catch (err) {
      logClientError('sessionStore.restoreSession', err);
      // Fallback: If API fails, try local only but don't trust it for "starting" new ones.
      const sessions = await getAllFromDB('sessions');
      const active = sessions.find(s => s.status === 'active') || null;
      set({ sessions, activeSession: active });
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
