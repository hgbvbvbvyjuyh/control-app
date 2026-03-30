import { useEffect, useState } from 'react';
import { AntiGravity } from '../components/AntiGravity';
import { useGoalStore } from '../stores/goalStore';
import { useFrameworkStore } from '../stores/frameworkStore';
import { useSessionStore } from '../stores/sessionStore';
import { useJournalStore } from '../stores/journalStore';
import { useNavigate } from 'react-router-dom';
import { type Goal } from '../db';
import { motion, AnimatePresence } from 'framer-motion';
import { FrameworkModal } from '../components/FrameworkModal';
import { GoalModal } from '../components/GoalModal';
import { useConfirmStore } from '../stores/confirmStore';
import { ChevronLeft, Calendar, Layout, Target, PieChart } from 'lucide-react';

import { calculateGoalProgress } from '../utils/aggregation';


// ---- Goal Journal sub-component ----
const GoalJournal = ({ goalId, goalType, goalCategory }: { goalId: string, goalType: string, goalCategory: string }) => {
  const { entries, load, add, remove } = useJournalStore();
  const { confirm } = useConfirmStore();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({
    completed: '',
    mistakes: '',
    improvement: ''
  });

  useEffect(() => { load(); }, []);

  const goalEntries = entries.filter(e => e.goalId === goalId);

  const handleAdd = async () => {
    if (!answers.completed.trim() && !answers.mistakes.trim() && !answers.improvement.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    await add(goalType as any, today, { 
      goals: answers.completed.trim(),
      problems: answers.mistakes.trim(),
      ideas: answers.improvement.trim()
    }, goalId, goalCategory as any);
    setAnswers({ completed: '', mistakes: '', improvement: '' });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">Goal Journal</h3>
        <button onClick={() => setOpen(v => !v)} className="text-xs text-accent hover:underline">
          {open ? 'Cancel' : '+ Entry'}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="mb-4 flex flex-col gap-4 p-4 bg-surface/30 backdrop-blur-xl rounded-[24px] border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase mb-1.5 block tracking-widest">Did I complete my goals?</label>
            <textarea
              rows={2}
              value={answers.completed}
              onChange={e => setAnswers(prev => ({ ...prev, completed: e.target.value }))}
              className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all resize-none shadow-inner"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase mb-1.5 block tracking-widest">What mistakes did I make?</label>
            <textarea
              rows={2}
              value={answers.mistakes}
              onChange={e => setAnswers(prev => ({ ...prev, mistakes: e.target.value }))}
              className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all resize-none shadow-inner"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase mb-1.5 block tracking-widest">How can I improve next time?</label>
            <textarea
              rows={2}
              value={answers.improvement}
              onChange={e => setAnswers(prev => ({ ...prev, improvement: e.target.value }))}
              className="w-full bg-background/50 border border-white/10 rounded-2xl p-3 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 focus:bg-surface/80 transition-all resize-none shadow-inner"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={handleAdd} 
            className="mt-2 bg-accent text-background text-xs font-bold px-5 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all w-fit"
          >
            Save Entry
          </motion.button>
        </motion.div>
      )}

      <div className="flex flex-col gap-2">
        {goalEntries.length === 0 && !open && (
          <p className="text-secondary/50 text-xs text-center py-2">No journal entries for this goal yet.</p>
        )}
        {goalEntries.map((e, index) => (
          <motion.div 
            key={e.id} 
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface/40 backdrop-blur-2xl rounded-2xl border border-white/5 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)] group relative"
          >
            <span className="text-[10px] text-secondary/70 font-semibold block mb-3">{e.date}</span>
            <div className="space-y-3">
              {e.content.goals && (
                <div>
                  <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">Goals</p>
                  <p className="text-sm text-text/80">{e.content.goals}</p>
                </div>
              )}
              {e.content.problems && (
                <div>
                  <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">Mistakes</p>
                  <p className="text-sm text-text/80">{e.content.problems}</p>
                </div>
              )}
              {e.content.ideas && (
                <div>
                  <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">Improvements</p>
                  <p className="text-sm text-text/80">{e.content.ideas}</p>
                </div>
              )}
              {e.content.reflection && (
                <div>
                  <p className="text-[9px] font-bold text-secondary uppercase leading-none mb-1">Reflection</p>
                  <p className="text-sm text-text/80">{e.content.reflection}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                confirm(
                  'Delete Journal Entry',
                  'Are you sure you want to delete this journal entry?',
                  () => remove(e.id!)
                );
              }}
              className="absolute top-2 right-2 text-error/30 hover:text-error text-xs opacity-0 group-hover:opacity-100 transition-opacity p-2 z-10"
            >✕</button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ---- Goals Page ----
export const Goals = () => {
  const { goals, load: loadGoals, selectedGoalId, select, remove: removeGoal } = useGoalStore();
  const { frameworks, load: loadFrameworks } = useFrameworkStore();
  const { sessions, load: loadSessions, remove: removeSession } = useSessionStore();
  const { confirm } = useConfirmStore();
  const navigate = useNavigate();
  const [showFwModal, setShowFwModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | null>(null);
  const [showFrameworkData, setShowFrameworkData] = useState(false);

  useEffect(() => {
    loadGoals();
    loadFrameworks();
    loadSessions();
  }, []);

  const selectedGoal = goals.find(g => String(g.id) === String(selectedGoalId));
  const selectedFw = selectedGoal ? frameworks.find(f => f.id === selectedGoal.frameworkId) : null;
  const goalSessions = selectedGoal ? sessions.filter(s => s.goalId === selectedGoal.id) : [];

  const handleDelete = async (id: number) => {
    confirm(
      'Delete Goal',
      'Are you sure? This will also soft-delete all associated sessions and journals.',
      async () => {
        try {
          await removeGoal(id as any);
          select(undefined as any);
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const getFrameworkName = (fwId: string) => frameworks.find(f => f.id === fwId)?.name || 'Unknown';

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col md:flex-row gap-6 w-full max-w-7xl mx-auto">
      <AnimatePresence>{showFwModal && <FrameworkModal open onClose={() => setShowFwModal(false)} />}</AnimatePresence>
      <AnimatePresence>{showGoalModal && (
        <GoalModal 
          open 
          onClose={() => { setShowGoalModal(false); setEditingGoal(undefined); }} 
          frameworkId={null} 
          editingGoal={editingGoal}
          initialType={activeCategory || 'daily'}
        />
      )}</AnimatePresence>

      {!activeCategory ? (
        <div className="flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-8">Goals</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((cat) => {
              const icons = { daily: Calendar, weekly: Layout, monthly: Target, yearly: PieChart };
              const Icon = icons[cat];
              const desc = {
                daily: 'Daily tasks and sessions',
                weekly: 'Aggregated daily progress',
                monthly: 'Monthly progress summary',
                yearly: 'The big picture metrics'
              };
              return (
                <div key={cat} onClick={() => setActiveCategory(cat)}>
                  <AntiGravity
                    className="p-8 cursor-pointer border border-white/5 hover:border-accent/40 bg-surface/30 backdrop-blur-xl hover:bg-accent/5 group transition-all rounded-[32px] shadow-lg shadow-black/20"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                        <Icon className="text-accent" size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold capitalize tracking-tight">{cat}</h2>
                        <p className="text-secondary mt-1 text-sm">{desc[cat]}</p>
                      </div>
                    </div>
                  </AntiGravity>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Goal List */}
          <div className="flex-1 h-full flex flex-col gap-3 overflow-y-auto no-scrollbar">
            <div className="shrink-0 flex flex-col gap-4 mb-4">
              <button 
                onClick={() => { setActiveCategory(null); select(undefined as any); }}
                className="flex items-center gap-2 text-secondary hover:text-text transition-colors text-sm font-medium w-fit px-2 py-1 rounded-lg hover:bg-white/5"
              >
                <ChevronLeft size={16} /> Back to Categories
              </button>
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold capitalize tracking-tight">{activeCategory}</h1>
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowFwModal(true)} className="text-xs bg-surface/50 border border-white/10 text-secondary hover:text-white px-4 py-2 rounded-xl transition-colors shadow-sm hover:bg-surface/80">
                    + Framework
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowGoalModal(true)} className="bg-accent text-background px-5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] text-sm font-bold">
                    + Goal
                  </motion.button>
                </div>
              </div>
            </div>

            {goals.filter(g => g.goalType === activeCategory).length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 items-center justify-center h-full">
                <p className="text-secondary text-sm text-center">No {activeCategory} goals yet. Add one to get started.</p>
              </motion.div>
            )}

            {goals.filter(g => g.goalType === activeCategory).map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => select(goal.id!)}
              >
                <AntiGravity
                  className={`p-4 cursor-pointer border rounded-[20px] transition-all duration-300 ${
                    String(selectedGoalId) === String(goal.id) 
                      ? 'border-primary/50 bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_20px_rgba(59,130,246,0.15)] scale-[1.02]' 
                      : 'border-white/5 bg-surface/30 backdrop-blur-md hover:border-white/20 hover:bg-surface/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-widest text-primary/80 font-bold leading-none">{getFrameworkName(goal.frameworkId)}</span>
                        </div>
                        <h3 className="font-semibold text-lg mt-0.5 flex items-center gap-2 text-white">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded leading-none ${
                            (goal.category || 'health') === 'spirituality' ? 'bg-blue-500/20 text-blue-400' :
                            (goal.category || 'health') === 'finance' ? 'bg-yellow-500/20 text-yellow-500' :
                            (goal.category || 'health') === 'relation' ? 'bg-pink-500/20 text-pink-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {goal.category || 'health'}
                          </span>
                          {Object.values(goal.data)[0] || 'Untitled'}
                        </h3>
                      </div>
                      <button
                        onClick={e => { 
                          e.stopPropagation(); 
                          handleDelete(goal.id as any);
                        }}
                        className="text-error/30 hover:text-error text-sm p-3 transition-colors relative z-20"
                      >✕</button>
                    </div>
                    <p className="text-sm text-secondary truncate mt-1">
                      {Object.values(goal.data).slice(1).join(' · ') || '—'}
                    </p>
                  </div>
                </AntiGravity>
              </motion.div>
            ))}
          </div>

          <div className="hidden md:flex flex-1 h-full flex-col bg-surface/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl shadow-black/50 overflow-y-auto no-scrollbar relative overflow-hidden">
            {!selectedGoal ? (
              <div className="flex-1 flex items-center justify-center text-secondary/50 text-lg h-full">Select a goal to view details</div>
            ) : (
              <div className="flex flex-col gap-0 h-full relative z-10">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-white/10 p-6 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">{selectedGoal.goalType || 'daily'}</span>
                        <span className="text-[10px] text-secondary font-medium tracking-wide">{selectedFw?.name}</span>
                      </div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <span className={`text-[12px] uppercase font-bold px-2 py-0.5 rounded leading-none ${
                            (selectedGoal.category || 'health') === 'spirituality' ? 'bg-blue-500/20 text-blue-400' :
                            (selectedGoal.category || 'health') === 'finance' ? 'bg-yellow-500/20 text-yellow-500' :
                            (selectedGoal.category || 'health') === 'relation' ? 'bg-pink-500/20 text-pink-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {selectedGoal.category || 'health'}
                        </span>
                        {Object.values(selectedGoal.data)[0] || 'Untitled'}
                      </h2>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setEditingGoal(selectedGoal); setShowGoalModal(true); }}
                        className="bg-surface/50 text-secondary hover:text-white border border-white/10 px-4 py-2 rounded-xl transition-colors text-sm font-semibold"
                      >
                        Edit
                      </motion.button>
                      {selectedGoal.goalType === 'daily' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/session?goalId=${selectedGoal.id}`)}
                          className="bg-accent text-background font-bold py-2 px-5 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow text-sm"
                        >
                          + Session
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6">

              {/* Progress Cards — Daily / Weekly / Monthly / Yearly */}
              <div>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">Progress</h3>
                <p className="text-[10px] text-secondary/60 mb-3 leading-snug">
                  <strong className="text-secondary/80">Weekly · Monthly · Yearly</strong> show{' '}
                  <strong>overall portfolio</strong> progress (identical on every goal). Current calendar week uses a{' '}
                  <strong>7-day average</strong> (days without completed sessions count as 0%). Metrics follow your device time zone.
                </p>
                <div className="flex justify-center items-center py-4">
                  {(() => {
                    const results = calculateGoalProgress(selectedGoal, goals, sessions);
                    return ([selectedGoal.goalType || 'daily'] as const).map((period) => {
                      const { pct, count, hasData } = results[period];
                      const colorClass = !hasData
                        ? 'text-secondary/40'
                        : pct >= 75
                          ? 'text-success'
                          : pct >= 40
                            ? 'text-accent'
                            : 'text-secondary';
                            
                      const detail =
                        period === 'daily' && hasData
                          ? `${Math.round((pct / 100) * count)}/${count} achieved`
                          : !hasData
                            ? 'No data'
                            : period === 'daily'
                              ? 'Portfolio today'
                              : period === 'weekly'
                                ? `${count} active day(s) · overall`
                                : period === 'monthly'
                                  ? `${count} active week(s) · overall`
                                  : `${count} active month(s) · overall`;
                      
                      const radius = 60;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - ((hasData ? pct : 0) / 100) * circumference;

                      return (
                        <div key={period} className="flex flex-col items-center">
                          <div className="relative flex items-center justify-center mb-4">
                            <svg width="160" height="160" className="-rotate-90 transform">
                              <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                className="stroke-secondary/20"
                                strokeWidth="12"
                                fill="none"
                              />
                              <motion.circle
                                cx="80"
                                cy="80"
                                r={radius}
                                className={`stroke-current ${colorClass}`}
                                strokeWidth="12"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-[2px]">
                              <span className="text-[10px] uppercase tracking-wider text-secondary leading-none mb-1">{period}</span>
                              <span className={`text-3xl font-black tracking-tight leading-none ${colorClass}`}>
                                {hasData ? `${pct}%` : '—'}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-secondary/70 bg-background/50 px-3 py-1.5 rounded-full border border-secondary/20">{detail}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Framework Data */}
              <div className="bg-background/50 rounded-xl border border-secondary/20 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-0">Framework Data</h4>
                  <button 
                    onClick={() => setShowFrameworkData(!showFrameworkData)}
                    className="text-[10px] text-secondary hover:text-text transition-colors bg-secondary/10 px-2 py-1 rounded"
                  >
                    {showFrameworkData ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                {showFrameworkData && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedFw?.keys.map(k => (
                      <div key={k.key}>
                        <span className="text-secondary block text-xs mb-0.5">{k.label}</span>
                        <span className="font-medium">{selectedGoal.data[k.key] || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Session History */}
              {selectedGoal.goalType === 'daily' && (
              <div>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Session History</h3>
                {goalSessions.length === 0 && (
                  <p className="text-secondary text-sm text-center py-4">No sessions yet. Click "+ Session" to start.</p>
                )}
                <div className="flex flex-col gap-2">
                  {goalSessions.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-background/50 rounded-xl border border-secondary/20 p-3"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-text">
                            {s.status === 'completed' 
                              ? (s.didAchieveGoal ? '🎯 Goal Achieved' : '⭕ Goal Not Achieved')
                              : s.status === 'skipped' ? '↷ Session Skipped' : '⚡ Active Session'}
                          </span>
                          <span className="text-[10px] text-secondary/60">{new Date(s.startTime).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              confirm(
                                'Delete Session',
                                'Move this session history record to the trash?',
                                () => removeSession(s.id!)
                              );
                            }} 
                            className="text-error/30 hover:text-error text-xs p-3 transition-colors relative z-10"
                          >✕</button>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            s.status === 'completed' ? (s.didAchieveGoal ? 'bg-success/10 text-success' : 'bg-error/10 text-error') :
                            s.status === 'skipped' ? 'bg-secondary/10 text-secondary' :
                            s.status === 'active' ? 'bg-accent/10 text-accent' :
                            'bg-secondary/10 text-secondary'
                          }`}>{s.status}</span>
                        </div>
                      </div>
                      {(s.mistake || s.improvementSuggestion || s.skipReason) && (
                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs">
                          {s.mistake && <span><span className="text-error/70 font-semibold">Mistake: </span>{s.mistake}</span>}
                          {s.improvementSuggestion && <span><span className="text-accent/70 font-semibold">Improvement: </span>{s.improvementSuggestion}</span>}
                          {s.skipReason && <span><span className="text-secondary font-semibold">Skip Reason: </span>{s.skipReason}</span>}
                        </div>
                      )}
                      {s.endTime && (
                        <div className="flex gap-4 mt-2 text-[10px] text-secondary/50">
                          <span>Duration {Math.round((s.endTime - s.startTime) / 60000)}min</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
              )}

              {/* Goal Journaling */}
              <GoalJournal 
                goalId={selectedGoal.id!} 
                goalType={selectedGoal.goalType} 
                goalCategory={selectedGoal.category || 'health'} 
              />

            </div>
          </div>
        )}
      </div>
    </>
  )}
</div>
);
};
