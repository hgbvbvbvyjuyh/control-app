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
const GoalJournal = ({ goalId }: { goalId: string }) => {
  const { entries, load, add, remove } = useJournalStore();
  const { confirm } = useConfirmStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => { load(); }, []);

  const goalEntries = entries.filter(e => e.goalId === goalId);

  const handleAdd = async () => {
    if (!text.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    await add('daily', today, { reflection: text.trim() }, goalId);
    setText('');
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
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-3">
          <textarea
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What are you reflecting on for this goal?"
            className="w-full bg-background border border-secondary/30 rounded-xl p-3 text-sm text-text focus:outline-none focus:border-accent resize-none"
          />
          <button onClick={handleAdd} className="mt-2 bg-accent text-background text-xs font-bold px-4 py-2 rounded-lg hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-shadow">
            Save Entry
          </button>
        </motion.div>
      )}

      <div className="flex flex-col gap-2">
        {goalEntries.length === 0 && !open && (
          <p className="text-secondary/50 text-xs text-center py-2">No journal entries for this goal yet.</p>
        )}
        {goalEntries.map(e => (
          <div key={e.id} className="bg-background/50 rounded-xl border border-secondary/20 p-3 group relative">
            <span className="text-[10px] text-secondary/50 block mb-1">{e.date}</span>
            <p className="text-sm">{e.content.reflection || ''}</p>
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
          </div>
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
    <div className="flex flex-col md:flex-row gap-6 h-full max-w-7xl mx-auto">
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
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-8">Goals</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((cat) => {
              const icons = { daily: Calendar, weekly: Layout, monthly: Target, yearly: PieChart };
              const Icon = icons[cat];
              const desc = {
                daily: 'Daily tasks and sessions',
                weekly: 'Aggregated daily progress',
                monthly: 'Weekly progress summary',
                yearly: 'The big picture metrics'
              };
              return (
                <div key={cat} onClick={() => setActiveCategory(cat)}>
                  <AntiGravity
                    className="p-8 cursor-pointer border border-transparent hover:border-accent/40 bg-secondary/5 hover:bg-accent/5 group transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="text-accent" size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold capitalize">{cat}</h2>
                        <p className="text-secondary mt-1">{desc[cat]}</p>
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
          <div className="w-full md:w-1/3 flex flex-col gap-3 overflow-y-auto no-scrollbar pb-6">
            <div className="shrink-0 flex flex-col gap-4 mb-4">
              <button 
                onClick={() => { setActiveCategory(null); select(undefined as any); }}
                className="flex items-center gap-2 text-secondary hover:text-text transition-colors text-sm font-medium w-fit"
              >
                <ChevronLeft size={16} /> Back to Categories
              </button>
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold capitalize">{activeCategory}</h1>
                <div className="flex gap-2">
                  <button onClick={() => setShowFwModal(true)} className="text-xs bg-secondary/20 text-secondary hover:text-text px-3 py-2 rounded-lg transition-colors">
                    + Framework
                  </button>
                  <button onClick={() => setShowGoalModal(true)} className="bg-accent hover:bg-accent/80 text-background px-3 py-2 rounded-lg transition-colors shadow-lg shadow-accent/20 text-sm font-bold">
                    + Goal
                  </button>
                </div>
              </div>
            </div>

            {goals.filter(g => g.goalType === activeCategory).length === 0 && (
              <p className="text-secondary text-sm text-center mt-10">No {activeCategory} goals yet. Add one to get started.</p>
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
                  className={`p-4 cursor-pointer border transition-colors ${
                    String(selectedGoalId) === String(goal.id) ? 'border-accent/60 bg-accent/5' : 'border-transparent hover:border-secondary/40'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-accent/70 font-semibold">{getFrameworkName(goal.frameworkId)}</span>
                        <h3 className="font-semibold text-lg mt-0.5">{Object.values(goal.data)[0] || 'Untitled'}</h3>
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

          {/* Goal Detail Panel */}
          <div className="hidden md:flex flex-col flex-1 bg-secondary/5 rounded-2xl border border-secondary/20 overflow-y-auto no-scrollbar relative">
            {!selectedGoal ? (
              <div className="flex-1 flex items-center justify-center text-secondary/50 text-lg h-full">Select a goal to view details</div>
            ) : (
              <div className="flex flex-col gap-0 h-full">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-secondary/20 p-6 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-accent font-bold bg-accent/10 px-2 py-0.5 rounded">{selectedGoal.goalType || 'daily'}</span>
                        <span className="text-[10px] text-secondary">{selectedFw?.name}</span>
                      </div>
                      <h2 className="text-2xl font-bold">{Object.values(selectedGoal.data)[0] || 'Untitled'}</h2>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingGoal(selectedGoal); setShowGoalModal(true); }}
                        className="bg-secondary/20 text-secondary hover:text-text hover:bg-secondary/30 px-4 py-2 rounded-xl transition-colors text-sm font-semibold"
                      >
                        Edit
                      </button>
                      {selectedGoal.goalType === 'daily' && (
                        <button
                          onClick={() => navigate(`/session?goalId=${selectedGoal.id}`)}
                          className="bg-accent text-background font-bold py-2 px-5 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow text-sm"
                        >
                          + Session
                        </button>
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
                <div className="grid grid-cols-4 gap-3">
                  {(() => {
                    const results = calculateGoalProgress(selectedGoal, goals, sessions);
                    return (['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
                      const { pct, count, hasData } = results[period];
                      const color = !hasData
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
                      return (
                        <div key={period} className="bg-background/50 rounded-xl border border-secondary/20 p-3 text-center">
                          <span className="text-[10px] uppercase tracking-wider text-secondary block capitalize">{period}</span>
                          <span className={`text-2xl font-black block mt-1 ${color}`}>
                            {hasData ? `${pct}%` : '—'}
                          </span>
                          <span className="text-[10px] text-secondary/50">{detail}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Framework Data */}
              <div className="bg-background/50 rounded-xl border border-secondary/20 p-4">
                <h4 className="text-xs font-semibold text-accent mb-3 uppercase tracking-wider">Framework Data</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedFw?.keys.map(k => (
                    <div key={k.key}>
                      <span className="text-secondary block text-xs mb-0.5">{k.label}</span>
                      <span className="font-medium">{selectedGoal.data[k.key] || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session History */}
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

              {/* Goal Journaling */}
              <GoalJournal goalId={selectedGoal.id!} />

            </div>
          </div>
        )}
      </div>
    </>
  )}
</div>
);
};
