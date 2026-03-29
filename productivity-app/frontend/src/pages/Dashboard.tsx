import { useEffect, useMemo } from 'react';
import { useGoalStore } from '../stores/goalStore';
import { useSessionStore } from '../stores/sessionStore';
import { useJournalStore } from '../stores/journalStore';
import { useFailureStore } from '../stores/failureStore';
import { motion } from 'framer-motion';
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

  return (
    <div className="flex flex-col min-h-screen w-full p-3 md:p-4 gap-3 font-sans text-slate-100">
      {/* Top Quotes Row */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-[#13151A] p-2 px-3 shadow-lg">
          <span className="mt-0.5 font-serif text-sm leading-none text-yellow-500">"</span>
          <p className="text-[10px] font-medium italic text-slate-400 leading-tight">Discipline is choosing between what you want now and what you want most.</p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-[#13151A] p-2 px-3 shadow-lg">
          <span className="mt-0.5 font-serif text-sm leading-none text-yellow-500">"</span>
          <p className="text-[10px] font-medium italic text-slate-400 leading-tight">Small progress is still progress.</p>
        </div>
      </div>

      {/* Title */}
      <div className="shrink-0 flex items-center gap-2">
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
      </div>

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {periodData.map((p, i) => (
          <motion.div
            key={p.title}
            whileHover={{ scale: 1.01, y: -1 }}
            className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-lg shadow-black/20 flex flex-col gap-2"
          >
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
      </div>

      {/* Activity Trend + Daily Progress */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch pb-1">
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
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickMargin={10}
                />
                <Area 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  fill="url(#areaGrad)" 
                  dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400 shrink-0">
            Activity Trend
          </div>
        </div>

        {/* Daily Progress Circle & Stats — 1/3 width on large screens */}
        <div className="lg:col-span-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800 shadow-lg shadow-black/20 flex flex-col justify-between h-full">
          
          {/* Centered Circle */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center w-full shrink">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                <defs>
                  <linearGradient id="radialGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,0.05)' }} cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-white drop-shadow-md leading-tight">
                  {dailyHasData ? `${dailyPct}%` : '0%'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Daily</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 w-full shrink-0">
            {[
              { label: 'Goals', value: goals.length, color: 'text-cyan-400' },
              { label: 'Sessions', value: sessions.length, color: 'text-blue-400' },
              { label: 'Journals', value: entries.length, color: 'text-purple-400' },
              { label: 'Failures', value: failures.length, color: 'text-rose-400' }
            ].map(stat => (
              <div key={stat.label} className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 flex flex-col items-center justify-center text-center">
                <span className={`text-lg font-bold ${stat.color} drop-shadow-md leading-none`}>{stat.value}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
};

