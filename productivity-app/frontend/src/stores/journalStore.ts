import { create } from 'zustand';
import { type JournalEntry } from '../db';
import { api } from '../utils/api';
import { saveToDB, deleteFromDB, getAllFromDB } from '../lib/persistence';

interface JournalStore {
  entries: JournalEntry[];
  setJournals: (entries: JournalEntry[]) => void;
  loading: boolean;
  load: () => Promise<void>;
  loadByType: (type: JournalEntry['type']) => Promise<JournalEntry[]>;
  add: (type: JournalEntry['type'], date: string, content: JournalEntry['content'], goalId?: string, category?: JournalEntry['category']) => Promise<JournalEntry>;
  update: (id: string, content: JournalEntry['content']) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: [],
  setJournals: (entries) => set({ entries }),
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const entries = await api.get<JournalEntry[]>('/journals');
      // Guard: if server returns empty but IDB has data, prefer IDB to avoid data loss
      if (entries.length === 0) {
        try {
          const cached = (await getAllFromDB('journals')) as JournalEntry[];
          if (cached.length > 0) {
            set({ entries: cached, loading: false });
            return;
          }
        } catch (dbErr) {
          console.error('[journalStore] IDB empty-guard check failed:', dbErr);
        }
      }
      set({ entries, loading: false });
      // Sync to IndexedDB for offline resilience
      for (const e of entries) {
        void saveToDB('journals', e);
      }
    } catch (error) {
      console.error('Failed to load journals:', error);
      // FALLBACK: restore from IndexedDB so data survives offline/crash
      try {
        const cached = (await getAllFromDB('journals')) as JournalEntry[];
        if (cached.length > 0) {
          set({ entries: cached, loading: false });
          return;
        }
      } catch (dbErr) {
        console.error('[journalStore] IndexedDB fallback failed:', dbErr);
      }
      set({ loading: false });
    }
  },

  loadByType: async (type) => {
    return api.get<JournalEntry[]>(`/journals?type=${type}`);
  },

  add: async (type, date, content, goalId, category) => {
    try {
      const created = await api.post<JournalEntry>('/journals', { type, date, content, goalId, category });
      set((state) => ({ entries: [...state.entries, created] }));
      void saveToDB('journals', created);
      return created;
    } catch (error) {
      console.error('Failed to add journal:', error);
      throw error;
    }
  },

  update: async (id, content) => {
    try {
      const updated = await api.put<JournalEntry>(`/journals/${id}`, { content });
      set({
        entries: get().entries.map(e =>
          String(e.id) === String(id) ? updated : e
        ),
      });
      void saveToDB('journals', updated);
    } catch (error) {
      console.error('Failed to update journal:', error);
      throw error;
    }
  },

  remove: async (id) => {
    try {
      await api.delete(`/journals/${id}`);
      set({ entries: get().entries.filter(e => String(e.id) !== String(id)) });
      void deleteFromDB('journals', id);
    } catch (error) {
      console.error('Failed to remove journal:', error);
      throw error;
    }
  },
}));
