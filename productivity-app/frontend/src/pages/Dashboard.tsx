// src/pages/Dashboard.tsx
import { lazy, memo, Suspense, useEffect, useMemo } from "react";
import { useGoalStore } from "../stores/goalStore";
import { calculateDashboardStats } from "../utils/goalStatusDashboard";
import { motion } from "framer-motion";
import type { Goal } from "../db";

const DashboardTrendChart = lazy(() =>
  import("../components/DashboardTrendChart").then((m) => ({ default: m.DashboardTrendChart }))
);

const EASING = [0.22, 1, 0.36, 1] as const;

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

const Card = memo(function StatCard({
  title,
  pct,
  text,
  index = 0,
}: {
  title: string;
  pct: number;
  text: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className="flex flex-col gap-1 bg-surface/30 backdrop-blur-xl border border-white/5 rounded-xl px-4 py-2.5 transition-colors duration-500 hover:bg-surface/50 hover:border-white/10 hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)]"
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
          transition={{ duration: 1.2, delay: 0.2 + index * 0.1, ease: EASING }}
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
});

const GoalRow = memo(function GoalRow({ goal }: { goal: Goal }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-all duration-200 group shrink-0 hover:shadow-md cursor-pointer hover:border-white/20 active:scale-[0.98]">
      <div
        className="w-1 h-1 rounded-full shrink-0 shadow-[0_0_6px_rgba(255,255,255,0.1)]"
        style={{ background: catColor(goal.category) }}
      />
      <span className="text-[11px] text-text/80 font-bold flex-1 truncate group-hover:text-white transition-all duration-300">
        {goal.title || 'Unknown'}
      </span>
      <span className="text-[7px] text-secondary font-black uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
        {goal.goalType}
      </span>
    </div>
  );
});

function ChartFallback() {
  return (
    <div className="lg:col-span-2 flex flex-col bg-surface/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 min-h-[280px] animate-pulse">
      <div className="h-3 w-40 bg-white/10 rounded mb-4" />
      <div className="flex-1 min-h-[200px] bg-white/5 rounded-xl" />
    </div>
  );
}

export const Dashboard = () => {
  const { goals, load: loadGoals, loading, loadError, clearLoadError } = useGoalStore();
  const stats = useMemo(() => calculateDashboardStats(goals), [goals]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const activeRoots = useMemo(
    () =>
      goals.filter(
        (g) => g.status === 'active' && !g.deletedAt && (g.parentId == null || g.parentId === '')
      ),
    [goals]
  );

  if (loading && goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-secondary animate-pulse font-black uppercase tracking-widest text-xs">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto h-screen max-h-screen overflow-hidden pt-10 pb-4 px-8">
      {loadError && (
        <div
          className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          <span className="font-medium">{loadError}</span>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => void loadGoals()}
              className="rounded-lg bg-error/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-error hover:bg-error/30"
            >
              Retry
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => clearLoadError()}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary hover:text-text"
            >
              Dismiss
            </motion.button>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease: EASING }}
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

      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: EASING }}
        className="flex items-center justify-between bg-surface/40 backdrop-blur-2xl border border-white/5 rounded-xl px-5 py-2.5 shadow-xl shadow-black/20 shrink-0 transition-all duration-500 hover:bg-surface/60 hover:shadow-2xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-pulse" />
          <span className="text-[11px] text-secondary font-medium">
            Daily Progress: <span className="text-white font-black">{stats.daily.pct}%</span>
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[8px] bg-white/5 text-secondary border border-white/10 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
            Streak: {stats.streakDays}d
          </span>
          <span className="text-[8px] bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
            {stats.daily.progressText}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0 relative z-10">
        <Card title="Daily"   pct={stats.daily.pct}   text={stats.daily.progressText} index={0} />
        <Card title="Weekly"  pct={stats.weekly.pct}  text={stats.weekly.progressText} index={1} />
        <Card title="Monthly" pct={stats.monthly.pct} text={stats.monthly.progressText} index={2} />
        <Card title="Yearly"  pct={stats.yearly.pct}  text={stats.yearly.progressText} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 mb-2">
        <Suspense fallback={<ChartFallback />}>
          <DashboardTrendChart key={JSON.stringify(stats.chartData)} chartData={stats.chartData} />
        </Suspense>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASING }}
          className="flex flex-col bg-surface/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl overflow-hidden min-h-0 transition-all duration-500 hover:border-white/10 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-[9px] font-black text-secondary uppercase tracking-[0.3em]">
              Active Goals
            </h3>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar flex-1 min-h-0">
            {activeRoots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-secondary/40 gap-4 py-8 px-4 text-center">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }} 
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <span className="text-3xl opacity-80 backdrop-blur-sm">🎯</span>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-text/80">No Active Goals</p>
                  <p className="text-xs font-medium text-secondary/60">Create a goal in the Goals tab to launch your journey.</p>
                </motion.div>
              </div>
            ) : (
              activeRoots.slice(0, 12).map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: EASING }}
                >
                  <GoalRow goal={g} />
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
