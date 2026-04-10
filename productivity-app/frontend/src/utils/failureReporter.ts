import { apiRequest } from './api';

const RECENT = new Map<string, number>();
const DEDUPE_MS = 3000;

function cleanRecent(now: number) {
  for (const [k, t] of RECENT) {
    if (now - t > DEDUPE_MS) RECENT.delete(k);
  }
}

export async function logUserFailure(input: {
  goalId: string | number;
  linkedId?: string | number;
  type: 'goal' | 'session';
  message: string;
  timestamp?: string;
}): Promise<void> {
  const goalId = String(input.goalId ?? '').trim();
  const linkedId = String(input.linkedId ?? goalId).trim();
  if (!linkedId) return;
  const msg = (input.message || '').trim();
  if (!msg) return;
  const timestamp = input.timestamp ?? new Date().toISOString();
  const dedupeKey = `${input.type}|${linkedId}|${msg}`.slice(0, 280);
  const now = Date.now();
  cleanRecent(now);
  if (RECENT.has(dedupeKey)) return;
  RECENT.set(dedupeKey, now);

  try {
    await apiRequest('/failures', {
      method: 'POST',
      body: JSON.stringify({
        type: input.type,
        linkedId: Number(linkedId),
        note: msg.slice(0, 2000),
        goalId: Number(goalId),
        timestamp,
      }),
    });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:failure-logged'));
    }
  } catch (error) {
    console.error('[failureReporter] logUserFailure failed:', error);
  }
}
