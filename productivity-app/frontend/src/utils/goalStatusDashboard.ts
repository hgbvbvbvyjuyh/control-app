import { DateTime } from 'luxon';
import { type Goal } from '../db';
import { getBrowserIanaTimeZone } from './browserTimezone';

export interface DashboardStats {
  daily: { pct: number; progressText: string };
  weekly: { pct: number; progressText: string };
  monthly: { pct: number; progressText: string };
  yearly: { pct: number; progressText: string };
  chartData: number[]; // Last 7 days daily %
}

/**
 * Calculates dashboard statistics based on goal status and completedAt timestamps.
 */
export function calculateDashboardStats(goals: Goal[], zone: string = getBrowserIanaTimeZone()): DashboardStats {
  const now = DateTime.now().setZone(zone);
  
  // 1. Daily Stats (Percentage of daily goals completed TODAY)
  const todayStart = now.startOf('day');
  const dailyGoals = goals.filter(g => g.goalType === 'daily');
  
  const dailyPctForDay = (targetDay: DateTime) => {
    const dayStart = targetDay.startOf('day');
    const dayEnd = targetDay.endOf('day');
    
    const dayDailyGoals = dailyGoals; // We assume the set of daily goals is the same for history
    if (dayDailyGoals.length === 0) return 0;
    
    const doneCount = dayDailyGoals.filter(g => {
      if (g.status !== 'done' || !g.completedAt) return false;
      const completedDt = DateTime.fromMillis(g.completedAt).setZone(zone);
      return completedDt >= dayStart && completedDt <= dayEnd;
    }).length;
    
    return Math.round((doneCount / dayDailyGoals.length) * 100);
  };

  const todayPct = dailyPctForDay(todayStart);
  const todayDone = dailyGoals.filter(g => {
    if (g.status !== 'done' || !g.completedAt) return false;
    return DateTime.fromMillis(g.completedAt).setZone(zone) >= todayStart;
  }).length;

  // 2. Rolling Averages (Average of last N days' Daily %)
  const getAvgDailyPct = (days: number) => {
    if (dailyGoals.length === 0) return 0;
    let totalPct = 0;
    for (let i = 0; i < days; i++) {
      totalPct += dailyPctForDay(now.minus({ days: i }));
    }
    return Math.round(totalPct / days);
  };

  // 3. Category Counts (X / Y goals achieved for weekly/monthly/yearly goals)
  const getCategoryStats = (type: 'weekly' | 'monthly' | 'yearly') => {
    const catGoals = goals.filter(g => g.goalType === type);
    const total = catGoals.length;
    const done = catGoals.filter(g => g.status === 'done').length;
    return { done, total };
  };

  const weeklyStats = getCategoryStats('weekly');
  const monthlyStats = getCategoryStats('monthly');
  const yearlyStats = getCategoryStats('yearly');

  // 4. Chart Data (Last 7 days daily %)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    return dailyPctForDay(now.minus({ days: 6 - i }));
  });

  return {
    daily: {
      pct: todayPct,
      progressText: `${todayDone} / ${dailyGoals.length} goals done`
    },
    weekly: {
      pct: getAvgDailyPct(7),
      progressText: `${weeklyStats.done} / ${weeklyStats.total} goals achieved`
    },
    monthly: {
      pct: getAvgDailyPct(30),
      progressText: `${monthlyStats.done} / ${monthlyStats.total} goals achieved`
    },
    yearly: {
      pct: getAvgDailyPct(365),
      progressText: `${yearlyStats.done} / ${yearlyStats.total} goals achieved`
    },
    chartData
  };
}
