import { DateTime } from 'luxon';

/** Monday-start weeks (align with frontend / common work-week semantics). */
export const LOCALE_MONDAY_WEEK = 'en-GB';

export function isValidIanaTimeZone(zone: string): boolean {
  try {
    return DateTime.now().setZone(zone).isValid;
  } catch {
    return false;
  }
}

export function resolveClientTimeZone(headerVal: string | string[] | undefined): string {
  const v = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  const fallback = process.env.DEFAULT_TIMEZONE || 'UTC';
  if (typeof v !== 'string' || v.length === 0) return fallback;
  return isValidIanaTimeZone(v) ? v : fallback;
}

/** Earliest session `startTime` to load: start of calendar year in zone, minus buffer for week/month edges. */
export function sessionWindowStartMs(anchorMs: number, zone: string): number {
  return DateTime.fromMillis(anchorMs, { zone })
    .startOf('year')
    .minus({ days: 14 })
    .toMillis();
}

export function dayKeyFromMs(ms: number, zone: string): string {
  return DateTime.fromMillis(ms, { zone }).toFormat('yyyy-LL-dd');
}

export function todayStartDt(anchorMs: number, zone: string): DateTime {
  return DateTime.fromMillis(anchorMs, { zone }).startOf('day');
}

export function weekMondayStartDt(anchorMs: number, zone: string): DateTime {
  return DateTime.fromMillis(anchorMs, { zone })
    .setLocale(LOCALE_MONDAY_WEEK)
    .startOf('week');
}

/**
 * Seven consecutive calendar days Mon → Sun in the same IANA zone.
 * Luxon advances by calendar day (DST/year boundaries handled).
 */
export function weekDaySequenceFromMonday(monday: DateTime): DateTime[] {
  return Array.from({ length: 7 }, (_, i) => monday.plus({ days: i }));
}

/** Distinct week Mondays (in `zone`) that overlap the given calendar month. */
export function mondaysOverlappingMonth(
  year: number,
  month0: number,
  zone: string
): DateTime[] {
  const seen = new Set<string>();
  const out: DateTime[] = [];
  const dim =
    DateTime.fromObject({ year, month: month0 + 1, day: 1 }, { zone }).daysInMonth ?? 0;
  for (let d = 1; d <= dim; d++) {
    const dt = DateTime.fromObject({ year, month: month0 + 1, day: d }, { zone });
    const mon = dt.setLocale(LOCALE_MONDAY_WEEK).startOf('week');
    const k = mon.toFormat('yyyy-LL-dd');
    if (!seen.has(k)) {
      seen.add(k);
      out.push(mon);
    }
  }
  return out.sort((a, b) => a.toMillis() - b.toMillis());
}
