import { DateTime } from 'luxon';

export const LOCALE_MONDAY_WEEK = 'en-GB';

export function sessionWindowStartMs(anchorMs: number, zone: string): number {
  return DateTime.fromMillis(anchorMs, { zone })
    .startOf('year')
    .minus({ days: 14 })
    .toMillis();
}

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

export function todayStartDt(anchorMs: number, zone: string): DateTime {
  return DateTime.fromMillis(anchorMs, { zone }).startOf('day');
}

export function weekMondayStartDt(anchorMs: number, zone: string): DateTime {
  return DateTime.fromMillis(anchorMs, { zone })
    .setLocale(LOCALE_MONDAY_WEEK)
    .startOf('week');
}

/** Mon–Sun in zone (handles year/DST boundaries). */
export function weekDaySequenceFromMonday(monday: DateTime): DateTime[] {
  return Array.from({ length: 7 }, (_, i) => monday.plus({ days: i }));
}
