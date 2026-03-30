import { motion } from 'framer-motion';

export interface DashboardCardProps {
  title: string;
  subtitle: string;
  value: string;
  gradientFrom: string;
  gradientTo: string;
  chartData: number[];
  delay?: number;
}

export const DashboardCard = ({ 
  title, 
  subtitle,
  value,
  gradientFrom,
  gradientTo,
  chartData,
  delay = 0,
}: DashboardCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ 
        duration: 0.8, 
        delay, 
        ease: [0.22, 1, 0.36, 1] 
      }}
      className="relative cursor-pointer rounded-[18px] bg-white/5 backdrop-blur-md border border-white/5 p-5 overflow-hidden flex flex-col justify-between h-[180px]"
    >
      <div className="flex flex-col z-10 w-full">
        <span className="text-white/90 text-[15px] font-semibold tracking-wide">{title}</span>
        <span className="text-white/40 text-[11px] font-medium mt-0.5">{subtitle}</span>
        
        <span className="text-white text-[34px] font-bold tracking-tight leading-none mt-3">{value}</span>
        <span className="text-white/40 text-[10px] font-medium mt-1">
          3 / 5 weeks
        </span>
      </div>

      <div className="flex items-end justify-between w-full h-[45px] gap-[3px] mt-4 z-10">
        {chartData.map((dataValue, index) => {
          const heightPercent = Math.max(10, Math.min(100, dataValue));
          return (
            <motion.div
              key={index}
              style={{ height: `${heightPercent}%` }}
              className={`w-full rounded-[2px] bg-gradient-to-t ${gradientFrom} ${gradientTo} opacity-80 hover:opacity-100 transition-opacity`}
            />
          );
        })}
      </div>
    </motion.div>
  );
};
