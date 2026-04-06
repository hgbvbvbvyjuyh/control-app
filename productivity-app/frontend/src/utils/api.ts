import { getBrowserIanaTimeZone } from './browserTimezone';
import { AUTH_ENABLED } from '../config/authFlags';
import { getAuthToken } from '../stores/authStore';
import { logClientError } from './logClientError';

/** Trim env and strip trailing slashes so `/api/` + `/path` does not become `//path`. */
function normalizeApiBase(raw: unknown): string {
  if (typeof raw !== 'string') return '/api';
  const t = raw.trim();
  if (t === '') return '/api';
  return t.replace(/\/+$/, '');
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE);

/** Avoid recursive failure logging when POST /failures itself errors. */
let reportingApiFailure = false;

function buildApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

const RENDER_COLD_START_STATUSES = new Set([502, 503, 524]);
const DAILY_SIMPLE_POST_MAX_ATTEMPTS = 4;

function backoffAfterTransientMs(attempt: number): number {
  return Math.min(2500, 350 * 2 ** (attempt - 1));
}

function timezoneHeaders(): Record<string, string> {
  const tz = getBrowserIanaTimeZone();
  return tz ? { 'X-User-Timezone': tz } : {};
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildApiUrl(path);
  const method = (options.method || 'GET').toUpperCase();
  const isDailySimplePost = path.includes('daily-simple-sessions') && method === 'POST';
  const token = getAuthToken();

  const maxFetchAttempts = isDailySimplePost ? DAILY_SIMPLE_POST_MAX_ATTEMPTS : 1;
  let response!: Response;
  let fetchAttempt = 0;
  // POST /daily-simple-sessions: retry transient gateway errors (e.g. Render cold start) without changing request body.
  while (true) {
    fetchAttempt += 1;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...timezoneHeaders(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    } catch (e) {
      if (isDailySimplePost && fetchAttempt < maxFetchAttempts) {
        await new Promise<void>(r => {
          setTimeout(r, backoffAfterTransientMs(fetchAttempt));
        });
        continue;
      }
      if (!reportingApiFailure && !path.startsWith('/failures')) {
        reportingApiFailure = true;
        try {
          const msg = e instanceof Error ? e.message : String(e);
          const note = `[network] ${method} ${path}: ${msg}`.slice(0, 2000);
          await api.post('/failures', { type: 'app', linkedId: 0, note });
        } catch {
          /* ignore secondary failures */
        } finally {
          reportingApiFailure = false;
        }
      }
      throw e;
    }

    const transient =
      !response.ok && RENDER_COLD_START_STATUSES.has(response.status);
    if (!isDailySimplePost || !transient || fetchAttempt >= maxFetchAttempts) {
      break;
    }
    await new Promise<void>(r => {
      setTimeout(r, backoffAfterTransientMs(fetchAttempt));
    });
  }

  if (!response.ok) {
    const text = await response.text();
    let message = `API request failed (${response.status})`;
    try {
      const data = JSON.parse(text) as { error?: string; message?: string };
      message = data.error || data.message || message;
    } catch (err) {
      logClientError('api.parseErrorBody', err, { path, status: response.status });
      if (text.trim()) message = text.trim().slice(0, 2000);
    }
    const skipDevNoise =
      !AUTH_ENABLED && (response.status === 401 || response.status === 403);
    if (import.meta.env.DEV && !skipDevNoise) {
      console.error('[api]', response.status, url, text.slice(0, 500));
    } else if (!import.meta.env.DEV) {
      console.error('[api]', response.status, path);
    }
    const skipFailureLog =
      reportingApiFailure ||
      path.startsWith('/failures') ||
      path === '/health' ||
      skipDevNoise;
    if (!skipFailureLog) {
      reportingApiFailure = true;
      try {
        const note = `[${method}] ${path} → ${response.status}: ${message}`.slice(0, 2000);
        await api.post('/failures', { type: 'app', linkedId: 0, note });
      } catch {
        /* avoid loops */
      } finally {
        reportingApiFailure = false;
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const okText = await response.text();
  try {
    return JSON.parse(okText) as T;
  } catch (err) {
    logClientError('api.parseJson', err, { path });
    throw new Error('Invalid JSON in API response');
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
