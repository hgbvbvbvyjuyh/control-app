import { motion } from 'framer-motion';
import { Sparkles, Activity, Target } from 'lucide-react';

interface InsightCardProps {
  title: string;
  subtitle: string;
  iconType: 'sparkles' | 'activity' | 'target';
  delay?: number;
}

const icons = {
  sparkles: Sparkles,
  activity: Activity,
  target: Target,
};

export const InsightCard = ({ title, subtitle, iconType, delay = 0 }: InsightCardProps) => {
  const Icon = icons[iconType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 min-w-[240px] glass-panel rounded-2xl p-4 flex items-center gap-4 group cursor-default border border-white/[0.03] hover:border-white/[0.08] transition-all duration-300"
    >
      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 group-hover:bg-primary/5 transition-all duration-300">
        <Icon size={16} className="text-secondary/60 group-hover:text-primary transition-all duration-300" />
      </div>
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40">
          {title}
        </h4>
        <p className="text-xs font-bold text-white/80 mt-0.5 leading-tight">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
};
