import { useEffect, useRef, useState } from 'react';
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
import { ChevronLeft, Calendar, Layout, Target, PieChart, CheckCircle2, XCircle } from 'lucide-react';
import FrameworkFullView from '../components/FrameworkFullView';
import { useExpand } from '../hooks/useExpand';

 

const BTN_SECONDARY =
  'text-sm font-semibold px-4 py-2 rounded-xl border border-white/10 bg-surface/50 text-secondary hover:text-white hover:bg-surface/80 transition-all duration-300 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/50';
import {
  type GoalPlanData,
  childTypeForPlannedParent,
  emptyPlanForGoalType,
  goalPlanDataEqual,
  hasChildOfType,
  isPlannableGoalType,
  parseGoalPlan,
  serializeGoalPlan,
} from '../utils/goalPlan';
import { useToastStore } from '../stores/toastStore';
import { logClientError } from '../utils/logClientError';
import { formatFrameworkDataDisplay } from '../utils/formatFrameworkData';
import { logUserFailure } from '../utils/failureReporter';
import { db } from '../lib/persistence';

import { GoalCard } from '../components/goals/GoalCard';

// ---- Goals Page ----
export const Goals = () => {
  const {
    goals,
    load: loadGoals,
    selectedGoalId,
    select,
    patchStatus,
    setGoals,
    add,
    update,
    remove,
  } = useGoalStore();
  const { add: addJournal, load: loadJournals } = useJournalStore();
  const { frameworks, load: loadFrameworks } = useFrameworkStore();
  const { sessions, load: loadSessions } = useSessionStore();
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

  const [planDraft, setPlanDraft] = useState<GoalPlanData | null>(null);
  const [simpleSessionPlanOpenId, setSimpleSessionPlanOpenId] = useState<string | null>(null);
  const [simpleSessionPlanText, setSimpleSessionPlanText] = useState('');

  // ── Goal journal modal state ──
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalTargetGoal, setJournalTargetGoal] = useState<Goal | null>(null);
  const [journalIntent, setJournalIntent] = useState<CompletionIntent>('completed');
  /** Invalidate in-flight journal writes when the modal closes (backdrop, navigation, etc.). */
  const journalAsyncGenRef = useRef(0);
  const journalWasOpenRef = useRef(false);
  const { expandedId, toggle } = useExpand();

  const openGoalJournal = (goal: Goal, intent: CompletionIntent) => {
    setJournalTargetGoal(goal);
    setJournalIntent(intent);
    setJournalModalOpen(true);
  };

  useEffect(() => {
    if (journalWasOpenRef.current && !journalModalOpen) {
      journalAsyncGenRef.current += 1;
    }
    journalWasOpenRef.current = journalModalOpen;
  }, [journalModalOpen]);

  const handleGoalJournalSubmit = async (answers: JournalAnswers) => {
    if (!journalTargetGoal || answers.type !== 'goal') return;
    const asyncGen = journalAsyncGenRef.current;
    const targetId = String(journalTargetGoal.id);
    const today = new Date().toISOString().split('T')[0];
    const goalType = journalTargetGoal.goalType;
    const category = journalTargetGoal.category || 'health';
    const intentSnapshot = journalIntent;

    await addJournal(
      goalType,
      today,
      {
        type: 'goal',
        goalId: journalTargetGoal.id,
        answers: {
          q1: answers.completed,
          q2: answers.mistakes,
          q3: answers.improvement,
        },
        createdAt: new Date().toISOString(),
      },
      journalTargetGoal.id,
      category
    );

    if (journalAsyncGenRef.current !== asyncGen) return;

    const newStatus = intentSnapshot === 'completed' ? 'done' : 'not_done';

    // Update Dexie DB correctly
    await db.table("goals").put({
      ...journalTargetGoal,
      status: newStatus,
      updatedAt: Date.now(),
      ...(newStatus === 'done' ? { completedAt: new Date().toISOString() } : {}),
    });

    // Update Zustand state immediately
    setGoals((prev: Goal[]) => prev.map((g: Goal) =>
      String(g.id) === targetId ? { ...g, status: newStatus } : g
    ));

    await patchStatus(targetId, newStatus);

    if (journalAsyncGenRef.current !== asyncGen) return;

    if (String(useGoalStore.getState().selectedGoalId) === targetId) {
      select(null);
    }

    setJournalModalOpen(false);
    setJournalTargetGoal(null);
    showToast(newStatus === 'done' ? 'Goal completed!' : 'Goal marked as not completed', 'success');
  };

  useEffect(() => {
    void loadGoals();
    void loadFrameworks();
    void loadSessions();
    void loadJournals();
  }, [loadGoals, loadFrameworks, loadSessions, loadJournals]);

  /** Refetch frameworks when entering a goal category (recovers from failed initial load or empty cache). */
  useEffect(() => {
    if (activeCategory != null) {
      void loadFrameworks();
    }
  }, [activeCategory, loadFrameworks]);

  const selectedGoal = goals.find(g => String(g.id) === String(selectedGoalId));

  useEffect(() => {
    if (!selectedGoal?.id || selectedGoal.goalType !== 'daily') return;
    void loadSimpleSessionsForGoal(String(selectedGoal.id));
  }, [selectedGoalId, selectedGoal?.id, selectedGoal?.goalType, loadSimpleSessionsForGoal]);

  /** Avoid re-applying the same server plan when `goals` array identity changes without data change. */
  const planSyncFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    const goal = goals.find((g) => String(g.id) === String(selectedGoalId));
    
    // Only reset/sync if the goal selection actually changed.
    // This prevents the store from overwriting the local draft when 
    // other goals are updated or when the current goal is saved.
    const lastGoalId = planSyncFingerprintRef.current?.split('|')[0];
    const isNewSelection = lastGoalId !== String(selectedGoalId ?? '');
    
    if (isNewSelection) {
      if (!goal || !isPlannableGoalType(goal.goalType)) {
        setPlanDraft(null);
        planSyncFingerprintRef.current = `${String(selectedGoalId ?? '')}|__noplan__`;
      } else {
        const currentServerPlan = String(goal.data?.plan ?? '');
        planSyncFingerprintRef.current = `${String(selectedGoalId)}|${currentServerPlan}`;
        setPlanDraft(parseGoalPlan(goal.data));
      }
    }
  }, [goals, selectedGoalId]);

  const selectedFw = selectedGoal
    ? frameworks.find(f => String(f.id) === String(selectedGoal.frameworkId))
    : null;

  const handleSavePlan = async () => {
    if (!selectedGoal?.id || !planDraft) return;
    const goalId = String(selectedGoal.id);
    const serializedPlan = serializeGoalPlan(planDraft);
    try {
      // Update the fingerprint immediately before the async call to prevent
      // the useEffect from resetting planDraft when 'goals' changes.
      planSyncFingerprintRef.current = `${goalId}|${serializedPlan}`;

      await update(
        goalId,
        {
          ...selectedGoal.data,
          plan: serializedPlan,
        },
        selectedGoal.goalType,
        selectedGoal.category
      );
      if (useGoalStore.getState().selectedGoalId !== goalId) return;
      showToast('Plan saved');
    } catch (err) {
      logClientError('Goals.savePlan', err);
      showToast('Failed to save plan');
    }
  };

  const handleClearPlan = async () => {
    if (!selectedGoal?.id) return;
    const goalId = String(selectedGoal.id);
    const goalType = selectedGoal.goalType;
    const category = selectedGoal.category;
    const dataSnapshot = { ...selectedGoal.data };
    confirm(
      'Clear Plan',
      'This will remove the saved plan from this goal (sub-goals are not affected).',
      async () => {
        try {
          await update(goalId, { ...dataSnapshot, plan: '' }, goalType, category);
          if (useGoalStore.getState().selectedGoalId !== goalId) return;
          showToast('Plan cleared', 'info');
        } catch (err) {
          logClientError('Goals.clearPlan', err);
          showToast('Could not clear plan', 'error');
        }
      },
      'Clear Plan',
      'Cancel'
    );
  };

  const handleDeleteSelectedGoal = async () => {
    if (!selectedGoal?.id) return;
    const deleteGoalId = String(selectedGoal.id);
    confirm(
      'Delete Goal',
      'This action cannot be undone. The goal and all associated data will be removed.',
      async () => {
        try {
          await remove(deleteGoalId);
          showToast('Goal deleted', 'info');
          select(null);
          setPlanDraft(null);
          setSimpleSessionPlanOpenId(null);
          setSimpleSessionPlanText('');
        } catch (err) {
          logClientError('Goals.deleteSelectedGoal', err);
          showToast('Could not delete goal', 'error');
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const handleGenerateSubGoalsFromPlan = async () => {
    if (!selectedGoal?.id || !planDraft) {
      return;
    }
    if (!isPlannableGoalType(selectedGoal.goalType)) {
      return;
    }

    // Check if the current draft matches the last saved/loaded fingerprint.
    // This is much more reliable than checking against 'selectedGoal.data' 
    // while a store update is cycling back.
    const currentFingerprint = `${String(selectedGoal.id)}|${serializeGoalPlan(planDraft)}`;
    if (currentFingerprint !== planSyncFingerprintRef.current) {
      showToast('Save your plan first', 'error');
      return;
    }

    const plan = planDraft;
    const parentId = String(selectedGoal.id);
    const childType = childTypeForPlannedParent(selectedGoal.goalType);
    if (hasChildOfType(goals, String(selectedGoal.id), childType)) {
      showToast('Sub goals already exist', 'error');
      return;
    }
    const ideaItems = plan.items.map(it => it.text.trim());
    if (ideaItems.some(text => text === '')) {
      showToast('Fill all plan items before generating sub goals', 'error');
      return;
    }
    try {
      for (let i = 0; i < ideaItems.length; i++) {
        if (useGoalStore.getState().selectedGoalId !== parentId) {
          showToast('Stopped: selection changed', 'info');
          return;
        }
        const ideaText = ideaItems[i]!;
        await add(
          null,
          {},
          childType,
          parentId,
          false,
          selectedGoal.category || 'health',
          ideaText
        );
      }
      if (useGoalStore.getState().selectedGoalId === parentId) {
        showToast('Sub goals created from plan');
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('[generateSubGoalsFromPlan] failed:', e instanceof Error ? e.message : e);
      }
      showToast('Failed to create sub goals', 'error');
    }
  };

  const setPlanItemText = (index: number, text: string) => {
    setPlanDraft((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = { ...items[index]!, text };
      return { ...prev, items };
    });
  };
  const startInlineTitleEdit = (goal: Goal) => {
    const goalId = String(goal.id);
    const currentTitle = String(goal.title || 'Unknown');
    setInlineTitleEditByGoalId(prev => ({ ...prev, [goalId]: currentTitle }));
  };

  const saveInlineTitleEdit = async (goal: Goal) => {
    if (!goal.id) return;
    const goalId = String(goal.id);
    const draft = (inlineTitleEditByGoalId[goalId] ?? '').trim();
    const TITLE_LIMIT = 80;
    if (draft.length === 0 || draft.length > TITLE_LIMIT) {
      showToast(draft.length > TITLE_LIMIT ? 'Text limit exceeded' : 'Title is required', 'error');
      return;
    }
    const nextTitle = draft || 'Untitled';

    try {
      await update(
        goalId,
        goal.data,
        goal.goalType,
        goal.category,
        undefined,
        nextTitle
      );
      await db.table('goals').put({ ...goal, title: nextTitle });
      setGoals((prev: Goal[]) =>
        prev.map((g: Goal) => (String(g.id) === goalId ? { ...g, title: nextTitle } : g))
      );
      setInlineTitleEditByGoalId(prev => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
      if (String(useGoalStore.getState().selectedGoalId) === goalId) {
        setHidePencilByGoalId(prev => ({ ...prev, [goalId]: true }));
        showToast('Title updated', 'success');
      }
    } catch (err) {
      logClientError('Goals.saveInlineTitleEdit', err);
      showToast('Could not update title', 'error');
    }
  };

  const handleStartSessionUI = () => {
    const gid = selectedGoal?.id;
    if (gid == null || gid === '') return;
    navigate(`/session?goalId=${gid}`);
  };

  const activeGoalsInCategory =
    activeCategory !== null
      ? goals.filter(g => g.status === 'active' && g.goalType === activeCategory)
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
      const history = sessions.filter(s => String(s.goalId) === goalId);

      const simpleCompleted = list.filter(s => s.status === 'done').length;
      const historyCompleted = history.filter(s => s.status === 'completed').length;
      const completed = simpleCompleted + historyCompleted;

      const plannedTotal = resolveDailyExpectedSessions(selectedGoal.data);
      if (plannedTotal && plannedTotal > 0) {
        const pct = Math.round((Math.min(completed, plannedTotal) / plannedTotal) * 100);
        return {
          hasData: true,
          pct,
          completed: Math.min(completed, plannedTotal),
          total: plannedTotal,
          unitLabel: 'Sessions',
        };
      }

      // Fallback when no explicit daily target exists: infer total from logged sessions.
      const simpleLogged = list.length;
      const historyLogged = history.filter(s => s.status === 'completed' || s.status === 'skipped').length;
      const inferredTotal = simpleLogged + historyLogged;
      if (inferredTotal <= 0) return { hasData: false, pct: 0, completed: 0, total: 0, unitLabel: 'Sessions' };

      const pct = Math.round((completed / inferredTotal) * 100);
      return { hasData: true, pct, completed, total: inferredTotal, unitLabel: 'Sessions' };
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
    <div
      className={`flex flex-1 min-h-0 h-full flex-col ${
        activeCategory ? 'md:grid md:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]' : ''
      } gap-6 w-full max-w-none mx-auto`}
    >
      <AnimatePresence>{showFwModal && <FrameworkModal open onClose={() => setShowFwModal(false)} />}</AnimatePresence>
      <GoalModal
        open={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(undefined);
          // Only refresh if we just saved something or need to ensure state sync
          setTimeout(() => {
            void loadGoals();
          }, 100);
        }}
        frameworkId={null}
        editingGoal={editingGoal}
        initialType={activeCategory || 'daily'}
        parentGoalId={null}
        allowFreeGoalType={false}
      />
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
            className={`h-full min-h-0 flex flex-col gap-3 overflow-y-auto overflow-x-hidden no-scrollbar ${
              selectedGoalId ? 'max-md:hidden' : ''
            }`}
          >
            <div className="shrink-0 flex flex-col gap-4 mb-4">
              <button 
                onClick={() => { setActiveCategory(null); select(null); }}
                className="flex items-center gap-2 text-secondary hover:text-text transition-all duration-300 text-sm font-medium w-fit px-2 py-1 rounded-lg hover:bg-white/5"
              >
                <ChevronLeft size={16} /> Back to Categories
              </button>
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold capitalize tracking-tight">{activeCategory}</h1>
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowFwModal(true)} className="text-xs bg-surface/50 border border-white/10 text-secondary hover:text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-sm hover:bg-surface/80">
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

            {activeGoalsInCategory.map((goal, i) => {
              const parentGoal = goal.parentId
                ? goals.find((g) => String(g.id) === String(goal.parentId))
                : undefined;
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={i}
                  isSelected={String(selectedGoalId) === String(goal.id)}
                  onSelect={(id) => select(id)}
                  onStartInlineEdit={startInlineTitleEdit}
                  isInlineEditing={inlineTitleEditByGoalId[String(goal.id)] !== undefined}
                  inlineTitleValue={inlineTitleEditByGoalId[String(goal.id)] || ''}
                  onInlineTitleChange={(val) =>
                    setInlineTitleEditByGoalId((prev) => ({ ...prev, [String(goal.id)]: val }))
                  }
                  onSaveInlineEdit={saveInlineTitleEdit}
                  hidePencil={!!hidePencilByGoalId[String(goal.id)]}
                  parentGoalTitle={parentGoal?.title}
                  onSelectParent={(id) => select(id)}
                />
              );
            })}
          </div>

          <div
            className={`flex-1 min-w-0 h-full min-h-0 flex-col bg-surface/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-y-auto no-scrollbar relative overflow-hidden md:rounded-3xl ${
              selectedGoalId
                ? 'flex max-md:fixed max-md:inset-0 max-md:z-[60] max-md:rounded-none'
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
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDeleteSelectedGoal}
                        className="z-50 text-error/90 hover:text-error w-7 h-7 flex items-center justify-center rounded-full hover:bg-error/10 transition-all duration-300 mb-3"
                        aria-label="Delete goal"
                        title="Delete goal"
                      >
                        ✕
                      </motion.button>
                      <button
                        type="button"
                        onClick={() => select(null)}
                        className="md:hidden flex items-center gap-1 text-secondary hover:text-text text-xs font-medium mb-3 -ml-1 px-2 py-1 rounded-lg hover:bg-white/5"
                      >
                        <ChevronLeft size={16} /> Back to list
                      </button>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">{selectedGoal.goalType || 'daily'}</span>
                        {selectedFw ? (
                          <span className="text-[10px] uppercase tracking-widest text-secondary/80 font-semibold bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-md">
                            {selectedFw.name}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGoal(selectedGoal);
                              setShowGoalModal(true);
                            }}
                            className="text-[10px] uppercase tracking-widest text-secondary/80 font-semibold bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-md hover:text-text hover:border-secondary/40 transition-all duration-300"
                          >
                            Select Framework
                          </button>
                        )}
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
                                if (import.meta.env.DEV) {
                                  console.error(
                                    'addSimpleSession failed',
                                    err instanceof Error ? err.message : err
                                  );
                                }
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
                            onClick={handleStartSessionUI}
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
                    onClick={() => selectedGoal?.id && toggle(String(selectedGoal.id))}
                    className="text-[10px] text-secondary hover:text-text transition-all duration-300 bg-secondary/10 px-2 py-1 rounded"
                  >
                    {expandedId === String(selectedGoal?.id) ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                {expandedId === String(selectedGoal?.id) ? (
                  <FrameworkFullView
                    content={formatFrameworkDataDisplay(selectedFw, selectedGoal.data ?? {})}
                  />
                ) : null}
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
                            className="text-[10px] text-secondary hover:text-text transition-all duration-300 bg-secondary/10 px-2 py-1 rounded shrink-0"
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
                                  } catch (err) {
                                    logClientError('Goals.removeSimpleSession', err, {
                                      sessionId: s.id,
                                      goalId: selectedGoal.id,
                                    });
                                    showToast('Could not delete session', 'error');
                                  }
                                },
                                'Delete',
                                'Cancel'
                              );
                            }}
                            className="text-error/40 hover:text-error hover:bg-error/10 text-xs p-3 rounded-lg transition-all duration-300"
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
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await updateSimpleSessionNote(s.id, String(selectedGoal.id), simpleSessionPlanText);
                                  showToast('Plan saved', 'success');
                                } catch (err) {
                                  logClientError('Goals.updateSimpleSessionNote', err, {
                                    sessionId: s.id,
                                    goalId: selectedGoal.id,
                                  });
                                  showToast('Could not save plan', 'error');
                                }
                              }}
                              className={`${BTN_SECONDARY} text-xs py-1.5`}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                      {s.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await setSimpleSessionStatus(s.id, String(selectedGoal.id), 'done');
                              } catch (err) {
                                logClientError('Goals.setSimpleSessionStatus.done', err, {
                                  sessionId: s.id,
                                  goalId: selectedGoal.id,
                                });
                                showToast('Could not update session');
                              }
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-success/30 bg-success/15 text-success hover:bg-success/25 transition-all duration-300 disabled:opacity-40"
                          >
                            Completed
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await setSimpleSessionStatus(s.id, String(selectedGoal.id), 'missed');
                              } catch (err) {
                                logClientError('Goals.setSimpleSessionStatus.missed', err, {
                                  sessionId: s.id,
                                  goalId: selectedGoal.id,
                                });
                                showToast('Could not update session');
                              }
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-error/30 bg-error/15 text-error hover:bg-error/25 transition-all duration-300 disabled:opacity-40"
                          >
                            Not Completed
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-xs tracking-wide text-secondary mb-3">
                    SESSION HISTORY
                  </h3>
                  <div className="space-y-2">
                    {sessions.filter(s => String(s.goalId) === String(selectedGoal.id)).length > 0 ? (
                      sessions
                        .filter(s => String(s.goalId) === String(selectedGoal.id))
                        .map(s => (
                          <div
                            key={String(s.id)}
                            className="p-3 rounded-lg border border-secondary/20 bg-background/50"
                          >
                            <div className="flex justify-between text-sm">
                              <span>{('workMinutes' in s && s.workMinutes) ? `${s.workMinutes} min` : 'Session'}</span>
                              <span className="text-secondary/70">
                                {new Date(s.endTime || s.startTime).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-xs mt-1 text-secondary">
                              {s.status || (s.didAchieveGoal ? 'Completed' : 'Not Completed')}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-sm text-secondary/70">No sessions yet</div>
                    )}
                  </div>
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
                    onClick={() => {
                      const goalId = selectedGoal?.id ?? selectedGoalId;
                      if (goalId == null || String(goalId).trim() === '') {
                        return;
                      }
                      void logUserFailure({
                        goalId: String(goalId),
                        type: 'goal',
                        message: 'User did not complete goal',
                        timestamp: new Date().toISOString(),
                      });
                      openGoalJournal(selectedGoal, 'not_completed');
                    }}
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
