import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request, Response, NextFunction } from 'express';
import { resolveClientTimeZone } from '../utils/tzCalendar';

const recalcTimeZone = new AsyncLocalStorage<string>();

export function getRecalcTimeZone(): string {
  return recalcTimeZone.getStore() ?? process.env.DEFAULT_TIMEZONE ?? 'UTC';
}

/**
 * Binds `X-User-Timezone` (IANA) for the request so portfolio recalculation matches the user’s calendar.
 */
export function clientTimezoneMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const tz = resolveClientTimeZone(req.headers['x-user-timezone']);
  recalcTimeZone.run(tz, () => next());
}
