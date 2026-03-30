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
      className="flex flex-col flex-1 w-full min-h-0 overflow-hidden p-4 md:p-5 gap-3 font-sans text-slate-100 relative z-10"
    >
      {/* === Top Section === */}
      <div className="shrink-0 flex flex-col gap-3">
        {/* Top Quotes Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <motion.div
            whileHover={{ y: -1, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-3 rounded-xl border border-yellow-500/10 bg-gradient-to-br from-slate-900/60 via-slate-800/30 to-slate-900/60 backdrop-blur-xl py-3 px-4 shadow-[0_2px_16px_rgba(0,0,0,0.3)] relative overflow-hidden group cursor-default"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/[0.04] to-transparent pointer-events-none" />
            <span className="shrink-0 font-serif text-lg leading-none text-yellow-400/70 relative z-10">"</span>
            <p className="text-[11px] font-medium italic text-slate-400/90 leading-snug tracking-wide relative z-10 truncate">Discipline is choosing between what you want now and what you want most.</p>
          </motion.div>
          <motion.div
            whileHover={{ y: -1, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-3 rounded-xl border border-yellow-500/10 bg-gradient-to-br from-slate-900/60 via-slate-800/30 to-slate-900/60 backdrop-blur-xl py-3 px-4 shadow-[0_2px_16px_rgba(0,0,0,0.3)] relative overflow-hidden group cursor-default"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/[0.04] to-transparent pointer-events-none" />
            <span className="shrink-0 font-serif text-lg leading-none text-yellow-400/70 relative z-10">"</span>
            <p className="text-[11px] font-medium italic text-slate-400/90 leading-snug tracking-wide relative z-10 truncate">Small progress is still progress.</p>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div variants={itemVariants} className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[11px] font-black tracking-[0.25em] leading-none uppercase bg-gradient-to-r from-slate-300 to-slate-500 bg-clip-text text-transparent shrink-0">Dashboard</h1>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-slate-600 hover:text-cyan-400 transition-colors duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 z-10 relative"
              title={PROGRESS_CALC_TOOLTIP}
              aria-label="How portfolio progress is calculated"
            >
              <Info className="w-3 h-3" strokeWidth={2.5} aria-hidden />
            </button>
            <span className="text-[10px] text-slate-600/80 hidden md:block truncate font-medium">
              Calendar &amp; sessions use your device time zone.
            </span>
          </div>
        </motion.div>

        {/* Period Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {periodData.map((p, i) => {
            const glows = [
              '0 4px 24px rgba(37,99,235,0.18), 0 1px 0 rgba(255,255,255,0.04) inset',
              '0 4px 24px rgba(147,51,234,0.18), 0 1px 0 rgba(255,255,255,0.04) inset',
              '0 4px 24px rgba(6,182,212,0.18), 0 1px 0 rgba(255,255,255,0.04) inset',
              '0 4px 24px rgba(16,185,129,0.18), 0 1px 0 rgba(255,255,255,0.04) inset',
            ];
            const hoverGlows = [
              '0 8px 32px rgba(37,99,235,0.30), 0 1px 0 rgba(255,255,255,0.06) inset',
              '0 8px 32px rgba(147,51,234,0.30), 0 1px 0 rgba(255,255,255,0.06) inset',
              '0 8px 32px rgba(6,182,212,0.30), 0 1px 0 rgba(255,255,255,0.06) inset',
              '0 8px 32px rgba(16,185,129,0.30), 0 1px 0 rgba(255,255,255,0.06) inset',
            ];
            const fromColors = [
              'from-blue-500/[0.07]', 'from-purple-500/[0.07]',
              'from-cyan-500/[0.07]', 'from-emerald-500/[0.07]',
            ];
            const borderColors = [
              'border-blue-500/[0.12]', 'border-purple-500/[0.12]',
              'border-cyan-500/[0.12]', 'border-emerald-500/[0.12]',
            ];
            const labelColors = [
              'text-blue-400/80', 'text-purple-400/80',
              'text-cyan-400/80', 'text-emerald-400/80',
            ];
            return (
              <motion.div
                key={p.title}
                variants={itemVariants}
                whileHover={{ scale: 1.025, y: -3, boxShadow: hoverGlows[i] }}
                whileTap={{ scale: 0.975 }}
                style={{ boxShadow: glows[i] }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={`p-4 rounded-2xl bg-gradient-to-br ${fromColors[i]} via-slate-900/50 to-slate-900/80 backdrop-blur-xl border ${borderColors[i]} flex flex-col gap-3 relative group overflow-hidden cursor-default`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                <div className="flex flex-col relative z-10">
                  <h3 className={`text-[10px] font-bold uppercase tracking-[0.18em] ${labelColors[i]}`}>
                    {p.title}
                  </h3>
                  <span className="text-2xl font-black text-white mt-0.5 leading-none tracking-tight" style={{ textShadow: '0 0 20px rgba(255,255,255,0.15)' }}>
                    {p.hasData ? `${p.pct}%` : '—'}
                  </span>
                  <p className="text-[10px] text-slate-500/60 mt-1.5 leading-snug font-medium line-clamp-1">{p.sub}</p>
                </div>
                <div className="flex-1 w-full min-h-[32px] relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={p.history} margin={{ top: 0, left: 0, right: 0, bottom: 0 }} barSize={4}>
                      <defs>
                        <linearGradient id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={p.barStart} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={p.barEnd} stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        {p.history.map((h, hi) => (
                          <Cell
                            key={hi}
                            fill={h.hasData ? `url(#grad${i})` : 'rgba(255,255,255,0.04)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* === Bottom Section === */}
      <motion.div variants={itemVariants} className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
        {/* Activity Trend */}
        <motion.div
          whileHover={{ boxShadow: '0 12px 48px rgba(139,92,246,0.18)' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset' }}
          className="h-full p-4 rounded-2xl bg-gradient-to-br from-violet-500/[0.06] via-slate-900/50 to-slate-900/80 backdrop-blur-xl border border-violet-500/[0.1] flex flex-col min-h-0 relative overflow-hidden group cursor-default"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.025] to-transparent pointer-events-none" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400/70 mb-2 relative z-10 shrink-0">Activity Trend</h3>
          <div className="flex-1 w-full min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="60%" stopColor="#6d28d9" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#334155" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} dy={6} tick={{ fill: '#64748b' }} />
                <YAxis
                  stroke="#334155"
                  fontSize={10}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  dx={-4}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b' }}
                />
                <Area type="monotone" dataKey="progress" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" animationDuration={1500} dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }} activeDot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right Side */}
        <div className="h-full flex flex-col gap-3 min-h-0">
          {/* Today — hero radial card ~60% */}
          <motion.div
            whileHover={{ boxShadow: '0 16px 56px rgba(59,130,246,0.28), 0 0 0 1px rgba(59,130,246,0.15)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ boxShadow: '0 8px 40px rgba(59,130,246,0.15), 0 0 0 1px rgba(59,130,246,0.08)' }}
            className="flex-[3] min-h-0 pt-4 pb-2 px-4 rounded-2xl bg-gradient-to-b from-blue-950/60 via-slate-900/50 to-slate-900/80 backdrop-blur-2xl border border-blue-500/[0.15] flex flex-col relative group overflow-hidden cursor-default"
          >
            {/* Ambient glow layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.06] via-transparent to-cyan-500/[0.03] pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400/70 shrink-0 mb-1 relative z-10">Today</h3>
            <div className="flex-1 min-h-0 flex items-center justify-center relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="64%" outerRadius="84%" barSize={9} data={radialData} startAngle={90} endAngle={-270}>
                  <defs>
                    <linearGradient id="radialGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <filter id="radialGlow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <RadialBar dataKey="value" cornerRadius={5} filter="url(#radialGlow)" />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className="text-3xl font-black text-white tracking-tight leading-none"
                  style={{ textShadow: '0 0 30px rgba(96,165,250,0.6), 0 0 60px rgba(6,182,212,0.3)' }}
                >
                  {dailyHasData ? dailyPct : 0}%
                </span>
                <span className="text-[9px] font-semibold text-blue-400/60 uppercase tracking-[0.14em] mt-2">Daily Target</span>
              </div>
            </div>
          </motion.div>

          {/* 2×2 Summary Grid — ~40% */}
          <div className="flex-[2] min-h-0 grid grid-cols-2 gap-3">
            {([
              { label: 'Goals',    value: goals.length,    color: 'text-cyan-300',   glow: 'rgba(6,182,212,0.20)',   border: 'border-cyan-500/[0.12]',   from: 'from-cyan-500/[0.06]'    },
              { label: 'Sessions', value: sessions.length,  color: 'text-blue-300',   glow: 'rgba(59,130,246,0.20)',  border: 'border-blue-500/[0.12]',   from: 'from-blue-500/[0.06]'    },
              { label: 'Journals', value: entries.length,   color: 'text-purple-300', glow: 'rgba(168,85,247,0.20)', border: 'border-purple-500/[0.12]', from: 'from-purple-500/[0.06]'  },
              { label: 'Failures', value: failures.length,  color: 'text-rose-300',   glow: 'rgba(244,63,94,0.20)',  border: 'border-rose-500/[0.12]',   from: 'from-rose-500/[0.06]'    },
            ] as const).map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.04, y: -2, boxShadow: `0 8px 28px ${stat.glow}` }}
                whileTap={{ scale: 0.96 }}
                style={{ boxShadow: `0 2px 16px ${stat.glow.replace('0.20', '0.10')}` }}
                className={`rounded-xl bg-gradient-to-br ${stat.from} via-slate-900/50 to-slate-900/80 backdrop-blur-xl border ${stat.border} flex flex-col items-center justify-center text-center relative group overflow-hidden cursor-default`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                <span className={`text-xl font-black ${stat.color} leading-none relative z-10`} style={{ textShadow: `0 0 16px ${stat.glow}` }}>{stat.value}</span>
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.16em] mt-1.5 leading-none relative z-10">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

