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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 bg-surface/30 backdrop-blur-xl border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-secondary font-black">
          {title}
        </span>
        <span
          className="text-2xl font-black tabular-nums"
          style={{ color: BAR_COLOR[title] }}
        >
          {pct}%
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
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

      <span className="text-[10px] text-secondary/60 font-bold uppercase tracking-wider">
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
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pt-16 pb-32">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1 className="text-4xl font-black text-white tracking-tighter">Dashboard</h1>
        <p className="text-secondary text-sm font-bold uppercase tracking-widest mt-1 opacity-60">Performance Overview</p>
      </motion.div>

      {/* ── Summary Bar ── */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between bg-surface/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] px-8 py-5 shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_15px_rgba(74,222,128,0.5)] animate-pulse" />
          <span className="text-sm text-secondary font-medium">
            Daily Progress: <span className="text-white font-black">{stats.daily.pct}%</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-4 py-1.5 rounded-full font-black uppercase tracking-widest">
            {stats.daily.progressText}
          </span>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Daily"   pct={stats.daily.pct}   text={stats.daily.progressText} />
        <Card title="Weekly"  pct={stats.weekly.pct}  text={stats.weekly.progressText} />
        <Card title="Monthly" pct={stats.monthly.pct} text={stats.monthly.progressText} />
        <Card title="Yearly"  pct={stats.yearly.pct}  text={stats.yearly.progressText} />
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 flex flex-col bg-surface/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-secondary uppercase tracking-[0.3em]">
              7-Day Performance Trend
            </h3>
            <span className="text-[10px] bg-white/5 text-secondary/60 px-3 py-1 rounded-full border border-white/5">
              % completion rate
            </span>
          </div>
          <div className="flex-1 min-h-[300px] -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ left: 20, right: 20, bottom: 0 }}>
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
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  interval={0}
                  dy={10}
                />
                <YAxis 
                  hide 
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#22d3ee" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Active Goals / Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col bg-surface/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-secondary uppercase tracking-[0.3em]">
              Active Goals
            </h3>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar">
            {goals.filter(g => g.status === 'active').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-secondary/20 gap-4">
                <span className="text-4xl">🎯</span>
                <p className="text-[10px] font-black uppercase tracking-widest">No active goals</p>
              </div>
            ) : (
              goals.filter(g => g.status === 'active').slice(0, 6).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                    style={{ background: catColor(g.category) }}
                  />
                  <span className="text-xs text-text/80 font-bold flex-1 truncate group-hover:text-white transition-colors">
                    {Object.values(g.data)[0]}
                  </span>
                  <span className="text-[9px] text-secondary font-black uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded border border-white/5">
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