import { useFailureStore } from '../stores/failureStore';

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
  const dedupeKey = `${input.type}|${linkedId}|${msg}`.slice(0, 280);
  const now = Date.now();
  cleanRecent(now);
  if (RECENT.has(dedupeKey)) return;
  RECENT.set(dedupeKey, now);

  try {
    // Use the store's add method to ensure global state and IndexedDB are updated.
    await useFailureStore.getState().add(input.type, linkedId, msg.slice(0, 2000));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:failure-logged'));
    }
  } catch (error) {
    console.error('[failureReporter] logUserFailure failed:', error);
  }
}
