/**
 * Central client-side error logging. In development logs full details; in production
 * logs a short message (extend here to send to an error reporting service).
 */
export function logClientError(scope: string, err: unknown, meta?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  if (import.meta.env.DEV) {
    console.error(`[${scope}]`, err, meta && Object.keys(meta).length ? meta : '');
    return;
  }
  console.error(`[${scope}]`, message);
}
