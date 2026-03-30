import { motion } from 'framer-motion';
import { Calendar, Layout as LayoutIcon, Target, PieChart } from 'lucide-react';
import { DashboardCard } from '../components/DashboardCard';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Daily',
      description: 'Focus on today\'s immediate goals and habits.',
      icon: Calendar,
      gradient: 'from-blue-500 to-cyan-400',
      path: '/goals' // In a real app, this might filter or go to a specific view
    },
    {
      title: 'Weekly',
      description: 'Review progress and set objectives for the week.',
      icon: LayoutIcon,
      gradient: 'from-purple-500 to-pink-400',
      path: '/goals'
    },
    {
      title: 'Monthly',
      description: 'Strategic planning and long-term momentum.',
      icon: Target,
      gradient: 'from-emerald-500 to-teal-400',
      path: '/goals'
    },
    {
      title: 'Yearly',
      description: 'The big picture. Vision and major milestones.',
      icon: PieChart,
      gradient: 'from-orange-500 to-yellow-400',
      path: '/goals'
    }
  ];

  return (
    <div className="flex flex-col gap-16 max-w-6xl mx-auto w-full">
      {/* Premium Header Section */}
      <header className="space-y-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start gap-1"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">System Ready</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-white sm:text-6xl lg:text-7xl leading-none">
            Dashboard
          </h2>
          <p className="text-secondary/50 text-base sm:text-lg mt-4 font-medium max-w-xl leading-relaxed">
            Welcome back, architect. Your productivity framework is synchronized and ready for the next objective.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent origin-left"
        />
      </header>

      {/* Grid Section: Perfected Spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        {cards.map((card, index) => (
          <DashboardCard
            key={card.title}
            {...card}
            delay={0.15 * index}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>

      {/* Floating Meta Quote */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="mt-8 pt-12 border-t border-white/[0.03]"
      >
        <div className="flex flex-col items-center gap-4">
          <p className="text-[9px] uppercase tracking-[0.5em] font-black text-secondary/20 hover:text-secondary/40 transition-colors cursor-default">
            Precision in every action · Control in every outcome
          </p>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-white/5" />
            ))}
          </div>
        </div>
      </motion.footer>
    </div>
  );
};
