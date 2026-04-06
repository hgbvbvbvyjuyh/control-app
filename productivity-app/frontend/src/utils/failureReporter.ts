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

type FailureMeta = {
  path?: string;
  method?: string;
  action?: string;
  goalId?: string | number | null;
  status?: number;
};

function cleanRecent(now: number) {
  for (const [k, t] of RECENT) {
    if (now - t > DEDUPE_MS) RECENT.delete(k);
  }
}

export async function reportFailure(message: string, meta: FailureMeta = {}): Promise<void> {
  const msg = (message || 'Unknown failure').trim();
  if (!msg) return;
  if ((meta.path ?? '').startsWith('/failures')) return;

  const note =
    `[${meta.action ?? 'app'}] ${meta.method ?? 'N/A'} ${meta.path ?? 'N/A'} ` +
    `status=${meta.status ?? 'N/A'} goalId=${meta.goalId ?? 'N/A'} :: ${msg}`;
  const dedupeKey = note.slice(0, 280);
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
        type: 'app',
        linkedId: 0,
        note: note.slice(0, 2000),
      }),
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

export function reportValidationFailure(action: string, message: string, meta: FailureMeta = {}): void {
  void reportFailure(message, { ...meta, action });
}
