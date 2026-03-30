import { useEffect, useMemo } from 'react';
import { useGoalStore } from '../stores/goalStore';
import { useSessionStore } from '../stores/sessionStore';
import { useJournalStore } from '../stores/journalStore';
import { useFailureStore } from '../stores/failureStore';
import { motion, type Variants } from 'framer-motion';
import { dashboardPeriodStats, buildDashboardHistories } from '../utils/aggregation';
import { getBrowserIanaTimeZone } from '../utils/browserTimezone';
import { BarChart3, Quote } from 'lucide-react';

const QuoteCard = ({ text }: { text: string }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-[#121620] border border-white/[0.04] rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-black/20"
  >
    <Quote className="w-6 h-6 text-yellow-500 fill-yellow-500 shrink-0 mt-0.5 opacity-90" />
    <p className="text-gray-300 text-sm leading-relaxed font-medium">{text}</p>
  </motion.div>
);

const StatCard = ({
  title,
  subtitle,
  value,
  subValue,
  chartColors,
  bars,
}: {
  title: string;
  subtitle: string;
  value: string;
  subValue: string;
  chartColors: string;
  bars: number[];
}) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-[#121620] border border-white/[0.04] rounded-2xl p-5 flex flex-col justify-between h-[170px] relative overflow-hidden group shadow-lg shadow-black/20"
  >
    <div className="z-10 relative">
      <h3 className="text-gray-100 font-semibold text-[15px]">{title}</h3>
      <p className="text-gray-500 text-[11px] mb-3 mt-0.5">{subtitle}</p>
      <div className="text-[32px] font-bold text-white leading-none tracking-tight mb-1.5">
        {value}
      </div>
      <p className="text-gray-500 text-[11px] font-medium">{subValue}</p>
    </div>

    {/* Mini Bar Chart Mock */}
    <div className="absolute bottom-4 left-5 right-5 h-12 flex items-end gap-[3px] z-0">
      {bars.map((height, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm opacity-90 transition-all duration-300 group-hover:opacity-100 ${chartColors}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  </motion.div>
);

export const Dashboard = () => {
  const { goals, load: loadGoals } = useGoalStore();
  const { sessions, load: loadSessions } = useSessionStore();
  const { entries, load: loadJournals } = useJournalStore();
  const { failures, load: loadFailures } = useFailureStore();

  useEffect(() => {
    loadGoals();
    loadSessions();
    loadJournals();
    loadFailures();
  }, []);

  const periodData = useMemo(() => {
    const dayMs = 86400000;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const zone = getBrowserIanaTimeZone();
    const stats = dashboardPeriodStats(goals, sessions, zone);
    const { dailyHistory, weeklyHistory, monthlyHistory, yearlyHistory } =
      buildDashboardHistories(goals, sessions, today, dayMs, zone);

    const periodConfigs = [
      {
        title: 'Daily',
        subtitle: 'আজকের অগ্রগতি',
        chartColors: 'bg-gradient-to-t from-blue-700 to-blue-400',
        type: 'daily' as const,
        history: dailyHistory,
      },
      {
        title: 'Weekly',
        subtitle: 'এই সপ্তাহ',
        chartColors: 'bg-gradient-to-t from-purple-700 to-indigo-400',
        type: 'weekly' as const,
        history: weeklyHistory,
      },
      {
        title: 'Monthly',
        subtitle: 'এই মাস',
        chartColors: 'bg-gradient-to-t from-cyan-600 to-cyan-300',
        type: 'monthly' as const,
        history: monthlyHistory,
      },
      {
        title: 'Yearly',
        subtitle: 'এই বছর',
        chartColors: 'bg-gradient-to-t from-emerald-600 to-green-400',
        type: 'yearly' as const,
        history: yearlyHistory,
      },
    ];

    return periodConfigs.map((config) => {
      const { pct, hasData } = stats[config.type];
      
      let count = 0;
      let total = 0;
      let unit = '';
      
      if (config.type === 'daily') {
        count = sessions.filter(s => new Date(s.startTime).toDateString() === today.toDateString()).length;
        total = goals.length;
        unit = 'সম্পন্ন';
      } else if (config.type === 'weekly') {
        count = sessions.length;
        total = 7;
        unit = 'সম্পন্ন';
      } else if (config.type === 'monthly') {
        count = entries.length;
        total = 31;
        unit = 'সম্পন্ন';
      } else {
        count = failures.length;
        total = 365;
        unit = 'সম্পন্ন';
      }

      // Convert history to heights (0-100)
      const bars = config.history.map(h => h.value);

      return {
        ...config,
        value: hasData ? `${pct}%` : '—',
        subValue: `${count} / ${total} ${unit}`,
        bars,
      };
    });
  }, [goals, sessions, entries, failures]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-screen w-full bg-[#080B11] p-8 gap-8 overflow-hidden font-sans text-slate-100"
    >
      {/* Top Quotes Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6 shrink-0">
        <QuoteCard text="Discipline is choosing between what you want now and what you want most." />
        <QuoteCard text="Small progress is still progress." />
      </motion.div>

      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard</h1>
        </div>
        <p className="text-gray-500 text-sm font-medium">আপনার কাজের একনজরে</p>
      </motion.div>

      {/* Stats Cards Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-6 shrink-0">
        {periodData.map((p) => (
          <StatCard
            key={p.title}
            title={p.title}
            subtitle={p.subtitle}
            value={p.value}
            subValue={p.subValue}
            chartColors={p.chartColors}
            bars={p.bars}
          />
        ))}
      </motion.div>

      {/* Main Activity Chart Section */}
      <motion.div 
        variants={itemVariants}
        className="bg-[#121620] border border-white/[0.04] rounded-2xl flex-1 flex flex-col relative min-h-0 shadow-lg shadow-black/20"
      >
        {/* Y-Axis & Grid Lines */}
        <div className="absolute inset-0 p-6 pt-10 pb-12 flex flex-col justify-between z-0 pointer-events-none">
          {[100, 75, 50, 25, 0].map((val) => (
            <div key={val} className="border-b border-white/[0.03] w-full flex items-center relative">
              <span className="absolute left-6 text-gray-500 text-[11px] -translate-y-1/2 bg-[#121620] pr-3 font-medium">
                {val}%
              </span>
            </div>
          ))}
        </div>

        {/* SVG Curve Chart */}
        <div className="flex-1 w-full relative z-10 mt-6 pl-[60px] pr-[40px] mb-[40px]">
          <svg viewBox="0 0 1000 300" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            {/* Filled Area */}
            <path
              d="M 50 270 C 200 270 200 230 350 230 C 500 230 500 120 650 120 C 800 120 800 50 950 50 L 950 300 L 50 300 Z"
              fill="url(#areaFill)"
            />
            
            {/* Stroke Line */}
            <path
              d="M 50 270 C 200 270 200 230 350 230 C 500 230 500 120 650 120 C 800 120 800 50 950 50"
              fill="none"
              stroke="url(#lineGlow)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            
            {/* Data Points */}
            <circle cx="350" cy="230" r="5" fill="#6366f1" className="shadow-lg" />
            <circle cx="650" cy="120" r="5" fill="#8b5cf6" className="shadow-lg" />
            <circle cx="950" cy="50" r="5" fill="#a855f7" className="shadow-lg" />
          </svg>
        </div>

        {/* X-Axis Labels */}
        <div className="absolute bottom-4 left-[90px] right-[40px] flex justify-between text-gray-500 text-[12px] font-medium z-10">
          <span>Day</span>
          <span className="-ml-6">Week</span>
          <span className="-ml-6">Month</span>
          <span>Year</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
