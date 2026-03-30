import { useEffect, useMemo } from 'react';
import { useGoalStore } from '../stores/goalStore';
import { useSessionStore } from '../stores/sessionStore';
import { useJournalStore } from '../stores/journalStore';
import { useFailureStore } from '../stores/failureStore';
import { motion, type Variants } from 'framer-motion';
import { dashboardPeriodStats, buildDashboardHistories } from '../utils/aggregation';
import { getBrowserIanaTimeZone } from '../utils/browserTimezone';
import { Info } from 'lucide-react';
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

export const Dashboard = () => {
  const { goals, load: loadGoals } = useGoalStore();
  const { sessions, load: loadSessions } = useSessionStore();
  const { entries, load: loadJournals } = useJournalStore();
  const { failures, load: loadFailures } = useFailureStore();

  console.log('Dashboard active', { entriesCount: entries.length, failuresCount: failures.length });

  useEffect(() => {
    loadGoals();
    loadSessions();
    loadJournals();
    loadFailures();
  }, []);

  const periodStyles = [
    {
      title: 'Daily',
      sub: 'Portfolio today (your time zone)',
      barStart: '#2563eb',
      barEnd: '#22d3ee',
    },
    {
      title: 'Weekly',
      sub: 'Overall · 7-day average (inactive days = 0%)',
      barStart: '#9333ea',
      barEnd: '#fb7185',
    },
    {
      title: 'Monthly',
      sub: 'Overall · weeks with activity',
      barStart: '#06b6d4',
      barEnd: '#34d399',
    },
    {
      title: 'Yearly',
      sub: 'Overall · months with activity',
      barStart: '#10b981',
      barEnd: '#2dd4bf',
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
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, filter: 'blur(4px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col flex-1 h-full w-full min-h-0 p-3 md:p-4 gap-3 font-sans text-slate-100 overflow-hidden"
    >
      {/* Top Quotes Row */}
      <motion.div variants={itemVariants} className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-surface/30 backdrop-blur-xl p-3 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:bg-surface/40 transition-colors">
          <span className="mt-0.5 font-serif text-lg leading-none text-yellow-500/80 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">"</span>
          <p className="text-xs font-medium italic text-slate-400/90 leading-relaxed tracking-wide">Discipline is choosing between what you want now and what you want most.</p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-surface/30 backdrop-blur-xl p-3 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:bg-surface/40 transition-colors">
          <span className="mt-0.5 font-serif text-lg leading-none text-yellow-500/80 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">"</span>
          <p className="text-xs font-medium italic text-slate-400/90 leading-relaxed tracking-wide">Small progress is still progress.</p>
        </div>
      </motion.div>

      {/* Title */}
      <motion.div variants={itemVariants} className="shrink-0 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-black tracking-widest leading-none uppercase text-slate-400">Dashboard</h1>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-slate-500 hover:text-cyan-400/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
              title={PROGRESS_CALC_TOOLTIP}
              aria-label="How portfolio progress is calculated"
            >
              <Info className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p className="text-[9px] text-slate-500 mt-0.5 max-w-xl truncate">
            Calendar &amp; sessions use your device time zone (sent to the server for matching progress).
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {periodData.map((p, i) => (
          <motion.div
            key={p.title}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="p-4 rounded-[24px] bg-surface/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col gap-3 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[24px] pointer-events-none" />
            <div className="flex flex-col">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {p.title}
              </h3>
              <span className="text-xl sm:text-2xl font-bold text-white mt-0.5 drop-shadow-sm leading-none">
                {p.hasData ? `${p.pct}%` : '—'}
              </span>
              <p className="text-[9px] text-slate-500 mt-1 leading-tight opacity-80">{p.sub}</p>
            </div>
            <div className="flex-1 w-full min-h-[32px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p.history} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} barSize={4}>
                  <defs>
                    <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.barStart} />
                      <stop offset="100%" stopColor={p.barEnd} />
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
      </motion.div>

      {/* Activity Trend + Daily Progress */}
      <motion.div variants={itemVariants} className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch pb-1">
        {/* Activity Trend — 2/3 width on large screens */}
        <div className="lg:col-span-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 shadow-lg shadow-black/20 flex flex-col">
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize="10" tickLine={false} axisLine={false} dy={10} />
                <YAxis 
                  stroke="#475569"
                  fontSize="10"
                  tickLine={false} 
                  axisLine={false}
                  dx={-10}
                  tickFormatter={(val) => `${val}%`}
                />
                <Area type="monotone" dataKey="progress" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Radial — 1/3 width on large screens */}
        <div className="flex flex-col gap-3 h-full">
          <div className="flex-1 p-3 rounded-2xl bg-surface/40 backdrop-blur-2xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center relative overflow-hidden min-h-[200px]">
            <div className="absolute top-3 left-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Today</h3>
            </div>
            <div className="flex-1 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" barSize={10} data={radialData} startAngle={90} endAngle={-270}>
                  <defs>
                    <linearGradient id="radialGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <RadialBar dataKey="value" cornerRadius={5} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">{dailyHasData ? dailyPct : 0}%</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Daily Target</span>
              </div>
            </div>
          </div>

          {/* 2x2 Summary Grid */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {[
              { label: 'Goals', value: goals.length, color: 'text-cyan-400' },
              { label: 'Sessions', value: sessions.length, color: 'text-blue-400' },
              { label: 'Journals', value: entries.length, color: 'text-purple-400' },
              { label: 'Failures', value: failures.length, color: 'text-rose-400' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.02, y: -2, boxShadow: '0 15px 30px -10px rgba(0,0,0,0.5)' }}
                className="p-3 py-4 rounded-2xl bg-surface/40 backdrop-blur-2xl border border-white/5 flex flex-col items-center justify-center text-center shadow-lg relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <span className={`text-xl font-bold ${stat.color} drop-shadow-sm`}>{stat.value}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

