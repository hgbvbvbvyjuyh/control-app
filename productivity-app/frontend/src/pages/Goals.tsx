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
import { GoalPlanSection } from '../components/GoalPlanSection';
import { JournalModal, type CompletionIntent, type JournalAnswers } from '../components/JournalModal';
import { useConfirmStore } from '../stores/confirmStore';
import { useDailySimpleSessionStore } from '../stores/dailySimpleSessionStore';
import { ChevronLeft, Calendar, Layout, Target, PieChart, CheckCircle2, XCircle, Pencil } from 'lucide-react';

import { getActiveGoals } from '../utils/goalListHelpers';

const BTN_SECONDARY =
  'text-sm font-semibold px-4 py-2 rounded-xl border border-white/10 bg-surface/50 text-secondary hover:text-white hover:bg-surface/80 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/50';
import {
  type GoalPlanData,
  buildChildGoalRowData,
  childTypeForPlannedParent,
  emptyPlanForGoalType,
  hasChildOfType,
  isPlannableGoalType,
  parseGoalPlan,
  serializeGoalPlan,
} from '../utils/goalPlan';
import { useToastStore } from '../stores/toastStore';




// ---- Goals Page ----
export const Goals = () => {
  const { goals, load: loadGoals, selectedGoalId, select, patchStatus, add, update, remove } = useGoalStore();
  const { add: addJournal, load: loadJournals } = useJournalStore();
  const { frameworks, load: loadFrameworks } = useFrameworkStore();
  const { sessions, load: loadSessions, remove: removeSession } = useSessionStore();
  const {
    byGoalId: simpleSessionsByGoal,
    loadForGoal: loadSimpleSessionsForGoal,
    add: addSimpleSession,
    setStatus: setSimpleSessionStatus,
    updateNote: updateSimpleSessionNote,
    remove: removeSimpleSession,
  } = useDailySimpleSessionStore();
  const { confirm } = useConfirmStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [showFwModal, setShowFwModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [inlineTitleEditByGoalId, setInlineTitleEditByGoalId] = useState<Record<string, string>>({});
  const [hidePencilByGoalId, setHidePencilByGoalId] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | null>(null);
  const [showFrameworkData, setShowFrameworkData] = useState(false);
  const [planDraft, setPlanDraft] = useState<GoalPlanData | null>(null);
  const [simpleSessionPlanOpenId, setSimpleSessionPlanOpenId] = useState<string | null>(null);
  const [simpleSessionPlanText, setSimpleSessionPlanText] = useState('');

  // ── Goal journal modal state ──
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalTargetGoal, setJournalTargetGoal] = useState<Goal | null>(null);
  const [journalIntent, setJournalIntent] = useState<CompletionIntent>('completed');

  const openGoalJournal = (goal: Goal, intent: CompletionIntent) => {
    setJournalTargetGoal(goal);
    setJournalIntent(intent);
    setJournalModalOpen(true);
  };

  const handleGoalJournalSubmit = async (answers: JournalAnswers) => {
    if (!journalTargetGoal || answers.type !== 'goal') return;
    const today = new Date().toISOString().split('T')[0];
    const goalType = journalTargetGoal.goalType as any;
    const category = (journalTargetGoal.category || 'health') as any;

    await addJournal(
      goalType,
      today,
      {
        type: "goal",
        goalId: journalTargetGoal.id,
        answers: {
          q1: answers.completed,
          q2: answers.mistakes,
          q3: answers.improvement
        },
        createdAt: new Date().toISOString()
      },
      journalTargetGoal.id,
      category
    );

    const newStatus = journalIntent === 'completed' ? 'done' : 'not_done';
    await patchStatus(String(journalTargetGoal.id), newStatus);

    if (String(selectedGoalId) === String(journalTargetGoal.id)) {
      select(null);
    }

    setJournalModalOpen(false);
    setJournalTargetGoal(null);
  };

  useEffect(() => {
    loadGoals();
    loadFrameworks();
    loadSessions();
    loadJournals();
  }, []);

  const selectedGoal = goals.find(g => String(g.id) === String(selectedGoalId));

  useEffect(() => {
    if (!selectedGoal?.id || selectedGoal.goalType !== 'daily') return;
    void loadSimpleSessionsForGoal(String(selectedGoal.id));
  }, [selectedGoalId, selectedGoal?.id, selectedGoal?.goalType, loadSimpleSessionsForGoal]);

  useEffect(() => {
    if (!selectedGoal || !isPlannableGoalType(selectedGoal.goalType)) {
      setPlanDraft(null);
      return;
    }
    setPlanDraft(parseGoalPlan(selectedGoal.data));
  }, [selectedGoalId, selectedGoal?.data?.plan]);

  const selectedFw = selectedGoal
    ? frameworks.find(f => String(f.id) === String(selectedGoal.frameworkId))
    : null;

  const handleSavePlan = async () => {
    if (!selectedGoal?.id || !planDraft) return;
    try {
      await update(String(selectedGoal.id), {
        ...selectedGoal.data,
        plan: serializeGoalPlan(planDraft),
      }, selectedGoal.goalType, selectedGoal.category);
      showToast('Plan saved');
    } catch {
      showToast('Failed to save plan');
    }
  };

  const handleClearPlan = async () => {
    if (!selectedGoal?.id) return;
    confirm(
      'Clear Plan',
      'This will remove the saved plan from this goal (sub-goals are not affected).',
      async () => {
        try {
          await update(String(selectedGoal.id), {
            ...selectedGoal.data,
            plan: '',
          }, selectedGoal.goalType, selectedGoal.category);
          showToast('Plan cleared', 'info');
        } catch {
          showToast('Could not clear plan', 'error');
        }
      },
      'Clear Plan',
      'Cancel'
    );
  };

  const handleDeleteDailyGoal = async () => {
    if (!selectedGoal?.id) return;
    confirm(
      'Delete Goal',
      'This action cannot be undone. The goal and all associated data will be removed.',
      async () => {
        try {
          await remove(String(selectedGoal.id));
          showToast('Goal deleted', 'info');
          select(null);
          setPlanDraft(null);
          setSimpleSessionPlanOpenId(null);
          setSimpleSessionPlanText('');
        } catch {
          showToast('Could not delete goal', 'error');
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const handleGenerateSubGoalsFromPlan = async () => {
    console.log('[generateSubGoalsFromPlan] start', { selectedGoal });
    if (!selectedGoal?.id) {
      console.log('[generateSubGoalsFromPlan] validation: missing selectedGoal.id');
      return;
    }
    if (!isPlannableGoalType(selectedGoal.goalType)) {
      console.log('[generateSubGoalsFromPlan] validation: goal type not plannable', selectedGoal.goalType);
      return;
    }
    if (!selectedFw) {
      console.log('[generateSubGoalsFromPlan] validation: framework not found', {
        goalFrameworkId: selectedGoal.frameworkId,
        frameworkIds: frameworks.map(f => f.id),
      });
      showToast('Framework not found for this goal', 'error');
      return;
    }
    const plan = parseGoalPlan(selectedGoal.data);
    console.log('[generateSubGoalsFromPlan] parsed plan', plan, 'raw plan field:', selectedGoal.data?.plan);
    if (!plan) {
      console.log('[generateSubGoalsFromPlan] validation: parseGoalPlan returned null');
      showToast('Save your plan first', 'error');
      return;
    }
    const savedStr = typeof selectedGoal.data.plan === 'string' ? selectedGoal.data.plan : '';
    const draftStr = planDraft === null ? null : serializeGoalPlan(planDraft);
    console.log('[generateSubGoalsFromPlan] validation: save vs draft', {
      savedStrLen: savedStr.length,
      draftMatch: draftStr !== null && savedStr === draftStr,
      planDraftNull: planDraft === null,
    });
    if (planDraft === null || savedStr === '' || savedStr !== draftStr) {
      console.log('[generateSubGoalsFromPlan] validation: saved plan missing or does not match editor draft');
      showToast('Save your plan first', 'error');
      return;
    }
    const emptyIdx = plan.items.findIndex(it => !it.text.trim());
    if (emptyIdx !== -1) {
      console.log('[generateSubGoalsFromPlan] validation: empty plan item at index', emptyIdx);
      showToast('All plan items must have text', 'error');
      return;
    }
    const childType = childTypeForPlannedParent(selectedGoal.goalType);
    if (hasChildOfType(goals, String(selectedGoal.id), childType)) {
      console.log('[generateSubGoalsFromPlan] validation: children of type already exist', childType);
      showToast('Sub goals already exist', 'error');
      return;
    }
    console.log('[generateSubGoalsFromPlan] passed validation; creating', plan.items.length, 'sub-goals');
    try {
      for (let i = 0; i < plan.items.length; i++) {
        const item = plan.items[i]!;
        console.log('[generateSubGoalsFromPlan] add() item', i, item.text.trim());
        await add(
          selectedGoal.frameworkId,
          buildChildGoalRowData(selectedFw, item.text.trim()),
          childType,
          String(selectedGoal.id),
          false,
          selectedGoal.category || 'health'
        );
      }
      console.log('[generateSubGoalsFromPlan] add() completed for all items');
      showToast('Sub goals created from plan');
    } catch (e) {
      console.error('[generateSubGoalsFromPlan] add() failed', e);
      showToast('Failed to create sub goals', 'error');
    }
  };

  const setPlanItemText = (index: number, text: string) => {
    setPlanDraft(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index]!, text };
      return { ...prev, items };
    });
  };
  const startInlineTitleEdit = (goal: Goal) => {
    const goalId = String(goal.id);
    const currentTitle = String(Object.values(goal.data)[0] || '');
    setInlineTitleEditByGoalId(prev => ({ ...prev, [goalId]: currentTitle }));
  };

  const saveInlineTitleEdit = async (goal: Goal) => {
    if (!goal.id) return;
    const goalId = String(goal.id);
    const draft = (inlineTitleEditByGoalId[goalId] ?? '').trim();
    if (!draft) return;

    const firstKey = Object.keys(goal.data)[0];
    if (!firstKey) return;

    try {
      await update(
        goalId,
        { ...goal.data, [firstKey]: draft },
        goal.goalType,
        goal.category
      );
      setInlineTitleEditByGoalId(prev => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
      setHidePencilByGoalId(prev => ({ ...prev, [goalId]: true }));
      showToast('Title updated', 'success');
    } catch {
      showToast('Could not update title', 'error');
    }
  };

  const goalSessions = selectedGoal ? sessions.filter(s => s.goalId === selectedGoal.id) : [];
  const getFrameworkName = (fwId: string) => frameworks.find(f => f.id === fwId)?.name || 'Unknown';

  const activeGoalsInCategory =
    activeCategory !== null
      ? getActiveGoals(goals).filter(g => g.goalType === activeCategory)
      : [];

  const resolveDailyExpectedSessions = (data: Record<string, string>): number | null => {
    const preferredKeys = [
      'plannedSessions',
      'sessionTarget',
      'targetSessions',
      'sessionsPerDay',
      'expectedSessions',
    ];
    for (const key of preferredKeys) {
      const raw = data[key];
      if (!raw) continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return Math.floor(n);
    }
    return null;
  };

  const getGoalDrivenProgress = () => {
    if (!selectedGoal?.id) return { hasData: false, pct: 0, completed: 0, total: 0, unitLabel: 'Task' };
    const goalId = String(selectedGoal.id);

    if (selectedGoal.goalType === 'daily') {
      const list = simpleSessionsByGoal[goalId] ?? [];
      const total = resolveDailyExpectedSessions(selectedGoal.data);
      if (!total || total <= 0) return { hasData: false, pct: 0, completed: 0, total: 0, unitLabel: 'Sessions' };
      const completed = list.filter(s => s.status === 'done').length;
      const pct = Math.round((Math.min(completed, total) / total) * 100);
      return { hasData: true, pct, completed: Math.min(completed, total), total, unitLabel: 'Sessions' };
    }

    const childType =
      selectedGoal.goalType === 'weekly'
        ? 'daily'
        : selectedGoal.goalType === 'monthly'
          ? 'weekly'
          : selectedGoal.goalType === 'yearly'
            ? 'monthly'
            : null;
    const total =
      selectedGoal.goalType === 'weekly'
        ? 7
        : selectedGoal.goalType === 'monthly'
          ? 4
          : selectedGoal.goalType === 'yearly'
            ? 12
            : 0;
    const unitLabel =
      selectedGoal.goalType === 'weekly'
        ? 'Days'
        : selectedGoal.goalType === 'monthly'
          ? 'Weeks'
          : selectedGoal.goalType === 'yearly'
            ? 'Months'
            : 'Task';
    if (!childType || total === 0) return { hasData: false, pct: 0, completed: 0, total: 0, unitLabel };

    const children = goals.filter(
      g => g.parentId != null && String(g.parentId) === goalId && g.goalType === childType
    );
    // Require full generation (7/4/12). Partial generation is treated as no plan to avoid misleading percentages.
    if (children.length !== total) return { hasData: false, pct: 0, completed: 0, total, unitLabel };

    const completed = children.filter(g => g.status === 'done').length;
    const pct = Math.round((completed / total) * 100);
    return { hasData: true, pct, completed, total, unitLabel };
  };

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
          parentGoalId={null}
          allowFreeGoalType={false}
        />
      )}</AnimatePresence>
      <JournalModal
        open={journalModalOpen}
        onClose={() => { setJournalModalOpen(false); setJournalTargetGoal(null); }}
        journalType="goal"
        intent={journalIntent}
        onSubmit={handleGoalJournalSubmit}
      />

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
          <div
            className={`flex-1 h-full min-h-0 flex flex-col gap-3 overflow-y-auto no-scrollbar ${
              selectedGoalId ? 'max-md:hidden' : ''
            }`}
          >
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
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setEditingGoal(undefined); setShowGoalModal(true); }} className="bg-accent text-background px-5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] text-sm font-bold">
                    + Goal
                  </motion.button>
                </div>
              </div>
            </div>

            {activeGoalsInCategory.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 items-center justify-center h-full">
                <p className="text-secondary text-sm text-center">No active {activeCategory} goals yet. Add one to get started.</p>
              </motion.div>
            )}

            {activeGoalsInCategory.map((goal, i) => (
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
                      : `border-white/5 bg-surface/30 backdrop-blur-md hover:border-white/20 hover:bg-surface/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:scale-[1.01] ${
                          goal.parentId != null ? 'opacity-85' : ''
                        }`
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {/* Goal status badge */}
                          {goal.status && goal.status !== 'active' && (
                            <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded leading-none border ${
                              goal.status === 'done' ? 'bg-success/10 text-success border-success/20' :
                              goal.status === 'not_done' ? 'bg-error/10 text-error border-error/20' :
                              'bg-secondary/10 text-secondary border-secondary/20'
                            }`}>
                              {goal.status.replace('_', ' ')}
                            </span>
                          )}
                          {/* Sub-goal indicator (flat list; no nested UI) */}
                          {goal.parentId != null && (
                            (() => {
                              const parentGoal = goals.find(
                                g => g.id != null && String(g.id) === String(goal.parentId)
                              );
                              const parentTitle =
                                parentGoal ? Object.values(parentGoal.data)[0] || 'Untitled' : 'Unknown';
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    select(parentGoal?.id ?? null);
                                  }}
                                  className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded leading-none border border-secondary/20 bg-secondary/10 text-secondary hover:border-accent/40 hover:bg-secondary/20 transition-colors"
                                >
                                  From: {parentTitle}
                                </button>
                              );
                            })()
                          )}
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
                          {inlineTitleEditByGoalId[String(goal.id)] !== undefined ? (
                            <>
                              <input
                                value={inlineTitleEditByGoalId[String(goal.id)]}
                                onChange={(e) =>
                                  setInlineTitleEditByGoalId(prev => ({
                                    ...prev,
                                    [String(goal.id)]: e.target.value,
                                  }))
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="bg-background/50 border border-white/10 rounded px-2 py-1 text-sm text-text min-w-[12rem]"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void saveInlineTitleEdit(goal);
                                }}
                                className="text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-accent/30 bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                              >
                                Save
                              </button>
                            </>
                          ) : (
                            <>
                              <span>{Object.values(goal.data)[0] || 'Untitled'}</span>
                              {!hidePencilByGoalId[String(goal.id)] && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startInlineTitleEdit(goal);
                                  }}
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-secondary hover:text-text hover:bg-white/10 transition-colors"
                                  title="Edit title"
                                  aria-label="Edit title"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-secondary truncate mt-1">
                      {Object.values(goal.data).slice(1).join(' · ') || '—'}
                    </p>


                  </div>
                </AntiGravity>
              </motion.div>
            ))}
          </div>

          <div
            className={`flex-1 h-full min-h-0 flex-col bg-surface/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-y-auto no-scrollbar relative overflow-hidden md:rounded-3xl ${
              selectedGoalId
                ? 'flex max-md:fixed max-md:inset-0 max-md:z-40 max-md:rounded-none'
                : 'hidden md:flex'
            }`}
          >
            {!selectedGoal ? (
              <div className="flex-1 flex items-center justify-center text-secondary/50 text-lg h-full min-h-[12rem]">Select a goal to view details</div>
            ) : (
              <div className="flex flex-col gap-0 h-full min-h-0 relative z-10">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-white/10 p-6 pb-4 shrink-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {selectedGoal.goalType === 'daily' && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleDeleteDailyGoal}
                          className="z-50 text-error/90 hover:text-error w-7 h-7 flex items-center justify-center rounded-full hover:bg-error/10 transition-colors mb-3"
                          aria-label="Delete goal"
                          title="Delete goal"
                        >
                          ✕
                        </motion.button>
                      )}
                      <button
                        type="button"
                        onClick={() => select(null)}
                        className="md:hidden flex items-center gap-1 text-secondary hover:text-text text-xs font-medium mb-3 -ml-1 px-2 py-1 rounded-lg hover:bg-white/5"
                      >
                        <ChevronLeft size={16} /> Back to list
                      </button>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">{selectedGoal.goalType || 'daily'}</span>
                        <span className="text-[10px] text-secondary font-medium tracking-wide">{selectedFw?.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 justify-end max-md:w-full max-md:justify-start">
                      {selectedGoal.goalType === 'daily' && (
                        <>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                              const gid = selectedGoal.id;
                              if (gid == null || gid === '') return;
                              try {
                                await addSimpleSession(String(gid));
                                showToast('Session added', 'success');
                              } catch (err) {
                                console.error('addSimpleSession failed', err);
                                const msg =
                                  err instanceof Error ? err.message : 'Could not add session';
                                showToast(msg, 'error');
                              }
                            }}
                            className={BTN_SECONDARY}
                          >
                            Add Session
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/session?goalId=${selectedGoal.id}`)}
                            className="bg-accent text-background font-bold py-2 px-5 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            + Session
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6">

              {/* Progress (goal-driven) */}
              <div>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">Progress</h3>
                <div className="flex justify-center items-center py-6">
                  {(() => {
                    const { hasData, pct, completed, total, unitLabel } = getGoalDrivenProgress();
                    const colorClass =
                      !hasData || pct === 0
                        ? 'text-secondary/40'
                        : pct >= 100
                          ? 'text-success'
                          : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500';

                    const radius = 60;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - ((hasData ? pct : 0) / 100) * circumference;

                    return (
                      <div className="flex flex-col items-center">
                        <div className="relative flex items-center justify-center mb-3">
                          <svg width="160" height="160" className="-rotate-90 transform">
                            <defs>
                              <linearGradient id="goalProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#60a5fa" />
                                <stop offset="100%" stopColor="#a855f7" />
                              </linearGradient>
                            </defs>
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
                              strokeWidth="12"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              stroke={
                                !hasData || pct === 0
                                  ? '#6b7280'
                                  : pct >= 100
                                    ? '#10b981'
                                    : 'url(#goalProgressGradient)'
                              }
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset }}
                              transition={{ duration: 0.9, ease: 'easeOut' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-[2px]">
                            <span className={`text-3xl font-black tracking-tight leading-none ${colorClass}`}>
                              {hasData ? `${pct}%` : 'No plan'}
                            </span>
                          </div>
                        </div>

                        <div className="text-center leading-tight">
                          <div className="text-[11px] uppercase tracking-wider text-secondary/70 font-bold">{unitLabel}</div>
                          <div className="text-sm text-secondary/80 font-semibold">
                            {hasData ? `${completed} / ${total}` : '—'}
                          </div>
                        </div>
                      </div>
                    );
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

              {/* Plan (optional, toggle to reduce clutter) */}
              {selectedGoal && isPlannableGoalType(selectedGoal.goalType) && (
                <GoalPlanSection
                  selectedGoal={selectedGoal}
                  planDraft={planDraft}
                  onAddPlan={() => {
                    const gt = selectedGoal.goalType;
                    if (!isPlannableGoalType(gt)) return;
                    setPlanDraft(emptyPlanForGoalType(gt));
                  }}
                  onPlanItemChange={setPlanItemText}
                  onSavePlan={handleSavePlan}
                  onClearPlan={handleClearPlan}
                  onGenerateSubGoals={handleGenerateSubGoalsFromPlan}
                />
              )}

              {/* Simple sessions (90 min, pending | done | missed) */}
              {selectedGoal.goalType === 'daily' && (
              <div>
                <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Sessions</h3>
                {(simpleSessionsByGoal[String(selectedGoal.id)] ?? []).length === 0 && (
                  <p className="text-secondary text-sm mb-3">No sessions yet. Use &quot;Add Session&quot; above (90 min each).</p>
                )}
                <div className="flex flex-col gap-2">
                  {(simpleSessionsByGoal[String(selectedGoal.id)] ?? []).map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-background/50 rounded-xl border border-secondary/20 p-3"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                        <div>
                          <span className="text-xs text-secondary">
                            {s.duration} min · {new Date(s.createdAt).toLocaleString()}
                          </span>
                          <span className={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            s.status === 'pending' ? 'bg-accent/15 text-accent' :
                            s.status === 'done' ? 'bg-success/15 text-success' :
                            'bg-error/15 text-error'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (simpleSessionPlanOpenId === s.id) {
                                setSimpleSessionPlanOpenId(null);
                              } else {
                                setSimpleSessionPlanText(s.note || '');
                                setSimpleSessionPlanOpenId(s.id);
                              }
                            }}
                            className="text-[10px] text-secondary hover:text-text transition-colors bg-secondary/10 px-2 py-1 rounded shrink-0"
                          >
                            {simpleSessionPlanOpenId === s.id ? 'Hide Plan' : 'Show Plan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              confirm(
                                'Delete Session',
                                'Move this session to the trash?',
                                async () => {
                                  try {
                                    await removeSimpleSession(s.id!, String(selectedGoal.id));
                                    showToast('Session moved to trash', 'info');
                                  } catch {
                                    showToast('Could not delete session', 'error');
                                  }
                                },
                                'Delete',
                                'Cancel'
                              );
                            }}
                            className="text-error/30 hover:text-error text-xs p-2 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {simpleSessionPlanOpenId === s.id && (
                        <div className="flex flex-col gap-2 mb-2">
                          <textarea
                            value={simpleSessionPlanText}
                            onChange={e => setSimpleSessionPlanText(e.target.value)}
                            rows={3}
                            className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-text resize-y min-h-[4.5rem]"
                            placeholder="Optional session plan…"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateSimpleSessionNote(s.id, String(selectedGoal.id), simpleSessionPlanText);
                                showToast('Plan saved', 'success');
                              } catch {
                                showToast('Could not save plan', 'error');
                              }
                            }}
                            className={`${BTN_SECONDARY} text-xs py-1.5 self-start`}
                          >
                            Save
                          </button>
                        </div>
                      )}
                      {s.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await setSimpleSessionStatus(s.id, String(selectedGoal.id), 'done');
                              } catch {
                                showToast('Could not update session');
                              }
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/30 bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-40"
                          >
                            Completed
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await setSimpleSessionStatus(s.id, String(selectedGoal.id), 'missed');
                              } catch {
                                showToast('Could not update session');
                              }
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-error/30 bg-error/15 text-error hover:bg-error/25 transition-colors disabled:opacity-40"
                          >
                            Not Completed
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
              )}

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


              {/* Goal Action Buttons */}
              <div className="mt-auto pt-6 border-t border-white/10">
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openGoalJournal(selectedGoal, 'completed')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-success/10 border border-success/20 text-success font-bold hover:bg-success/20 transition-all uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(34,197,94,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 size={18} />
                    Completed
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openGoalJournal(selectedGoal, 'not_completed')}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-error/10 border border-error/20 text-error font-bold hover:bg-error/20 transition-all uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(239,68,68,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <XCircle size={18} />
                    Not Completed
                  </motion.button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  )}
</div>
);
};
