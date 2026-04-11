import { memo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

export type TrendDatum = { day: string; value: number };

type Props = { chartData: TrendDatum[] };

/** Lazy-loaded with Dashboard to keep the Recharts bundle off the main chunk. */
export const DashboardTrendChart = memo(function DashboardTrendChart({ chartData }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="lg:col-span-2 flex flex-col bg-surface/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl min-h-0 transition-all duration-500 hover:border-white/10 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-[9px] font-black text-secondary uppercase tracking-[0.3em]">7-Day Performance Trend</h3>
        <span className="text-[8px] bg-white/5 text-secondary/60 px-2 py-0.5 rounded-full border border-white/5">
          % completion rate
        </span>
      </div>
      <div className="flex-1 min-h-0 min-w-0 w-full min-h-[220px] h-[min(40vh,320px)] md:h-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 10, left: 15, right: 15, bottom: 20 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={(props) => {
                const { x, y, payload } = props;
                let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                if (payload.index === 0) textAnchor = 'start';
                if (payload.index === 6) textAnchor = 'end';
                return (
                  <text x={x} y={y} dy={16} fill="#94a3b8" fontSize={9} fontWeight={900} textAnchor={textAnchor}>
                    {payload.value}
                  </text>
                );
              }}
              interval={0}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
              connectNulls
              baseLine={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});
