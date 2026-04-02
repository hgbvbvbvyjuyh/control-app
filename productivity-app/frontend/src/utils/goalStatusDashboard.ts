import { DateTime } from 'luxon';
import { type Goal } from '../db';
import { getBrowserIanaTimeZone } from './browserTimezone';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardStats {
  daily: { pct: number; progressText: string };
  weekly: { pct: number; progressText: string };
  monthly: { pct: number; progressText: string };
  yearly: { pct: number; progressText: string };
  chartData: { day: string; value: number }[]; // Sat–Fri week, daily % (root daily goals only)
  /** Consecutive calendar days (ending today) where all root daily goals were completed (100%). */
  streakDays: number;
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Clamp a value between 0 and 100, then round to an integer.
 */
function clampPct(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * Daily % for a specific calendar day (in the user's timezone).
 *
 * Formula: (done daily goals ÷ total daily goals) × 100
 *   - If total = 0  → 0
 *   - Clamp 0–100
 *   - Round to integer
 *
 * A daily goal counts as "done on day D" when:
 *   status === 'done'  AND  completedAt falls within [dayStart, dayEnd].
 *
 * NOTE: Only root daily goals are used — sub-goals and non-daily types are excluded.
 */
function dailyPctForDay(
  dailyGoals: Goal[],
  targetDay: DateTime,
  zone: string
): number {
  const total = dailyGoals.length;
  if (total === 0) return 0;

  const dayStart = targetDay.startOf('day');
  const dayEnd = targetDay.endOf('day');

  const doneCount = dailyGoals.filter((g) => {
    if (g.status !== 'done' || !g.completedAt) return false;
    const completedDt = DateTime.fromISO(g.completedAt).setZone(zone);
    return completedDt >= dayStart && completedDt <= dayEnd;
  }).length;

  return clampPct((doneCount / total) * 100);
}

/**
 * Rolling average of the last `days` calendar days' daily %.
 *
 * Day 0 = today,  day 1 = yesterday, …, day (days-1) = oldest day in window.
 * Every day in the window contributes to the average (including days with 0%).
 */
function rollingAvgDailyPct(
  dailyGoals: Goal[],
  days: number,
  now: DateTime,
  zone: string
): number {
  if (dailyGoals.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < days; i++) {
    total += dailyPctForDay(dailyGoals, now.minus({ days: i }), zone);
  }
  return clampPct(total / days);
}

/** Root daily goals only: no parent (sub-goals excluded from portfolio %). */
function isRootGoal(g: Goal): boolean {
  return g.parentId == null || g.parentId === '';
}

/**
 * Streak: count consecutive days from today backward where daily completion is 100%.
 * If a day has zero root daily goals, completion is 0% → streak breaks.
 */
function computeDailyStreak(rootDailyGoals: Goal[], now: DateTime, zone: string): number {
  if (rootDailyGoals.length === 0) return 0;
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = now.minus({ days: i });
    const pct = dailyPctForDay(rootDailyGoals, day, zone);
    if (pct >= 100) streak++;
    else break;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculates dashboard statistics using ONLY daily goals for all percentages.
 *
 * - Daily  %  = done daily goals today ÷ total daily goals × 100
 * - Weekly %  = average of last  7 days' daily %
 * - Monthly % = average of last 30 days' daily %
 * - Yearly %  = average of last 365 days' daily %
 *
 * Category goals (weekly/monthly/yearly) are shown as counts in progressText
 * but are NOT used to compute any percentage.
 */
export function calculateDashboardStats(
  goals: Goal[],
  zone: string = getBrowserIanaTimeZone()
): DashboardStats {
  const now = DateTime.now().setZone(zone);

  // ---- Root daily goals only (used for ALL percentage calculations) ----
  const dailyGoals = goals.filter(
    (g) => g.goalType === 'daily' && !g.deletedAt && isRootGoal(g)
  );

  // ---- Daily % (today) ----
  const todayPct = dailyPctForDay(dailyGoals, now, zone);

  const todayStart = now.startOf('day');
  const todayDone = dailyGoals.filter((g) => {
    if (g.status !== 'done' || !g.completedAt) return false;
    return DateTime.fromISO(g.completedAt).setZone(zone) >= todayStart;
  }).length;

  // ---- Rolling averages (daily goals only) ----
  const weeklyPct  = rollingAvgDailyPct(dailyGoals,   7, now, zone);
  const monthlyPct = rollingAvgDailyPct(dailyGoals,  30, now, zone);
  const yearlyPct  = rollingAvgDailyPct(dailyGoals, 365, now, zone);

  // ---- Category goal counts (display only — NOT used for %) ----
  const getCategoryStats = (type: 'weekly' | 'monthly' | 'yearly') => {
    const catGoals = goals.filter(
      (g) => g.goalType === type && !g.deletedAt && isRootGoal(g)
    );
    return {
      done: catGoals.filter((g) => g.status === 'done').length,
      total: catGoals.length,
    };
  };

  const weeklyStats  = getCategoryStats('weekly');
  const monthlyStats = getCategoryStats('monthly');
  const yearlyStats  = getCategoryStats('yearly');

  // ---- Chart data: Current Week (Saturday to Friday) ----
  // Sat=6 in Luxon weekday
  const daysSinceSat = (now.weekday + 7 - 6) % 7;
  const startOfSatWeek = now.minus({ days: daysSinceSat }).startOf('day');

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const targetDay = startOfSatWeek.plus({ days: i });
    return {
      day: targetDay.toFormat('ccc'),
      value: dailyPctForDay(dailyGoals, targetDay, zone),
    };
  });

  const streakDays = computeDailyStreak(dailyGoals, now, zone);

  return {
    daily: {
      pct: todayPct,
      progressText: `${todayDone}/${dailyGoals.length} goals done`,
    },
    weekly: {
      pct: weeklyPct,
      progressText: `${weeklyStats.done}/${weeklyStats.total} goals achieved`,
    },
    monthly: {
      pct: monthlyPct,
      progressText: `${monthlyStats.done}/${monthlyStats.total} goals achieved`,
    },
    yearly: {
      pct: yearlyPct,
      progressText: `${yearlyStats.done}/${yearlyStats.total} goals achieved`,
    },
    chartData,
    streakDays,
  };
}
