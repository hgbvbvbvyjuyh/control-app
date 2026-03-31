import { DashboardCard } from '../components/DashboardCard';
import { PerformanceChart } from '../components/PerformanceChart';
import { QuoteCard } from '../components/QuoteCard';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useGoalStore } from '../stores/goalStore';
import { calculateDashboardStats } from '../utils/goalStatusDashboard';
import { useEffect } from 'react';

export const Dashboard = () => {
  const quotes = [
    { quote: "Discipline is choosing between what you want now and what you want most." },
    { quote: "Small progress is still progress." }
  ];

  const { goals, load } = useGoalStore();

  useEffect(() => {
    load();
  }, []);

  const dashboardStats = calculateDashboardStats(goals);

  const stats = [
    {
      title: 'Daily',
      subtitle: 'Today',
      value: `${dashboardStats.daily.pct}%`,
      progressText: dashboardStats.daily.progressText,
      gradientFrom: 'from-blue-600',
      gradientTo: 'to-blue-400',
      chartData: dashboardStats.chartData
    },
    {
      title: 'Weekly',
      subtitle: 'Last 7 days',
      value: `${dashboardStats.weekly.pct}%`,
      progressText: dashboardStats.weekly.progressText,
      gradientFrom: 'from-purple-600',
      gradientTo: 'to-purple-400',
      chartData: dashboardStats.chartData
    },
    {
      title: 'Monthly',
      subtitle: 'Last 30 days',
      value: `${dashboardStats.monthly.pct}%`,
      progressText: dashboardStats.monthly.progressText,
      gradientFrom: 'from-cyan-500',
      gradientTo: 'to-cyan-300',
      chartData: dashboardStats.chartData
    },
    {
      title: 'Yearly',
      subtitle: 'Last 365 days',
      value: `${dashboardStats.yearly.pct}%`,
      progressText: dashboardStats.yearly.progressText,
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-400',
      chartData: dashboardStats.chartData
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full h-full flex-1 min-h-0">
      {/* Top Quotes Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        {quotes.map((item, index) => (
          <QuoteCard key={index} quote={item.quote} delay={index * 0.1} />
        ))}
      </div>

      {/* Dashboard Section Title */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-start gap-2 shrink-0"
      >
        <BarChart3 className="text-white w-6 h-6 mt-0.5 shrink-0" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white leading-none">Dashboard</h1>
          <p className="text-secondary/60 text-xs font-medium mt-1">
            Overview of your work
          </p>
        </div>
      </motion.div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {stats.map((stat, index) => (
          <DashboardCard
            key={stat.title}
            {...stat}
            delay={0.3 + (index * 0.1)}
          />
        ))}
      </div>

      {/* Area Chart Row */}
      <div className="flex-1 min-h-0 mt-2 w-full flex flex-col">
        <PerformanceChart />
      </div>
    </div>
  );
};
