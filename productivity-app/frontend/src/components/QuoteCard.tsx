import { motion } from 'framer-motion';

interface QuoteCardProps {
  quote: string;
  delay?: number;
}

export const QuoteCard = ({ quote, delay = 0 }: QuoteCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/5 flex items-start gap-3 h-full"
    >
      <div className="text-yellow-400 font-serif text-2xl font-bold leading-none mt-0.5">
        &#8220;
      </div>
      <p className="text-slate-300 text-xs font-medium leading-relaxed tracking-wide">
        {quote}
      </p>
    </motion.div>
  );
};
