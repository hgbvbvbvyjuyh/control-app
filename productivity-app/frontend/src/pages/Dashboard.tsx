import { useEffect, useMemo } from 'react';
import { useGoalStore } from '../stores/goalStore';
import { useSessionStore } from '../stores/sessionStore';
import { useJournalStore } from '../stores/journalStore';
import { useFailureStore } from '../stores/failureStore';
import { motion, type Variants } from 'framer-motion';
import { dashboardPeriodStats, buildDashboardHistories } from '../utils/aggregation';
import { getBrowserIanaTimeZone } from '../utils/browserTimezone';
import { Info, Quote } from 'lucide-react';
import { PROGRESS_CALC_TOOLTIP } from '../constants/progressCalendarMeta';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
} from 'recharts';

/**
 * Redesigned Dashboard: Focus on visual hierarchy, clean spacing, and glassmorphism.
 * 
 * Layout Decisions:
 * - Top: Quotes and Header
 * - Middle: 4 Period Stat Cards
 * - Bottom: Activity Trend (Left) and Today Progress + Summary Grid (Right)
 * - Using `min-h-0` and `flex-1` to ensure it fits perfectly within the parent container without overflowing.
 */

export const Dashboard = () => {
  const { goals, load: loadGoals } = useGoalStore();
  const { sessions, load: loadSessions } = useSessionStore();
  const { entries, load: loadJournals } = useJournalStore();
  const { failures, load: loadFailures } = useFailureStore();

  useEffect(() => {
    loadGoals();
    loadSessions();
    loadJournals();
    loadFailures();
  }, []);

  const periodStyles = [
    {
      title: 'Daily',
      sub: 'Today',
      barStart: '#3b82f6',
      barEnd: '#60a5fa',
    },
    {
      title: 'Weekly',
      sub: 'Last 7 Days',
      barStart: '#8b5cf6',
      barEnd: '#a78bfa',
    },
    {
      title: 'Monthly',
      sub: 'Current Month',
      barStart: '#06b6d4',
      barEnd: '#22d3ee',
    },
    {
      title: 'Yearly',
      sub: 'This Year',
      barStart: '#10b981',
      barEnd: '#34d399',
    },
  ];

  const periodData = useMemo(() => {
    const dayMs = 86400000;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const zone = getBrowserIanaTimeZone();
    const stats = dashboardPeriodStats(goals, sessions, zone);
    const { dailyHistory, weeklyHistory, monthlyHistory, yearlyHistory } =
      buildDashboardHistories(goals, sessions, today, dayMs, zone);

    return periodStyles.map((style, i) => {
      const type = (['daily', 'weekly', 'monthly', 'yearly'] as const)[i];
      const { pct, hasData } = stats[type];
      let history: { name: string; value: number; hasData: boolean }[] = [];
      if (type === 'daily') history = dailyHistory;
      else if (type === 'weekly') history = weeklyHistory;
      else if (type === 'monthly') history = monthlyHistory;
      else if (type === 'yearly') history = yearlyHistory;

      return {
        ...style,
        pct,
        hasData,
        history,
      };
    });
  }, [goals, sessions]);

  const dailyPct = periodData[0].pct;
  const dailyHasData = periodData[0].hasData;

  const radialData = [
    { name: 'Progress', value: dailyHasData ? dailyPct : 0, fill: 'url(#radialGrad)' },
  ];

  const weeklyTrend = useMemo(() => {
    const periods = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;
    return periods.map((p, i) => ({
      name: p,
      progress: periodData[i].hasData ? periodData[i].pct : 0,
      hasData: periodData[i].hasData,
    }));
  }, [periodData]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col flex-1 w-full min-h-0 overflow-hidden p-6 gap-6 font-sans text-slate-100"
    >
      {/* 1. TOP SECTION: Quotes & Header */}
      <div className="shrink-0 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Discipline is choosing between what you want now and what you want most.",
            "Small progress is still progress."
          ].map((quote, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-3"
            >
              <Quote className="w-4 h-4 text-white/30 shrink-0" />
              <p className="text-xs font-medium text-slate-400 italic truncate">{quote}</p>
            </motion.div>
          ))}
        </div>

        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
              Overview
            </span>
          </div>
          <button
            type="button"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title={PROGRESS_CALC_TOOLTIP}
          >
            <Info className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* 2. STATS SECTION: 4 Period Cards */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {periodData.map((p, i) => (
          <motion.div
            key={p.title}
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex flex-col gap-4 group transition-all duration-300 hover:bg-white/[0.08]"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.title}</span>
                <span className="text-2xl font-bold mt-1 tabular-nums">
                  {p.hasData ? `${p.pct}%` : '—'}
                </span>
              </div>
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${p.barStart}20`, border: `1px solid ${p.barStart}40` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.barStart }} />
              </div>
            </div>
            
            <div className="h-10 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p.history}>
                  <defs>
                    <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.barStart} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={p.barEnd} stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {p.history.map((h, hi) => (
                      <Cell
                        key={hi}
                        fill={h.hasData ? `url(#grad${i})` : 'rgba(255,255,255,0.05)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. BOTTOM SECTION: Activity Chart & Today Progress */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activity Chart (2/3 width) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl flex flex-col min-h-0"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Activity Trend</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Progress</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                />
                <Area 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="#8b5cf6" 
                  strokeWidth={2.5} 
                  fill="url(#areaGrad)" 
                  animationDuration={1000}
                  dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#a78bfa', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right: Today Progress & Summary (1/3 width) */}
        <div className="flex flex-col gap-6 min-h-0">
          {/* Today Radial Card */}
          <motion.div
            variants={itemVariants}
            className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group"
          >
            <div className="absolute top-4 left-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Target</h3>
            </div>
            
            <div className="relative w-full aspect-square max-h-[180px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={10} data={radialData} startAngle={90} endAngle={-270}>
                  <defs>
                    <linearGradient id="radialGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <RadialBar dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tighter">{dailyHasData ? dailyPct : 0}%</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Complete</span>
              </div>
            </div>
          </motion.div>

          {/* 2x2 Summary Grid */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            {[
              { label: 'Goals',    value: goals.length,    color: 'text-blue-400',   bg: 'bg-blue-400/10' },
              { label: 'Sessions', value: sessions.length,  color: 'text-violet-400', bg: 'bg-violet-400/10' },
              { label: 'Journals', value: entries.length,   color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
              { label: 'Failures', value: failures.length,  color: 'text-rose-400',   bg: 'bg-rose-400/10' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition-colors hover:bg-white/[0.08]"
              >
                <span className={`text-xl font-bold ${stat.color} tracking-tight`}>{stat.value}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
