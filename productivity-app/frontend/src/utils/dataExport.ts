import { buildClientExportCalendarContext } from '../constants/progressCalendarMeta';
import { api } from './api';
import { type Framework, type Goal, type Session, type JournalEntry, type Failure } from '../db';

export async function exportAllData(): Promise<string> {
  const [frameworks, goals, sessions, journals, failures] = await Promise.all([
    api.get<Framework[]>('/frameworks'),
    api.get<Goal[]>('/goals'),
    api.get<Session[]>('/sessions'),
    api.get<JournalEntry[]>('/journals'),
    api.get<Failure[]>('/failures'),
  ]);

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    calendarContext: buildClientExportCalendarContext(),
    data: {
      goals:      Array.isArray(goals)      ? goals      : [],
      sessions:   Array.isArray(sessions)   ? sessions   : [],
      frameworks: Array.isArray(frameworks) ? frameworks : [],
      journal:    Array.isArray(journals)   ? journals   : [],
      failures:   Array.isArray(failures)   ? failures   : [],
    },
  };

  // Replace undefined values with null so JSON is always valid
  return JSON.stringify(payload, (_key, value) => value ?? null, 2);
}


export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json);
  
  // Note: This is an expensive operation as we're doing it item-by-item
  // The backend should ideally support a bulk import endpoint
  
  // Frameworks
  if (data.frameworks) {
    for (const fw of data.frameworks) {
      await api.post('/frameworks', fw);
    }
  }
  // Goals
  if (data.goals) {
    for (const goal of data.goals) {
      await api.post('/goals', goal);
    }
  }
  // Similar for others if needed, but for now this confirms the switch
}
