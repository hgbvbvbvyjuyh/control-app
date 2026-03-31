// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useGoalStore } from "../stores/goalStore";
import { useSessionStore } from "../stores/sessionStore";
import { calculateDashboardStats } from "../utils/goalStatusDashboard";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { motion } from "framer-motion";

// ─── Helpers ───────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  health:   "#4ade80",
  finance:  "#fbbf24",
  relation: "#ec4899",
  spirituality: "#60a5fa",
  default:  "#64748b",
};

function catColor(category: string | undefined): string {
  return CAT_COLORS[category?.toLowerCase() || 'default'] ?? CAT_COLORS.default;
}

const BAR_COLOR: Record<string, string> = {
  Daily:   "#6366f1",
  Weekly:  "#10b981",
  Monthly: "#f97316",
  Yearly:  "#ec4899",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, pct, text }: { title: string; pct: number; text: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1 bg-surface/30 backdrop-blur-xl border border-white/5 rounded-xl px-4 py-2.5 hover:border-white/10 transition-colors shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-[8px] uppercase tracking-[0.2em] text-secondary font-black">
          {title}
        </span>
        <span
          className="text-lg font-black tabular-nums"
          style={{ color: BAR_COLOR[title] }}
        >
          {pct}%
        </span>
      </div>

      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: BAR_COLOR[title],
            boxShadow: `0 0 10px ${BAR_COLOR[title]}40`
          }}
        />
      </div>

      <span className="text-[8px] text-secondary/50 font-bold uppercase tracking-wider">
        {text}
      </span>
    </motion.div>
  );
}

export const Dashboard = () => {
  const { goals, load: loadGoals } = useGoalStore();
  const { load: loadSessions } = useSessionStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadGoals();
    loadSessions();
  }, []);

  useEffect(() => {
    const result = calculateDashboardStats(goals);
    setStats(result);
  }, [goals]);

  if (!stats) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-secondary animate-pulse font-black uppercase tracking-widest text-xs">Loading...</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto h-screen max-h-screen overflow-hidden pt-10 pb-4 px-8">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 mb-4"
      >
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-accent tracking-tighter leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          Dashboard
        </h1>
        <div className="flex items-center gap-2.5 mt-2">
          <div className="h-[1.5px] w-8 bg-accent shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
          <p className="text-[9px] text-white font-black uppercase tracking-[0.4em] drop-shadow-sm">
            Performance Overview
          </p>
        </div>
      </motion.div>

      {/* ── Summary Bar ── */}
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between bg-surface/40 backdrop-blur-2xl border border-white/5 rounded-xl px-5 py-2.5 shadow-xl shadow-black/20 shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-pulse" />
          <span className="text-[11px] text-secondary font-medium">
            Daily Progress: <span className="text-white font-black">{stats.daily.pct}%</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
            {stats.daily.progressText}
          </span>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        <Card title="Daily"   pct={stats.daily.pct}   text={stats.daily.progressText} />
        <Card title="Weekly"  pct={stats.weekly.pct}  text={stats.weekly.progressText} />
        <Card title="Monthly" pct={stats.monthly.pct} text={stats.monthly.progressText} />
        <Card title="Yearly"  pct={stats.yearly.pct}  text={stats.yearly.progressText} />
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 mb-2">
        {/* Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 flex flex-col bg-surface/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl min-h-0"
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-[9px] font-black text-secondary uppercase tracking-[0.3em]">
              7-Day Performance Trend
            </h3>
            <span className="text-[8px] bg-white/5 text-secondary/60 px-2 py-0.5 rounded-full border border-white/5">
              % completion rate
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 10, left: 15, right: 15, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    let textAnchor = "middle";
                    if (payload.index === 0) textAnchor = "start";
                    if (payload.index === 6) textAnchor = "end";
                    return (
                      <text x={x} y={y} dy={16} fill="#94a3b8" fontSize={9} fontWeight={900} textAnchor={textAnchor}>
                        {payload.value}
                      </text>
                    );
                  }}
                  interval={0}
                />
                <YAxis 
                  hide 
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#22d3ee" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Active Goals / Info */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col bg-surface/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl overflow-hidden min-h-0"
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-[9px] font-black text-secondary uppercase tracking-[0.3em]">
              Active Goals
            </h3>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar flex-1">
            {goals.filter(g => g.status === 'active').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-secondary/20 gap-2">
                <span className="text-2xl">🎯</span>
                <p className="text-[8px] font-black uppercase tracking-widest">No active goals</p>
              </div>
            ) : (
              goals.filter(g => g.status === 'active').slice(0, 12).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2.5 bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors group shrink-0"
                >
                  <div
                    className="w-1 h-1 rounded-full shrink-0 shadow-[0_0_6px_rgba(255,255,255,0.1)]"
                    style={{ background: catColor(g.category) }}
                  />
                  <span className="text-[11px] text-text/80 font-bold flex-1 truncate group-hover:text-white transition-colors">
                    {Object.values(g.data)[0]}
                  </span>
                  <span className="text-[7px] text-secondary font-black uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                    {g.goalType}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};