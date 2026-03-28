/** Static copy for exports / tooltips (not user-editable). */

export const PROGRESS_CALENDAR_SUMMARY =
  'Days use IANA timezone from X-User-Timezone (fallback DEFAULT_TIMEZONE or UTC). ' +
  'Weeks run Monday–Sunday in that zone (Luxon en-GB). Weekly score is the average of 7 days: ' +
  'each day is the mean completion rate of daily goals that had completed sessions that day; ' +
  'days with no completions count as 0%. Monthly averages weeks that had activity; yearly averages months with activity.';

export function buildCalendarContextPayload(clientTimeZone: string): {
  timezone: string;
  weekBoundary: string;
  progressRulesSummary: string;
  multiDeviceNote: string;
} {
  return {
    timezone: clientTimeZone,
    weekBoundary: 'Monday 00:00 through Sunday 23:59:59.999 in the resolved timezone (full weeks may span calendar years).',
    progressRulesSummary: PROGRESS_CALENDAR_SUMMARY,
    multiDeviceNote:
      'Session timestamps are UTC ms; progress is recomputed using the active client timezone. ' +
      'Changing device timezone or restoring backup elsewhere recomputes metrics for that zone.',
  };
}
