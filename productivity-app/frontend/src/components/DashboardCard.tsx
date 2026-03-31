import { motion } from 'framer-motion';

export interface DashboardCardProps {
  title: string;
  subtitle: string;
  value: string;
  progressText?: string;
  gradientFrom: string;
  gradientTo: string;
  chartData: { day: string; value: number }[];
  delay?: number;
}

export const DashboardCard = ({ 
  title, 
  subtitle,
  value,
  progressText,
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
      className="relative cursor-pointer rounded-2xl bg-white/5 backdrop-blur-md border border-white/5 p-4 overflow-hidden flex flex-col justify-between h-[130px]"
    >
      <div className="flex flex-col z-10 w-full">
        <span className="text-white/90 text-xs font-semibold tracking-wide">{title}</span>
        <span className="text-white/40 text-[9px] font-medium mt-0.5">{subtitle}</span>
        
        <span className="text-white text-2xl font-bold tracking-tight leading-none mt-2">{value}</span>
        {progressText && <span className="text-white/40 text-[9px] font-medium mt-0.5">{progressText}</span>}
      </div>

      <div className="flex items-end justify-between w-full h-[35px] gap-[2px] mt-2 z-10">
        {chartData.map((data, index) => {
          const heightPercent = Math.max(10, Math.min(100, data.value));
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
