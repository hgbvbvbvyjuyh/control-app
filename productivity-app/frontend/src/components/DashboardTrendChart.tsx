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
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
        <AreaChart data={chartData} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <text x={x} y={y} dy={16} fill="#475569" fontSize={9} fontWeight={900} textAnchor="middle">
                  {payload.value}
                </text>
              );
            }}
            interval={0}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0B1220',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              fontSize: '9px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={1500}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
