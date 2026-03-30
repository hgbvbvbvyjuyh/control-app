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
      className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/5 flex items-start gap-4 h-full"
    >
      <div className="text-yellow-400 font-serif text-3xl font-bold leading-none mt-1">
        &#8220;
      </div>
      <p className="text-secondary/70 text-sm font-medium leading-relaxed tracking-wide">
        {quote}
      </p>
    </motion.div>
  );
};
