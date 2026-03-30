import { useEffect, useMemo } from 'react';
import { useGoalStore } from '../stores/goalStore';
import { useSessionStore } from '../stores/sessionStore';
import { useJournalStore } from '../stores/journalStore';
import { useFailureStore } from '../stores/failureStore';
import { motion, type Variants } from 'framer-motion';
import { dashboardPeriodStats, buildDashboardHistories } from '../utils/aggregation';
import { getBrowserIanaTimeZone } from '../utils/browserTimezone';
import { BarChart3, Quote as QuoteIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  CartesianGrid,
} from 'recharts';

/**
 * Redesigned Dashboard: Matches the reference image exactly.
 * 
 * Layout:
 * - Top: Two Quote Cards
 * - Header: Title and Subtitle
 * - Middle: 4 Vertical Stat Cards with Bar Charts
 * - Bottom: Full-width Activity Trend Area Chart
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
      sub: "Today's progress",
      barStart: '#3b82f6',
      barEnd: '#60a5fa',
    },
    {
      title: 'Weekly',
      sub: 'This week',
      barStart: '#8b5cf6',
      barEnd: '#d946ef',
    },
    {
      title: 'Monthly',
      sub: 'This month',
      barStart: '#06b6d4',
      barEnd: '#22d3ee',
    },
    {
      title: 'Yearly',
      sub: 'This year',
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

      // Extract raw counts for the footer
      let count = 0;
      let total = 0;
      if (type === 'daily') {
        count = sessions.filter(s => new Date(s.startTime).toDateString() === today.toDateString()).length;
        total = goals.length;
      } else if (type === 'weekly') {
        count = sessions.length; // Simplified for display
        total = 7; 
      } else if (type === 'monthly') {
        count = entries.length;
        total = 30;
      } else {
        count = failures.length;
        total = 365;
      }

      return {
        ...style,
        pct,
        hasData,
        history,
        count,
        total,
      };
    });
  }, [goals, sessions, entries, failures]);

  const weeklyTrend = useMemo(() => {
    const periods = ['Day', 'Week', 'Month', 'Year'] as const;
    return periods.map((p, i) => ({
      name: p,
      progress: periodData[i].hasData ? periodData[i].pct : 0,
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
      className="flex flex-col flex-1 w-full min-h-0 overflow-hidden p-6 gap-8 font-sans text-slate-100 bg-[#0a0a0a]"
    >
      {/* 1. TOP SECTION: Quotes */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          "Discipline is choosing between what you want now and what you want most.",
          "Small progress is still progress."
        ].map((quote, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="bg-[#111111] border border-white/5 p-5 rounded-xl flex items-start gap-4"
          >
            <QuoteIcon className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="currentColor" />
            <p className="text-sm font-medium text-slate-400 leading-relaxed">{quote}</p>
          </motion.div>
        ))}
      </div>

      {/* 2. HEADER SECTION */}
      <motion.div variants={itemVariants} className="shrink-0 flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight text-white">Dashboard</h1>
        </div>
        <p className="text-xs font-medium text-slate-500 ml-7.5">Your progress at a glance</p>
      </motion.div>

      {/* 3. STATS SECTION: 4 Period Cards */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {periodData.map((p, i) => (
          <motion.div
            key={p.title}
            variants={itemVariants}
            className="bg-[#111111] border border-white/5 p-6 rounded-xl flex flex-col gap-1 min-h-[160px] relative overflow-hidden group"
          >
            <span className="text-xs font-medium text-slate-400">{p.title}</span>
            <span className="text-[10px] font-medium text-slate-500 mb-2">{p.sub}</span>
            <span className="text-3xl font-bold text-white tabular-nums">
              {p.hasData ? `${p.pct}%` : '—'}
            </span>
            <span className="text-[10px] font-medium text-slate-500 mt-1">
              {p.count} / {p.total} {p.title === 'Daily' ? 'sessions' : p.title === 'Weekly' ? 'days' : p.title === 'Monthly' ? 'journals' : 'failures'}
            </span>
            
            {/* Chart at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 w-full px-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p.history} margin={{ bottom: 4 }}>
                  <defs>
                    <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.barStart} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={p.barEnd} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={4}>
                    {p.history.map((h, hi) => (
                      <Cell
                        key={hi}
                        fill={h.hasData ? `url(#grad${i})` : 'rgba(255,255,255,0.03)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 4. BOTTOM SECTION: Activity Chart */}
      <motion.div
        variants={itemVariants}
        className="flex-1 bg-[#111111] border border-white/5 p-8 rounded-xl flex flex-col min-h-0 relative overflow-hidden"
      >
        <div className="flex-1 w-full min-h-0 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(val) => `${val}%`}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Area 
                type="monotone" 
                dataKey="progress" 
                stroke="url(#lineGrad)" 
                strokeWidth={3} 
                fill="url(#areaGrad)" 
                animationDuration={1500}
                dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#fff', strokeWidth: 2, stroke: '#8b5cf6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};
