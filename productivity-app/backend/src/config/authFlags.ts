function parseEnvEnabled(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return true;
  const s = raw.trim().toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no' || s === 'off');
}

/**
 * When false, API requests skip Firebase ID token verification (local dev only).
 * Set `AUTH_ENABLED=false` in backend `.env` alongside `VITE_AUTH_ENABLED=false` on the frontend.
 */
export const AUTH_ENABLED = parseEnvEnabled(process.env['AUTH_ENABLED']);

export const DEV_AUTH_USER_ID = process.env['DEV_AUTH_USER_ID']?.trim() || 'dev-local-user';
