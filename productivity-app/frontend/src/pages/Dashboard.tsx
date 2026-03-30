import { DashboardCard } from '../components/DashboardCard';
import { PerformanceChart } from '../components/PerformanceChart';
import { QuoteCard } from '../components/QuoteCard';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

export const Dashboard = () => {
  const quotes = [
    { quote: "Discipline is choosing between what you want now and what you want most." },
    { quote: "Small progress is still progress." }
  ];

  const stats = [
    {
      title: 'Daily',
      subtitle: 'Overview of your work',
      value: '70%',
      gradientFrom: 'from-blue-600',
      gradientTo: 'to-blue-400',
      chartData: [20, 15, 25, 10, 30, 40, 20, 25, 45, 50, 40, 60, 70, 75, 45, 65, 80, 90, 85]
    },
    {
      title: 'Weekly',
      subtitle: 'This week',
      value: '48%',
      gradientFrom: 'from-purple-600',
      gradientTo: 'to-purple-400',
      chartData: [10, 15, 12, 14, 18, 16, 20, 25, 22, 28, 30, 40, 35, 45, 60, 50, 70, 65, 80]
    },
    {
      title: 'Monthly',
      subtitle: 'This month',
      value: '62%',
      gradientFrom: 'from-cyan-500',
      gradientTo: 'to-cyan-300',
      chartData: [30, 40, 35, 45, 50, 40, 30, 45, 55, 60, 30, 45, 50, 65, 80, 70, 90, 85, 95]
    },
    {
      title: 'Yearly',
      subtitle: 'This year',
      value: '35%',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-400',
      chartData: [15, 12, 18, 15, 20, 18, 25, 20, 22, 28, 25, 30, 35, 40, 45, 60, 55, 70, 65]
    }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pb-20 pt-4">
      {/* Top Quotes Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quotes.map((item, index) => (
          <QuoteCard key={index} quote={item.quote} delay={index * 0.1} />
        ))}
      </div>

      {/* Dashboard Section Title */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-1 mt-4"
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="text-white w-7 h-7" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        </div>
        <p className="text-secondary/60 text-sm font-medium ml-10">
          Overview of your work
        </p>
      </motion.div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <DashboardCard
            key={stat.title}
            {...stat}
            delay={0.3 + (index * 0.1)}
          />
        ))}
      </div>

      {/* Area Chart Row */}
      <div className="mt-2">
        <PerformanceChart />
      </div>
    </div>
  );
};
