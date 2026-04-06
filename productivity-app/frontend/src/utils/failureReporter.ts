import { AUTH_ENABLED } from '../config/authFlags';
import { getAuthToken } from '../stores/authStore';

function normalizeApiBase(raw: unknown): string {
  if (typeof raw !== 'string') return '/api';
  const t = raw.trim();
  if (t === '') return '/api';
  return t.replace(/\/+$/, '');
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE);
const RECENT = new Map<string, number>();
const DEDUPE_MS = 3000;

type UserFailurePayload = {
  linkedId: string;
  note: string;
  goalId: string;
  type: 'goal' | 'session';
  message: string;
  timestamp: string;
};

function cleanRecent(now: number) {
  for (const [k, t] of RECENT) {
    if (now - t > DEDUPE_MS) RECENT.delete(k);
  }
}

export async function logUserFailure(input: {
  goalId: string | number;
  type: 'goal' | 'session';
  message: string;
  timestamp?: string;
}): Promise<void> {
  const goalId = String(input.goalId ?? '').trim();
  if (!goalId) return;
  const msg = (input.message || '').trim();
  if (!msg) return;
  const timestamp = input.timestamp ?? new Date().toISOString();
  const dedupeKey = `${input.type}|${goalId}|${msg}`.slice(0, 280);
  const now = Date.now();
  cleanRecent(now);
  if (RECENT.has(dedupeKey)) return;
  RECENT.set(dedupeKey, now);

  try {
    const token = getAuthToken();
    await fetch(`${API_BASE}/failures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        linkedId: goalId,
        note: msg.slice(0, 2000),
        goalId,
        type: input.type,
        message: msg.slice(0, 2000),
        timestamp,
      } satisfies UserFailurePayload),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:failure-logged'));
    }
  } catch {
    // Don't cascade logging failures.
  }

  // When auth is disabled, avoid noisy local errors for expected 401/403 flows.
  if (!AUTH_ENABLED) return;
}
