import type { User } from 'firebase/auth';

function parseEnvEnabled(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === '') return true;
  const s = String(raw).trim().toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no' || s === 'off');
}

/**
 * Emergency override: when true, auth is off regardless of `VITE_AUTH_ENABLED`.
 * Keep false in committed code. Never ship a production build with this true.
 */
const FORCE_AUTH_DISABLED_FOR_E2E = false;

/**
 * Firebase auth and route guards are active when true.
 * Set `VITE_AUTH_ENABLED=false` in `.env` for local dev without login (matches the idea of `AUTH_ENABLED=false`).
 * For TestSprite, prefer `npm run dev:testsprite` (loads `.env.testsprite`).
 */
export const AUTH_ENABLED =
  !FORCE_AUTH_DISABLED_FOR_E2E && parseEnvEnabled(import.meta.env.VITE_AUTH_ENABLED);

/** Placeholder session when `AUTH_ENABLED` is false. */
export const DEV_MOCK_USER = {
  uid: 'dev-local-user',
  email: 'dev@local.test',
  displayName: 'Dev User',
} as User;
