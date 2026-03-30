import { motion, type Variants } from 'framer-motion';

export const Dashboard = () => {
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
      className="flex flex-col min-h-screen w-full bg-[#080B11] p-4 sm:p-8 gap-6 sm:gap-8 overflow-y-auto font-sans text-slate-100"
    >
      <motion.div 
        variants={itemVariants} 
        className="flex-1 flex items-center justify-center"
      >
        <p className="text-2xl font-medium text-gray-400 tracking-wide">
          Dashboard Coming Soon
        </p>
      </motion.div>
    </motion.div>
  );
};
