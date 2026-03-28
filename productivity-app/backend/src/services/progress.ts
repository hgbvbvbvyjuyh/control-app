// Portfolio progress from session activity in the user’s TIME ZONE (see X-User-Timezone).
// Weekly: average of 7 calendar days; days with no completions contribute 0% (empty days count).
// Monthly / yearly: average of lower tier only for periods that have activity (weeks / months with hasData).
//
// Sessions are loaded from start-of-year (in zone) minus 14d for scalability.

import { DateTime } from 'luxon';
import { queryAll, queryOne, run } from '../db';
import { getRecalcTimeZone } from '../middleware/clientTimezone';
import {
  dayKeyFromMs,
  mondaysOverlappingMonth,
  sessionWindowStartMs,
  todayStartDt,
  weekDaySequenceFromMonday,
  weekMondayStartDt,
} from '../utils/tzCalendar';

const AUTO_COMPLETE_THRESHOLD = 99.5;

type GoalRow = Record<string, unknown>;

function persistGoalProgress(
  goalId: number,
  row: GoalRow,
  progressRounded: number,
  hasData: boolean,
  progressRaw?: number
): void {
  run('UPDATE goals SET progress = ?, progressHasData = ?, updatedAt = ? WHERE id = ?', [
    progressRounded,
    hasData ? 1 : 0,
    Date.now(),
    goalId,
  ]);
  const raw = progressRaw ?? progressRounded;
  if (hasData && raw >= AUTO_COMPLETE_THRESHOLD && row['status'] === 'active') {
    run("UPDATE goals SET status = 'completed', updatedAt = ? WHERE id = ?", [Date.now(), goalId]);
  }
}

function batchUpdateByType(
  goalType: string,
  progress: number,
  hasData: boolean,
  updatedAt: number
): void {
  run(
    'UPDATE goals SET progress = ?, progressHasData = ?, updatedAt = ? WHERE goalType = ? AND deletedAt IS NULL',
    [progress, hasData ? 1 : 0, updatedAt, goalType]
  );
}

function buildGoalDayStats(
  sessions: GoalRow[],
  dailyGoalIdSet: Set<number>,
  zone: string
): Map<string, { total: number; achieved: number }> {
  const map = new Map<string, { total: number; achieved: number }>();
  for (const s of sessions) {
    if (s['status'] !== 'completed') continue;
    const gid = Number(s['goalId']);
    if (!dailyGoalIdSet.has(gid)) continue;
    const dk = dayKeyFromMs(Number(s['startTime']), zone);
    const key = `${gid}|${dk}`;
    const cur = map.get(key) ?? { total: 0, achieved: 0 };
    cur.total += 1;
    if (s['didAchieveGoal']) cur.achieved += 1;
    map.set(key, cur);
  }
  return map;
}

type DailyPort = { hasData: boolean; pct: number; raw: number };

function portfolioDailyForDay(
  day: DateTime,
  dailyGoalIds: number[],
  stats: Map<string, { total: number; achieved: number }>
): DailyPort {
  const dk = day.toFormat('yyyy-LL-dd');
  const vals: number[] = [];
  for (const gid of dailyGoalIds) {
    const row = stats.get(`${gid}|${dk}`);
    if (row && row.total > 0) vals.push((row.achieved / row.total) * 100);
  }
  if (vals.length === 0) return { hasData: false, pct: 0, raw: 0 };
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { hasData: true, pct: Math.round(raw), raw };
}

/** Mon–Sun (7 calendar days, including across year boundaries); inactive days count as 0% toward the week average. */
function portfolioWeek(
  weekMonday: DateTime,
  dailyGoalIds: number[],
  stats: Map<string, { total: number; achieved: number }>
): { hasData: boolean; pct: number; raw: number } {
  const dayVals: number[] = [];
  let anyDayHadData = false;
  for (const d of weekDaySequenceFromMonday(weekMonday)) {
    const p = portfolioDailyForDay(d, dailyGoalIds, stats);
    if (p.hasData) anyDayHadData = true;
    dayVals.push(p.hasData ? p.raw : 0);
  }
  if (!anyDayHadData) return { hasData: false, pct: 0, raw: 0 };
  const raw = dayVals.reduce((a, b) => a + b, 0) / 7;
  return { hasData: true, pct: Math.round(raw), raw };
}

function portfolioMonth(
  year: number,
  month0: number,
  dailyGoalIds: number[],
  stats: Map<string, { total: number; achieved: number }>,
  zone: string
): { hasData: boolean; pct: number; raw: number } {
  const vals: number[] = [];
  for (const mon of mondaysOverlappingMonth(year, month0, zone)) {
    const w = portfolioWeek(mon, dailyGoalIds, stats);
    if (w.hasData) vals.push(w.raw);
  }
  if (vals.length === 0) return { hasData: false, pct: 0, raw: 0 };
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { hasData: true, pct: Math.round(raw), raw };
}

function portfolioYear(
  year: number,
  dailyGoalIds: number[],
  stats: Map<string, { total: number; achieved: number }>,
  zone: string
): { hasData: boolean; pct: number; raw: number } {
  const vals: number[] = [];
  for (let m = 0; m < 12; m++) {
    const mo = portfolioMonth(year, m, dailyGoalIds, stats, zone);
    if (mo.hasData) vals.push(mo.raw);
  }
  if (vals.length === 0) return { hasData: false, pct: 0, raw: 0 };
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { hasData: true, pct: Math.round(raw), raw };
}

export function recalcPortfolioProgress(
  anchorMs: number = Date.now(),
  timeZone?: string
): void {
  const zone = timeZone ?? getRecalcTimeZone();
  const lowerBound = sessionWindowStartMs(anchorMs, zone);

  const dailyRows = queryAll<GoalRow>(
    "SELECT * FROM goals WHERE goalType = 'daily' AND deletedAt IS NULL"
  );
  const dailyGoalIds = dailyRows.map(r => Number(r['id']));
  const dailySet = new Set(dailyGoalIds);

  const sessions = queryAll<GoalRow>(
    'SELECT goalId, startTime, status, didAchieveGoal FROM sessions WHERE deletedAt IS NULL AND startTime >= ?',
    [lowerBound]
  );
  const stats = buildGoalDayStats(sessions, dailySet, zone);

  const anchorDt = DateTime.fromMillis(anchorMs, { zone });
  const today = todayStartDt(anchorMs, zone);
  const todayKey = today.toFormat('yyyy-LL-dd');

  const weekMonday = weekMondayStartDt(anchorMs, zone);
  const portfolioThisWeek = portfolioWeek(weekMonday, dailyGoalIds, stats);
  const portfolioThisMonth = portfolioMonth(
    anchorDt.year,
    anchorDt.month - 1,
    dailyGoalIds,
    stats,
    zone
  );
  const portfolioThisYear = portfolioYear(anchorDt.year, dailyGoalIds, stats, zone);

  const updatedAt = Date.now();

  for (const row of dailyRows) {
    const id = Number(row['id']);
    const r = stats.get(`${id}|${todayKey}`);
    if (!r || r.total === 0) {
      persistGoalProgress(id, row, 0, false);
    } else {
      const raw = (r.achieved / r.total) * 100;
      persistGoalProgress(id, row, Math.round(raw), true, raw);
    }
  }

  if (dailyGoalIds.length === 0) {
    batchUpdateByType('weekly', 0, false, updatedAt);
    batchUpdateByType('monthly', 0, false, updatedAt);
    batchUpdateByType('yearly', 0, false, updatedAt);
  } else {
    batchUpdateByType(
      'weekly',
      portfolioThisWeek.pct,
      portfolioThisWeek.hasData,
      updatedAt
    );
    batchUpdateByType(
      'monthly',
      portfolioThisMonth.pct,
      portfolioThisMonth.hasData,
      updatedAt
    );
    batchUpdateByType(
      'yearly',
      portfolioThisYear.pct,
      portfolioThisYear.hasData,
      updatedAt
    );
  }
}

export function refreshDailyFromSessions(goalId: number): number {
  recalcPortfolioProgress(Date.now(), getRecalcTimeZone());
  const row = queryOne<{ progress: number }>('SELECT progress FROM goals WHERE id = ?', [goalId]);
  return Number(row?.['progress']) || 0;
}

export function recalcGoalProgress(goalId: number): number {
  recalcPortfolioProgress(Date.now(), getRecalcTimeZone());
  const row = queryOne<{ progress: number }>('SELECT progress FROM goals WHERE id = ?', [goalId]);
  return Number(row?.['progress']) || 0;
}

export function recalcParentChain(_goalId: number): void {
  /* single portfolio pass */
}

export function recalcProgressChain(_goalId: number): void {
  recalcPortfolioProgress(Date.now(), getRecalcTimeZone());
}

export function getProgressSummary() {
  const types = ['daily', 'weekly', 'monthly', 'yearly'] as const;
  const summary: Record<string, { total: number; completed: number; avgProgress: number }> = {};

  for (const t of types) {
    const goals = queryAll<GoalRow>(
      'SELECT progress, status, progressHasData FROM goals WHERE goalType = ? AND deletedAt IS NULL',
      [t]
    );
    const total = goals.length;
    const completed = goals.filter(g => g['status'] === 'completed').length;
    const withData = goals.filter(g => Number(g['progressHasData']) === 1);
    const avgProgress =
      withData.length > 0
        ? Math.round(
            withData.reduce((s, g) => s + (Number(g['progress']) || 0), 0) / withData.length
          )
        : 0;
    summary[t] = { total, completed, avgProgress };
  }

  return summary;
}
