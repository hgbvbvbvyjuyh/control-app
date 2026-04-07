import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logClientError } from '../utils/logClientError';

// ─── Types ───────────────────────────────────────────────────────────────────

export type JournalType = 'session' | 'goal';
export type CompletionIntent = 'completed' | 'not_completed';

export interface GoalJournalAnswers {
  type: 'goal';
  completed: string;      // Did I complete my goals?
  mistakes: string;       // What mistakes did I make?
  improvement: string;    // How can I improve next time?
}

export interface SessionJournalAnswers {
  type: 'session';
  didAchieveGoal: boolean | null;
  mistake: string;
  improvementSuggestion: string;
}

export type JournalAnswers = GoalJournalAnswers | SessionJournalAnswers;

interface JournalModalProps {
  open: boolean;
  onClose: () => void;
  journalType: JournalType;
  /** Only relevant for 'goal' type — determines status after submit */
  intent?: CompletionIntent;
  onSubmit: (answers: JournalAnswers) => Promise<void> | void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const JournalModal = ({
  open,
  onClose,
  journalType,
  intent,
  onSubmit,
}: JournalModalProps) => {
  // ── Session state ──
  const [didAchieveGoal, setDidAchieveGoal] = useState<boolean | null>(null);
  const [mistake, setMistake] = useState('');
  const [improvementSuggestion, setImprovementSuggestion] = useState('');

  // ── Goal state ──
  const [completed, setCompleted] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [improvement, setImprovement] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Derived ──
  const isGoal = journalType === 'goal';
  const title = isGoal ? 'Goal Journal' : 'Session Journaling';

  const isValid = isGoal
    ? completed.trim() !== '' && mistakes.trim() !== '' && improvement.trim() !== ''
    : didAchieveGoal !== null;

  const reset = useCallback(() => {
    setDidAchieveGoal(null);
    setMistake('');
    setImprovementSuggestion('');
    setCompleted('');
    setMistakes('');
    setImprovement('');
    setSubmitting(false);
    setSubmitError('');
  }, []);

  /** Full reset whenever the shell closes (Cancel, success, or parent `open={false}`) so no stale fields reappear. */
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    const answers: JournalAnswers = isGoal
      ? { type: 'goal', completed, mistakes, improvement }
      : { type: 'session', didAchieveGoal, mistake, improvementSuggestion };

    setSubmitError('');
    try {
      await onSubmit(answers);
      reset();
    } catch (err) {
      logClientError('JournalModal.submit', err);
      setSubmitError(err instanceof Error ? err.message : 'Could not save. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={e => {
            if (e.target !== e.currentTarget) return;
            if (!isGoal) handleClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
            className="bg-surface/50 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-2xl shadow-black/80 relative overflow-hidden outline-none"
          >
            {/* Top accent bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-60 ${
                isGoal
                  ? intent === 'completed'
                    ? 'from-emerald-600 to-green-400'
                    : 'from-rose-600 to-red-400'
                  : 'from-blue-600 to-cyan-400'
              }`}
            />

            {/* Header */}
            <div className="mb-8 text-center">
              <h2 className="text-xl font-bold text-accent tracking-tight">{title}</h2>
              {isGoal && intent && (
                <p className="text-xs text-secondary/60 mt-1 font-medium uppercase tracking-wider">
                  {intent === 'completed' ? '✓ Marking as completed' : '✕ Marking as not completed'}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-5">
              {/* ── GOAL questions ── */}
              {isGoal && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase mb-1.5 block tracking-widest">
                      Did I complete my goals?
                    </label>
                    <textarea
                      rows={2}
                      value={completed}
                      onChange={e => setCompleted(e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all resize-none shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase mb-1.5 block tracking-widest">
                      What mistakes did I make?
                    </label>
                    <textarea
                      rows={2}
                      value={mistakes}
                      onChange={e => setMistakes(e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all resize-none shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase mb-1.5 block tracking-widest">
                      How can I improve next time?
                    </label>
                    <textarea
                      rows={2}
                      value={improvement}
                      onChange={e => setImprovement(e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all resize-none shadow-inner"
                    />
                  </div>
                </>
              )}

              {/* ── SESSION questions ── */}
              {!isGoal && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-secondary block mb-3">
                      Did you achieve your goal? *
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDidAchieveGoal(true)}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                          didAchieveGoal === true
                            ? 'bg-success text-background shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                            : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDidAchieveGoal(false)}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                          didAchieveGoal === false
                            ? 'bg-error text-background shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                            : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-secondary block mb-1">
                      Mistake <span className="opacity-50 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="What went wrong?"
                      value={mistake}
                      onChange={e => setMistake(e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-secondary block mb-1">
                      Improvement Suggestion <span className="opacity-50 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="How can you do better next time?"
                      value={improvementSuggestion}
                      onChange={e => setImprovementSuggestion(e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all shadow-inner"
                    />
                  </div>
                </>
              )}

              {submitError && (
                <p className="text-error text-sm bg-error/10 border border-error/20 rounded-xl px-3 py-2" role="alert">
                  {submitError}
                </p>
              )}

              {/* Submit */}
              <motion.button
                whileHover={{ scale: isValid && !submitting ? 1.02 : 1 }}
                whileTap={{ scale: isValid && !submitting ? 0.98 : 1 }}
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className="w-full bg-accent text-background font-bold py-4 mt-2 rounded-2xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest text-sm"
              >
                {submitting ? 'Saving…' : isGoal ? 'Save Journal' : 'Complete Session'}
              </motion.button>

              <button
                onClick={handleClose}
                className="w-full text-secondary/50 hover:text-secondary text-xs font-bold transition-all duration-300 uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
