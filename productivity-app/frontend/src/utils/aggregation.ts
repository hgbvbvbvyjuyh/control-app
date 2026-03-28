import { DateTime } from 'luxon';
import { type Goal, type Session } from '../db';
import { getBrowserIanaTimeZone } from './browserTimezone';
import {
  mondaysOverlappingMonth,
  todayStartDt,
  weekDaySequenceFromMonday,
  weekMondayStartDt,
} from './tzCalendar';

export interface AggregationResult {
  pct: number;
  count: number;
  hasData: boolean;
}

function meanRound(vals: number[]): number {
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function buildGoalDayStats(
  sessions: Session[],
  dailyGoalIds: Set<string>,
  zone: string
): Map<string, { total: number; achieved: number }> {
  const map = new Map<string, { total: number; achieved: number }>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const gid = String(s.goalId);
    if (!dailyGoalIds.has(gid)) continue;
    const dk = DateTime.fromMillis(s.startTime, { zone }).toFormat('yyyy-LL-dd');
    const key = `${gid}|${dk}`;
    const cur = map.get(key) ?? { total: 0, achieved: 0 };
    cur.total += 1;
    if (s.didAchieveGoal) cur.achieved += 1;
    map.set(key, cur);
  }
  return map;
}

type DailyPort = { hasData: boolean; pct: number; raw: number };

function portfolioDailyForDay(
  day: DateTime,
  dailyGoals: Goal[],
  stats: Map<string, { total: number; achieved: number }>
): DailyPort {
  const dk = day.toFormat('yyyy-LL-dd');
  const vals: number[] = [];
  for (const g of dailyGoals) {
    const row = stats.get(`${String(g.id)}|${dk}`);
    if (row && row.total > 0) vals.push((row.achieved / row.total) * 100);
  }
  if (vals.length === 0) return { hasData: false, pct: 0, raw: 0 };
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { hasData: true, pct: Math.round(raw), raw };
}

/** 7 days from Monday; days without completions count as 0% (labelled in UI). */
function portfolioWeek(
  weekMonday: DateTime,
  dailyGoals: Goal[],
  stats: Map<string, { total: number; achieved: number }>
): { hasData: boolean; pct: number; raw: number } {
  const dayVals: number[] = [];
  let anyDayHadData = false;
  for (const d of weekDaySequenceFromMonday(weekMonday)) {
    const p = portfolioDailyForDay(d, dailyGoals, stats);
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
  dailyGoals: Goal[],
  stats: Map<string, { total: number; achieved: number }>,
  zone: string
): { hasData: boolean; pct: number; raw: number } {
  const vals: number[] = [];
  for (const mon of mondaysOverlappingMonth(year, month0, zone)) {
    const w = portfolioWeek(mon, dailyGoals, stats);
    if (w.hasData) vals.push(w.raw);
  }
  if (vals.length === 0) return { hasData: false, pct: 0, raw: 0 };
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { hasData: true, pct: Math.round(raw), raw };
}

function portfolioYear(
  year: number,
  dailyGoals: Goal[],
  stats: Map<string, { total: number; achieved: number }>,
  zone: string
): { hasData: boolean; pct: number; raw: number } {
  const vals: number[] = [];
  for (let m = 0; m < 12; m++) {
    const mo = portfolioMonth(year, m, dailyGoals, stats, zone);
    if (mo.hasData) vals.push(mo.raw);
  }
  if (vals.length === 0) return { hasData: false, pct: 0, raw: 0 };
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { hasData: true, pct: Math.round(raw), raw };
}

export interface PortfolioEngine {
  stats: Map<string, { total: number; achieved: number }>;
  dailyGoals: Goal[];
  zone: string;
}

export function buildPortfolioEngine(
  allGoals: Goal[],
  allSessions: Session[],
  zone: string = getBrowserIanaTimeZone()
): PortfolioEngine {
  const dailyGoals = allGoals.filter(g => g.goalType === 'daily');
  const ids = new Set(dailyGoals.map(g => String(g.id)));
  const stats = buildGoalDayStats(allSessions, ids, zone);
  return { stats, dailyGoals, zone };
}

export function portfolioStatsAt(
  engine: PortfolioEngine,
  anchorMs: number
): {
  daily: AggregationResult;
  weekly: AggregationResult;
  monthly: AggregationResult;
  yearly: AggregationResult;
} {
  const { stats, dailyGoals, zone } = engine;
  const anchorDt = DateTime.fromMillis(anchorMs, { zone });
  const today = todayStartDt(anchorMs, zone);
  const todayKey = today.toFormat('yyyy-LL-dd');

  const pDay = portfolioDailyForDay(today, dailyGoals, stats);
  const weekMonday = weekMondayStartDt(anchorMs, zone);
  const pWeek = portfolioWeek(weekMonday, dailyGoals, stats);
  const pMonth = portfolioMonth(
    anchorDt.year,
    anchorDt.month - 1,
    dailyGoals,
    stats,
    zone
  );
  const pYear = portfolioYear(anchorDt.year, dailyGoals, stats, zone);

  const completedToday = dailyGoals.reduce((acc, g) => {
    const k = `${String(g.id)}|${todayKey}`;
    const row = stats.get(k);
    return acc + (row?.total ?? 0);
  }, 0);

  const activeDaysThisWeek = (() => {
    if (!pWeek.hasData) return 0;
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = weekMonday.plus({ days: i });
      if (portfolioDailyForDay(d, dailyGoals, stats).hasData) n += 1;
    }
    return n;
  })();

  const weeksWithActivityInMonth = pMonth.hasData
    ? mondaysOverlappingMonth(anchorDt.year, anchorDt.month - 1, zone).filter(mon =>
        portfolioWeek(mon, dailyGoals, stats).hasData
      ).length
    : 0;

  const monthsWithActivityInYear = pYear.hasData
    ? [...Array(12).keys()].filter(m =>
        portfolioMonth(anchorDt.year, m, dailyGoals, stats, zone).hasData
      ).length
    : 0;

  return {
    daily: {
      pct: pDay.pct,
      hasData: pDay.hasData,
      count: dailyGoals.length > 0 ? completedToday : 0,
    },
    weekly: {
      pct: pWeek.pct,
      hasData: pWeek.hasData,
      count: activeDaysThisWeek,
    },
    monthly: {
      pct: pMonth.pct,
      hasData: pMonth.hasData,
      count: weeksWithActivityInMonth,
    },
    yearly: {
      pct: pYear.pct,
      hasData: pYear.hasData,
      count: monthsWithActivityInYear,
    },
  };
}

export const calculateGoalProgress = (
  goal: Goal,
  allGoals: Goal[],
  allSessions: Session[],
  zone: string = getBrowserIanaTimeZone()
): Record<string, AggregationResult> => {
  const engine = buildPortfolioEngine(allGoals, allSessions, zone);
  const portfolio = portfolioStatsAt(engine, Date.now());
  const today = todayStartDt(Date.now(), zone);
  const todayKey = today.toFormat('yyyy-LL-dd');

  if (goal.goalType === 'daily') {
    const id = String(goal.id);
    const r = engine.stats.get(`${id}|${todayKey}`);
    if (!r || r.total === 0) {
      return {
        daily: { pct: 0, hasData: false, count: 0 },
        weekly: portfolio.weekly,
        monthly: portfolio.monthly,
        yearly: portfolio.yearly,
      };
    }
    const raw = (r.achieved / r.total) * 100;
    return {
      daily: {
        pct: Math.round(raw),
        hasData: true,
        count: r.total,
      },
      weekly: portfolio.weekly,
      monthly: portfolio.monthly,
      yearly: portfolio.yearly,
    };
  }

  return {
    daily: portfolio.daily,
    weekly: portfolio.weekly,
    monthly: portfolio.monthly,
    yearly: portfolio.yearly,
  };
};

export function dashboardPeriodStats(
  goals: Goal[],
  sessions: Session[],
  zone: string = getBrowserIanaTimeZone()
) {
  const engine = buildPortfolioEngine(goals, sessions, zone);
  return portfolioStatsAt(engine, Date.now());
}

export function buildDashboardHistories(
  goals: Goal[],
  sessions: Session[],
  today: Date,
  dayMs: number,
  zone: string = getBrowserIanaTimeZone()
): {
  dailyHistory: { name: string; value: number; hasData: boolean }[];
  weeklyHistory: { name: string; value: number; hasData: boolean }[];
  monthlyHistory: { name: string; value: number; hasData: boolean }[];
  yearlyHistory: { name: string; value: number; hasData: boolean }[];
} {
  const engine = buildPortfolioEngine(goals, sessions, zone);
  const { stats, dailyGoals } = engine;

  const startOfTodayMs = DateTime.fromObject(
    {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    },
    { zone }
  )
    .startOf('day')
    .toMillis();

  const dailyHistory = Array.from({ length: 14 }, (_, i) => {
    const dayStart = startOfTodayMs - i * dayMs;
    const d = DateTime.fromMillis(dayStart, { zone }).startOf('day');
    const p = portfolioDailyForDay(d, dailyGoals, stats);
    return {
      name: d.toFormat('ccc'),
      value: p.pct,
      hasData: p.hasData,
    };
  }).reverse();

  const weeklyHistory = Array.from({ length: 14 }, (_, i) => {
    const weekEnd = startOfTodayMs + dayMs - i * 7 * dayMs;
    const weekStart = weekEnd - 7 * dayMs;
    const mon = DateTime.fromMillis(weekStart, { zone })
      .setLocale('en-GB')
      .startOf('week');
    const p = portfolioWeek(mon, dailyGoals, stats);
    return {
      name: `W${14 - i}`,
      value: p.pct,
      hasData: p.hasData,
    };
  }).reverse();

  const monthlyHistory = Array.from({ length: 12 }, (_, i) => {
    const d = DateTime.fromObject(
      { year: today.getFullYear(), month: today.getMonth() + 1, day: 1 },
      { zone }
    ).minus({ months: i });
    const p = portfolioMonth(d.year, d.month - 1, dailyGoals, stats, zone);
    return {
      name: d.toFormat('LLL'),
      value: p.pct,
      hasData: p.hasData,
    };
  }).reverse();

  const yearlyHistory = Array.from({ length: 5 }, (_, i) => {
    const y = today.getFullYear() - i;
    const p = portfolioYear(y, dailyGoals, stats, zone);
    return {
      name: String(y),
      value: p.pct,
      hasData: p.hasData,
    };
  }).reverse();

  return { dailyHistory, weeklyHistory, monthlyHistory, yearlyHistory };
}
