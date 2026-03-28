import { getBrowserIanaTimeZone } from '../utils/browserTimezone';

/** Native tooltip for the dashboard info control. */
export const PROGRESS_CALC_TOOLTIP =
  'Progress uses your device IANA timezone (X-User-Timezone). Week = Mon–Sun; weekly score averages 7 days (no sessions that day = 0%). ' +
  'Daily layer = completed sessions; monthly = mean of weeks with activity; yearly = months with activity. ' +
  'Weekly–yearly numbers are portfolio-wide (same on every goal). UTC session times are rebucketed if you change timezone.';

/** Same rules text as server export (`backend/src/constants/progressCalendarMeta.ts`). */
export const PROGRESS_CALENDAR_SUMMARY =
  'Days use IANA timezone from X-User-Timezone (fallback DEFAULT_TIMEZONE or UTC). ' +
  'Weeks run Monday–Sunday in that zone (Luxon en-GB). Weekly score is the average of 7 days: ' +
  'each day is the mean completion rate of daily goals that had completed sessions that day; ' +
  'days with no completions count as 0%. Monthly averages weeks that had activity; yearly averages months with activity.';

export function buildClientExportCalendarContext() {
  return {
    timezone: getBrowserIanaTimeZone(),
    weekBoundary:
      'Monday 00:00 through Sunday 23:59:59.999 in the resolved timezone (full weeks may span calendar years).',
    progressRulesSummary: PROGRESS_CALENDAR_SUMMARY,
    multiDeviceNote:
      'Session timestamps are UTC ms; progress is recomputed using the active client timezone. ' +
      'Changing device timezone or restoring backup elsewhere recomputes metrics for that zone.',
  };
}
