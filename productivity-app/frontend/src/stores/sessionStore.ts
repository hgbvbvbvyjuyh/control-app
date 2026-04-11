import { create } from 'zustand';
import { DateTime } from 'luxon';
import { type Session } from '../db';
import { api } from '../utils/api';
import { getBrowserIanaTimeZone } from '../utils/browserTimezone';
import { logClientError } from '../utils/logClientError';
import { useGoalStore } from './goalStore';
import { saveToDB, getAllFromDB, deleteFromDB } from '../lib/persistence';

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
  // setSessions is called by App.tsx on hydration — also restore activeSession from the list
  setSessions: (sessions) => {
    const activeSession = sessions.find(s => s.status === 'active') ?? null;
    set({ sessions, activeSession });
  },
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

      // Guard: if server returns empty but IDB has data, prefer IDB to avoid data loss
      if (sessions.length === 0) {
        try {
          const cached = (await getAllFromDB('sessions')) as Session[];
          if (cached.length > 0) {
            const activeSession = cached.find(s => s.status === 'active') || null;
            set({ sessions: cached, activeSession, loading: false });
            return;
          }
        } catch (dbErr) {
          console.error('[sessionStore] IDB empty-guard check failed:', dbErr);
        }
      }

      // Per point 1: Define active session separately.
      // Since it's from API, we trust the status is correct.
      const activeSession = sessions.find(s => s.status === 'active') || null;
      
      set({ sessions, activeSession, loading: false });
      // Sync server sessions to IndexedDB for offline resilience
      for (const s of sessions) {
        void saveToDB('sessions', s);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      // FALLBACK: restore from IndexedDB so data survives offline/crash
      try {
        const cached = (await getAllFromDB('sessions')) as Session[];
        if (cached.length > 0) {
          const activeSession = cached.find(s => s.status === 'active') || null;
          set({ sessions: cached, activeSession, loading: false });
          return;
        }
      } catch (dbErr) {
        console.error('[sessionStore] IndexedDB fallback failed:', dbErr);
      }
      set({ loading: false });
    }
  },

  loadForGoal: async (goalId: string) => {
    return api.get<Session[]>(`/sessions?goalId=${goalId}`);
  },

  start: async (goalId: string, frameworkData?: Record<string, string>, workTime?: number, restTime?: number) => {
    // Guard: check local state first — avoids unnecessary round-trip
    const localActive = get().activeSession;
    if (localActive?.status === 'active') {
      console.warn('[sessionStore] start blocked — active session already in state:', localActive.id);
      return null;
    }

    try {
      // Also verify with server to catch cross-tab or server-side stale sessions
      const active = await api.get<Session | null>('/sessions/active');
      if (active) {
        set({ activeSession: active });
        void saveToDB('sessions', active);
        return null;
      }

      const payload: Record<string, unknown> = { goalId };
      if (frameworkData) payload.frameworkData = JSON.stringify(frameworkData);
      if (workTime) payload.workTime = workTime;
      if (restTime) payload.restTime = restTime;
      
      const created = await api.post<Session>('/sessions', payload);
      set((state) => ({
        sessions: [...state.sessions.filter(s => s.id !== created.id), created],
        activeSession: created,
      }));
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

    // Optimistically clear active session so UI never gets stuck
    set({ activeSession: null });
    localStorage.removeItem(SESSION_LOCK_KEY);

    try {
      const updated = await api.post<Session>(`/sessions/${activeSession.id}/end`, {
        didAchieveGoal,
        mistake,
        improvementSuggestion
      });
      // Replace the existing session entry instead of prepending a duplicate
      set((state) => ({
        sessions: state.sessions.map(s =>
          String(s.id) === String(updated.id) ? updated : s
        ),
      }));
      void saveToDB('sessions', updated);
      void useGoalStore.getState().load();
    } catch (error) {
      console.error('Failed to end session:', error);
      // Pessimistically mark the local session as completed so it doesn't get stuck as 'active'
      const fallback: Session = { ...activeSession, status: 'completed', didAchieveGoal, endTime: Date.now() };
      set((state) => ({
        sessions: state.sessions.map(s =>
          String(s.id) === String(activeSession.id) ? fallback : s
        ),
      }));
      void saveToDB('sessions', fallback);
    }
  },

  skip: async (reason: string) => {
    const { activeSession } = get();
    if (!activeSession?.id) return;

    // Optimistically clear active session so UI never gets stuck
    set({ activeSession: null });
    localStorage.removeItem(SESSION_LOCK_KEY);

    try {
      const updated = await api.post<Session>(`/sessions/${activeSession.id}/skip`, {
        skipReason: reason
      });
      // Replace the existing session entry instead of prepending a duplicate
      set((state) => ({
        sessions: state.sessions.map(s =>
          String(s.id) === String(updated.id) ? updated : s
        ),
      }));
      void saveToDB('sessions', updated);
      void useGoalStore.getState().load();
    } catch (error) {
      console.error('Failed to skip session:', error);
      // Pessimistically mark locally as skipped so it doesn't remain stuck
      const fallback: Session = { ...activeSession, status: 'skipped', skipReason: reason, endTime: Date.now() };
      set((state) => ({
        sessions: state.sessions.map(s =>
          String(s.id) === String(activeSession.id) ? fallback : s
        ),
      }));
      void saveToDB('sessions', fallback);
    }
  },

  tick: () => {
    // Simple elapsed time tracker if needed, otherwise no-op for this version
    // since we use server-side start/end times.
  },

  restoreSession: async () => {
    try {
      // 1. Check with the backend for a truly active session (source of truth).
      const activeFromServer = await api.get<Session | null>('/sessions/active');
      
      if (activeFromServer) {
        // Update the session in our local list too (might have changed)
        set((state) => ({
          activeSession: activeFromServer,
          sessions: state.sessions.some(s => String(s.id) === String(activeFromServer.id))
            ? state.sessions.map(s => String(s.id) === String(activeFromServer.id) ? activeFromServer : s)
            : [...state.sessions, activeFromServer],
        }));
        void saveToDB('sessions', activeFromServer);
        localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify(activeFromServer));
        return;
      }

      // 2. Server says no active session — clear local state.
      // Also auto-heal any locally-stuck 'active' sessions from IndexedDB.
      const sessions = await getAllFromDB('sessions') as Session[];
      const stuckSessions = sessions.filter(s => s.status === 'active');
      if (stuckSessions.length > 0) {
        console.warn('[sessionStore] Found', stuckSessions.length, 'stuck active session(s) — marking as failed');
        const healed = sessions.map(s =>
          s.status === 'active'
            ? { ...s, status: 'failed' as const, endTime: Date.now() }
            : s
        );
        for (const s of healed.filter(s => s.status === 'failed')) {
          void saveToDB('sessions', s);
        }
        set({ activeSession: null, sessions: healed });
      } else {
        set({ activeSession: null, sessions });
      }
      localStorage.removeItem(SESSION_LOCK_KEY);
    } catch (err) {
      logClientError('sessionStore.restoreSession', err);
      // Fallback: If API fails, restore from IndexedDB and trust it.
      const sessions = await getAllFromDB('sessions') as Session[];
      const active = sessions.find(s => s.status === 'active') ?? null;
      set({ sessions, activeSession: active });
    }
  },

  resetSession: () => {
    set({ activeSession: null });
    localStorage.removeItem(SESSION_LOCK_KEY);
  },

  remove: async (id: string) => {
    try {
      await api.delete(`/sessions/${id}`);
      const filtered = get().sessions.filter(s => String(s.id) !== String(id));
      set({ sessions: filtered });
      void deleteFromDB('sessions', id);
      void useGoalStore.getState().load();
    } catch (error) {
      console.error('Failed to remove session:', error);
    }
  }
}));
