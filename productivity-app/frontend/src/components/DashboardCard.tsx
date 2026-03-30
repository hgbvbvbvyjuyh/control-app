import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  delay?: number;
  onClick?: () => void;
}

export const DashboardCard = ({ 
  title, 
  description, 
  icon: Icon, 
  gradient, 
  delay = 0,
  onClick 
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
      whileHover={{ 
        y: -4, 
        transition: { type: 'spring', stiffness: 200, damping: 25 }
      }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      {/* Soft Background Glow - Large & Subtle */}
      <div className={`absolute -inset-8 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] blur-[100px] transition-opacity duration-1000 rounded-full pointer-events-none`} />
      
      {/* Main Card Surface */}
      <div className="relative h-full glass-surface rounded-[2.5rem] p-10 flex flex-col items-start gap-8 overflow-hidden transition-all duration-700 bg-white/[0.01] hover:bg-white/[0.03]">
        {/* Top Edge Inner Light */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Icon Container with Micro-interaction */}
        <div className="relative">
          <div className={`absolute -inset-4 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-700 rounded-full`} />
          <motion.div 
            whileHover={{ y: -2, scale: 1.05 }}
            className={`p-5 rounded-[1.25rem] bg-gradient-to-br ${gradient} bg-opacity-[0.03] border border-white/5 shadow-2xl relative z-10 transition-transform duration-500`}
          >
            <Icon size={24} className="text-white opacity-80 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        </div>

        {/* Content Hierarchy */}
        <div className="space-y-3">
          <h3 className="text-2xl font-black tracking-tighter text-white/90 group-hover:text-white transition-colors duration-500">
            {title}
          </h3>
          <p className="text-secondary/60 text-sm leading-relaxed font-medium group-hover:text-secondary/80 transition-colors duration-500">
            {description}
          </p>
        </div>

        {/* Minimalist Interactive Hint */}
        <div className="mt-auto pt-4 flex items-center gap-3 text-[9px] uppercase tracking-[0.3em] font-black text-secondary/30 group-hover:text-primary/60 transition-all duration-700">
          <div className="w-8 h-px bg-current opacity-20 group-hover:w-12 transition-all duration-700" />
          <span>Explore</span>
        </div>
      </div>
    </motion.div>
  );
};
