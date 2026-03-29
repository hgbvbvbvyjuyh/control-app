import { create } from 'zustand';
import { type JournalEntry } from '../db';
import { api } from '../utils/api';

interface JournalStore {
  entries: JournalEntry[];
  loading: boolean;
  load: () => Promise<void>;
  loadByType: (type: JournalEntry['type']) => Promise<JournalEntry[]>;
  add: (type: JournalEntry['type'], date: string, content: JournalEntry['content'], goalId?: string, category?: JournalEntry['category']) => Promise<JournalEntry>;
  update: (id: string, content: JournalEntry['content']) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const entries = await api.get<JournalEntry[]>('/journals');
      set({ entries, loading: false });
    } catch (error) {
      console.error('Failed to load journals:', error);
      set({ loading: false });
    }
  },

  loadByType: async (type) => {
    return api.get<JournalEntry[]>(`/journals?type=${type}`);
  },

  add: async (type, date, content, goalId, category) => {
    const created = await api.post<JournalEntry>('/journals', { type, date, content, goalId, category });
    set({ entries: [created, ...get().entries] });
    return created;
  },

  update: async (id, content) => {
    const updated = await api.put<JournalEntry>(`/journals/${id}`, { content });
    set({
      entries: get().entries.map(e =>
        String(e.id) === String(id) ? updated : e
      ),
    });
  },

  remove: async (id) => {
    await api.delete(`/journals/${id}`);
    set({ entries: get().entries.filter(e => String(e.id) !== String(id)) });
  },
}));
