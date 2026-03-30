import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
  { name: 'Day', value: 10 },
  { name: '', value: 38 },
  { name: 'Week', value: 35 },
  { name: '', value: 65 },
  { name: 'Month', value: 60 },
  { name: '', value: 80 },
  { name: 'Year', value: 88 },
];

export const PerformanceChart = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full rounded-2xl bg-white/5 backdrop-blur-md border border-white/5 p-4 relative"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818CF8" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
            </linearGradient>
            
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
            dy={10}
            interval={0}
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
            tickFormatter={(val) => `${val}%`}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
          />
          
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#818CF8" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            activeDot={{ r: 6, fill: '#818CF8', stroke: '#fff', strokeWidth: 2 }}
            filter="url(#glow)"
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
