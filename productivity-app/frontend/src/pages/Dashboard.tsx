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
  Daily:   "#3b82f6",
  Weekly:  "#10b981",
  Monthly: "#f59e0b",
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: EASING }}
      className="flex flex-col gap-3 bg-[#0B1220] border border-white/5 rounded-2xl p-5 transition-all duration-500 hover:border-white/10"
    >
      <div className="flex items-end justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-secondary/60 font-bold mb-1">
          {title}
        </span>
        <span
          className="text-2xl font-black tabular-nums leading-none"
          style={{ color: BAR_COLOR[title] }}
        >
          {pct}%
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, delay: 0.2 + index * 0.1, ease: EASING }}
          className="h-full rounded-full"
          style={{
            background: BAR_COLOR[title],
          }}
        />
      </div>

      <span className="text-[9px] text-secondary/40 font-bold uppercase tracking-wider">
        {text}
      </span>
    </motion.div>
  );
});

const GoalRow = memo(function GoalRow({ goal }: { goal: Goal }) {
  return (
    <div className="flex items-center gap-3 bg-[#0F172A] border border-white/5 rounded-xl p-4 hover:bg-white/5 transition-all duration-200 group">
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: catColor(goal.category) }}
      />
      <span className="text-xs text-text/90 font-bold flex-1 truncate">
        {goal.title || 'Unknown'}
      </span>
      <span className="text-[8px] text-secondary/60 font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/5">
        {goal.goalType}
      </span>
    </div>
  );
});

function ChartFallback() {
  return (
    <div className="lg:col-span-2 flex flex-col bg-[#0B1220] border border-white/5 rounded-2xl p-6 min-h-[280px] animate-pulse">
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
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto h-screen max-h-screen overflow-hidden pt-12 pb-6 px-10">
      {loadError && (
        <div
          className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          <span className="font-medium">{loadError}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadGoals()}
              className="rounded-lg bg-error/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-error hover:bg-error/30"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => clearLoadError()}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary hover:text-text"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="shrink-0">
        <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-3">
          Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-[2px] w-6 bg-[#3b82f6]" />
          <p className="text-[10px] text-secondary font-black uppercase tracking-[0.3em]">
            Performance Overview
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: EASING }}
        className="flex items-center justify-between bg-[#0B1220] border border-white/5 rounded-2xl px-6 py-4 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="text-xs text-text font-bold">
            Daily Progress: <span className="text-white font-black">{stats.daily.pct}%</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] bg-[#1E293B] text-secondary/80 border border-white/5 px-4 py-2 rounded-full font-black uppercase tracking-[0.15em]">
            Streak: {stats.streakDays}d
          </span>
          <span className="text-[9px] bg-accent/10 text-accent border border-accent/20 px-4 py-2 rounded-full font-black uppercase tracking-[0.15em]">
            {stats.daily.progressText}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <Card title="Daily"   pct={stats.daily.pct}   text={stats.daily.progressText} index={0} />
        <Card title="Weekly"  pct={stats.weekly.pct}  text={stats.weekly.progressText} index={1} />
        <Card title="Monthly" pct={stats.monthly.pct} text={stats.monthly.progressText} index={2} />
        <Card title="Yearly"  pct={stats.yearly.pct}  text={stats.yearly.progressText} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        <Suspense fallback={<ChartFallback />}>
          <div className="lg:col-span-2 bg-[#0B1220] border border-white/5 rounded-2xl p-8 flex flex-col">
            <h3 className="text-[10px] font-black text-secondary/60 uppercase tracking-[0.3em] mb-8">
              7-Day Performance Trend
            </h3>
            <div className="flex-1 min-h-0">
              <DashboardTrendChart chartData={stats.chartData} />
            </div>
          </div>
        </Suspense>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASING }}
          className="flex flex-col bg-[#0B1220] border border-white/5 rounded-2xl p-8 overflow-hidden min-h-0"
        >
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h3 className="text-[10px] font-black text-secondary/60 uppercase tracking-[0.3em]">
              Active Goals
            </h3>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar flex-1 min-h-0">
            {activeRoots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-secondary/40 gap-4 py-8 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <span className="text-3xl opacity-80 backdrop-blur-sm">🎯</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-text/80">No Active Goals</p>
                  <p className="text-xs font-medium text-secondary/60">Create a goal in the Goals tab to launch your journey.</p>
                </div>
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
