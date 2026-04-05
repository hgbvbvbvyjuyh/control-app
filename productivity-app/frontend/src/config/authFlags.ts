import type { User } from 'firebase/auth';

function parseEnvEnabled(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === '') return true;
  const s = String(raw).trim().toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no' || s === 'off');
}

/**
 * Firebase auth and route guards are active when true.
 * Set `VITE_AUTH_ENABLED=false` in `.env` for local dev without login (matches the idea of `AUTH_ENABLED=false`).
 */
export const AUTH_ENABLED = parseEnvEnabled(import.meta.env.VITE_AUTH_ENABLED);

/** Placeholder session when `AUTH_ENABLED` is false. */
export const DEV_MOCK_USER = {
  uid: 'dev-local-user',
  email: 'dev@local.test',
  displayName: 'Dev User',
} as User;
