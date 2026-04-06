import { reportFailure } from './failureReporter';

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
  void reportFailure(message, {
    action: scope,
    path: typeof meta?.['path'] === 'string' ? meta['path'] : undefined,
    method: typeof meta?.['method'] === 'string' ? meta['method'] : undefined,
    goalId:
      typeof meta?.['goalId'] === 'string' || typeof meta?.['goalId'] === 'number'
        ? (meta['goalId'] as string | number)
        : undefined,
    status: typeof meta?.['status'] === 'number' ? (meta['status'] as number) : undefined,
  });
}
