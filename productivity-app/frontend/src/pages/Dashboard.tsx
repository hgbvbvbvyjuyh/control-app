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
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
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
    <div className="w-full px-4 py-4 space-y-4 font-sans text-slate-100">
      {/* Top Quotes Row */}
      <div className="grid shrink-0 grid-cols-1 gap-1.5 md:grid-cols-2">
        <div className="flex items-start gap-4 rounded-2xl border border-white/5 bg-[#13151A] p-2 px-3 shadow-xl">
          <span className="mt-1 font-serif text-base leading-none text-yellow-500">"</span>
          <p className="text-[10px] font-medium italic text-slate-400">Discipline is choosing between what you want now and what you want most.</p>
        </div>
        <div className="flex items-start gap-4 rounded-2xl border border-white/5 bg-[#13151A] p-2 px-3 shadow-xl">
          <span className="mt-1 font-serif text-base leading-none text-yellow-500">"</span>
          <p className="text-[10px] font-medium italic text-slate-400">Small progress is still progress.</p>
        </div>
      </div>

      {/* Title */}
      <div className="shrink-0 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/></svg>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black tracking-widest leading-none uppercase text-slate-400">Dashboard</h1>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-slate-500 hover:text-cyan-400/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
              title={PROGRESS_CALC_TOOLTIP}
              aria-label="How portfolio progress is calculated"
            >
              <Info className="w-3.5 h-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <p className="text-[9px] text-slate-500 mt-0.5 max-w-xl">
            Calendar &amp; sessions use your device time zone (sent to the server for matching progress).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {periodData.map((p, i) => (
          <motion.div
            key={p.title}
            whileHover={{ scale: 1.01, y: -1 }}
            className="group flex w-full h-full flex-col p-4 items-center justify-center rounded-2xl border border-white/5 bg-[#13151A] shadow-2xl transition-all duration-300 hover:border-white/10"
            style={{ boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}
          >
            <div className="flex flex-col items-center justify-start gap-0.5 text-center">
              <h3 className="text-[11px] font-semibold tracking-wide text-white uppercase opacity-80">
                {p.title}
              </h3>
              <span
                className={`text-2xl font-bold leading-none ${
                  p.hasData ? 'text-white' : 'text-slate-500'
                }`}
              >
                {p.hasData ? `${p.pct}%` : '—'}
              </span>
              <p className="text-[10px] text-slate-400 leading-snug px-1">{p.sub}</p>
            </div>
            <div className="h-10 w-full mt-2 shrink-0">
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
                        fill={h.hasData ? `url(#grad${i})` : 'rgba(255,255,255,0.06)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Trend + Goals Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Trend — 2/3 width on large screens */}
        <div className="flex flex-col h-full rounded-2xl border border-white/5 bg-[#13151A] p-4 shadow-2xl lg:col-span-2 justify-center">
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={true} horizontal={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis 
                  stroke="#475569" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickMargin={10}
                />
                <Tooltip
                  contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                  formatter={(value, _name, item) => {
                    const payload = item?.payload as { hasData?: boolean } | undefined;
                    if (payload && payload['hasData'] === false) return ['No data', 'Progress'];
                    return [`${value}%`, 'Progress'];
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  fill="url(#areaGrad)" 
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#c4b5fd', strokeWidth: 0 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <h3 className="mt-2 text-xs font-bold uppercase tracking-widest text-center text-slate-400">
            Activity Trend
          </h3>
        </div>

        {/* Goals Overview — 1/3 width on large screens */}
        <div className="flex flex-col h-full rounded-2xl border border-white/5 bg-[#13151A] p-4 shadow-2xl lg:col-span-1">
          <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Goals Overview</h3>
          
          {/* Centered Circle */}
          <div className="flex flex-1 items-center justify-center py-3 min-h-0">
            <div className="relative w-32 h-32 shrink-0 mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="80%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
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
                  <span
                    className={`text-xl font-bold leading-none ${
                      dailyHasData ? 'text-white drop-shadow-md' : 'text-slate-500'
                    }`}
                  >
                    {dailyHasData ? `${dailyPct}%` : '—'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 leading-none">Daily</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evenly Spaced Stats */}
          <div className="grid grid-cols-2 gap-2 w-full shrink-0 pt-2 mt-auto">
            {[
              { label: 'Goals', value: goals.length, color: 'text-cyan-400' },
              { label: 'Sessions', value: sessions.length, color: 'text-blue-400' },
              { label: 'Journals', value: entries.length, color: 'text-purple-400' },
              { label: 'Failures', value: failures.length, color: 'text-rose-400' }
            ].map(stat => (
              <div key={stat.label} className="p-2 sm:p-3 rounded-xl bg-[#1D1F25] border border-white/[0.05] flex flex-col items-center justify-center text-center hover:bg-white/[0.05] transition-all">
                <span className={`text-base sm:text-lg font-bold ${stat.color} leading-none`}>{stat.value}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

