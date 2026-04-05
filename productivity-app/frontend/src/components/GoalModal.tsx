import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrameworkStore } from '../stores/frameworkStore';
import { useGoalStore } from '../stores/goalStore';
import { useToastStore } from '../stores/toastStore';
import { type Framework, type Goal } from '../db';
import { motion } from 'framer-motion';
import { emptyPlanForGoalType, isPlannableGoalType, serializeGoalPlan } from '../utils/goalPlan';
import { logClientError } from '../utils/logClientError';

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  frameworkId: string | null;
  initialType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  editingGoal?: Goal;
  parentGoalId?: string | null;
  allowFreeGoalType?: boolean;
}

function buildGoalDataFromFramework(
  framework: Framework,
  type: Goal['goalType']
): Record<string, string> {
  const next: Record<string, string> = {};
  framework.keys.forEach((k) => {
    next[k.key] = '';
  });
  if (isPlannableGoalType(type)) {
    next.plan = serializeGoalPlan(emptyPlanForGoalType(type));
  }
  return next;
}

function formSignature(props: {
  editingGoal?: Goal;
  frameworkId: string | null;
  initialType: Goal['goalType'];
  parentGoalId: string | null;
  allowFreeGoalType: boolean;
}): string {
  const g = props.editingGoal;
  return [
    g?.id ?? 'new',
    g?.updatedAt ?? '',
    props.frameworkId ?? '',
    props.initialType,
    props.parentGoalId ?? '',
    props.allowFreeGoalType ? '1' : '0',
  ].join('|');
}

export const GoalModal = ({
  open,
  onClose,
  frameworkId,
  initialType = 'daily',
  editingGoal,
  parentGoalId = null,
  allowFreeGoalType = false,
}: GoalModalProps) => {
  const { frameworks } = useFrameworkStore();
  const { add, update } = useGoalStore();
  const { showToast } = useToastStore();

  const [selectedFw, setSelectedFw] = useState('');
  const [goalType, setGoalType] = useState<Goal['goalType']>('daily');
  const [category, setCategory] = useState<Goal['category']>('health');
  const [data, setData] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const lastResetSignatureRef = useRef<string | null>(null);
  const pendingResetAfterSaveRef = useRef(false);
  /** Bumps when the modal closes — ignore stale save completions after dismiss or navigation. */
  const saveEpochRef = useRef(0);

  const resetFormFromProps = useCallback(() => {
    setError('');
    setSaving(false);
    if (editingGoal) {
      setSelectedFw(editingGoal.frameworkId || '');
      setGoalType(editingGoal.goalType);
      setCategory(editingGoal.category || 'health');
      setData({ ...editingGoal.data });
      return;
    }
    setSelectedFw(frameworkId || '');
    setGoalType(initialType);
    setCategory('health');
    const f = frameworks.find((x) => String(x.id) === String(frameworkId || ''));
    if (f) {
      setData(buildGoalDataFromFramework(f, initialType));
    } else {
      setData({});
    }
  }, [editingGoal, frameworkId, initialType, frameworks]);

  useLayoutEffect(() => {
    if (!open) return;
    const sig = formSignature({
      editingGoal,
      frameworkId,
      initialType,
      parentGoalId,
      allowFreeGoalType,
    });
    const shouldReset =
      pendingResetAfterSaveRef.current || lastResetSignatureRef.current !== sig;
    if (shouldReset) {
      pendingResetAfterSaveRef.current = false;
      lastResetSignatureRef.current = sig;
      resetFormFromProps();
    }
  }, [
    open,
    editingGoal,
    frameworkId,
    initialType,
    parentGoalId,
    allowFreeGoalType,
    resetFormFromProps,
  ]);

  /** If frameworks load after open, hydrate create/attach flows that still have empty fields. */
  useEffect(() => {
    if (!open || editingGoal) return;
    const fid = String(frameworkId || selectedFw || '');
    if (!fid) return;
    const f = frameworks.find((x) => String(x.id) === fid);
    if (!f) return;
    setData((prev) => (Object.keys(prev).length === 0 ? buildGoalDataFromFramework(f, goalType) : prev));
  }, [open, editingGoal, frameworkId, selectedFw, frameworks, goalType]);

  useEffect(() => {
    if (!open) {
      saveEpochRef.current += 1;
      setSaving(false);
      setError('');
    }
  }, [open]);

  const fw = frameworks.find((f) => String(f.id) === String(selectedFw));

  const applyFrameworkData = (framework: Framework, type: Goal['goalType']) => {
    setData(buildGoalDataFromFramework(framework, type));
  };

  const handleFrameworkChange = (value: string) => {
    setSelectedFw(value);
    const nextFw = frameworks.find((x) => String(x.id) === String(value));
    if (!nextFw) return;
    if (!editingGoal) applyFrameworkData(nextFw, goalType);
    if (editingGoal?.frameworkId == null) applyFrameworkData(nextFw, goalType);
  };

  const handleGoalTypeChange = (t: Goal['goalType']) => {
    setGoalType(t);
    if (!fw) return;
    if (!editingGoal) applyFrameworkData(fw, t);
    if (editingGoal?.frameworkId == null) applyFrameworkData(fw, t);
  };

  const handleRequestClose = () => {
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (saving) return;
    if (!selectedFw) {
      setError('Select a framework');
      return;
    }
    if (!fw) {
      setError('Framework not found');
      return;
    }
    const goalId = editingGoal?.id != null && String(editingGoal.id).trim() !== '' ? String(editingGoal.id) : '';
    const isFrameworkAttachFlow = Boolean(editingGoal && editingGoal.frameworkId == null);
    if (!isFrameworkAttachFlow) {
      const empty = fw.keys.find((k) => !data[k.key]?.trim());
      if (empty) {
        setError(`"${empty.label}" cannot be empty`);
        return;
      }
    }

    const saveEpoch = saveEpochRef.current;
    setSaving(true);
    setError('');
    try {
      if (editingGoal) {
        if (!goalId) {
          setError('Cannot update: goal has no id');
          setSaving(false);
          return;
        }
        if (isFrameworkAttachFlow) {
          const initialized = buildGoalDataFromFramework(fw, goalType);
          await update(goalId, initialized, goalType, category, selectedFw);
        } else {
          await update(goalId, { ...editingGoal.data, ...data }, goalType, category);
        }
      } else {
        const pid = parentGoalId?.trim() ? parentGoalId : null;
        await add(selectedFw, data, goalType, pid, pid ? false : true, category, 'Unknown');
      }
      if (saveEpochRef.current !== saveEpoch) return;
      if (editingGoal) {
        showToast('Goal updated successfully');
      } else {
        const pid = parentGoalId?.trim() ? parentGoalId : null;
        showToast(pid ? 'Sub goal created' : 'New goal created');
      }
      pendingResetAfterSaveRef.current = true;
      handleRequestClose();
    } catch (err) {
      if (saveEpochRef.current === saveEpoch) {
        logClientError('GoalModal.save', err);
        setError(err instanceof Error ? err.message : 'Failed to save goal');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-[opacity,visibility] duration-200 ${
        open
          ? 'bg-black/60 backdrop-blur-sm visible opacity-100'
          : 'invisible pointer-events-none opacity-0'
      }`}
      onClick={open ? handleRequestClose : undefined}
      role="presentation"
      aria-hidden={!open}
    >
      <motion.div
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          scale: open ? 1 : 0.97,
          y: open ? 0 : 8,
        }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-secondary/30 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto no-scrollbar shadow-2xl shadow-black/50"
      >
            <h2 className="text-xl font-bold mb-4">
              {editingGoal ? 'Edit Goal' : parentGoalId ? 'Create Sub Goal' : 'Create Goal'}
            </h2>
            {error && (
              <p className="text-error text-sm mb-3 bg-error/10 border border-error/20 p-2 rounded" role="alert">
                {error}
              </p>
            )}

            {(editingGoal || allowFreeGoalType || !initialType) && (
              <div className="mb-4">
                <label className="text-xs text-secondary font-semibold uppercase tracking-wider block mb-2">
                  Goal Type
                </label>
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleGoalTypeChange(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                        goalType === t
                          ? 'bg-accent text-background'
                          : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-secondary font-semibold uppercase tracking-wider block mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['health', 'finance', 'relation', 'spirituality'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                      category === c
                        ? c === 'health'
                          ? 'bg-green-500 text-black'
                          : c === 'finance'
                            ? 'bg-yellow-500 text-black'
                            : c === 'relation'
                              ? 'bg-pink-500 text-white'
                              : 'bg-blue-500 text-white'
                        : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {!frameworkId && (
              <select
                value={selectedFw}
                onChange={(e) => handleFrameworkChange(e.target.value)}
                className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-sm text-text mb-4 focus:outline-none focus:border-accent"
                aria-label="Framework"
              >
                <option value="">Select Framework</option>
                {frameworks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            {fw &&
              fw.keys.map((k) => (
                <div key={k.key} className="mb-3">
                  <label className="text-sm text-secondary block mb-1">
                    {k.label}{' '}
                    {k.description && <span className="text-xs text-secondary/50">— {k.description}</span>}
                  </label>
                  <input
                    value={data[k.key] ?? ''}
                    onChange={(e) => setData((prev) => ({ ...prev, [k.key]: e.target.value }))}
                    autoFocus={fw.keys[0]?.key === k.key}
                    className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-sm text-text focus:outline-none focus:border-accent"
                    placeholder={k.label}
                  />
                </div>
              ))}

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={handleRequestClose}
                disabled={saving}
                className="px-4 py-2 text-secondary hover:text-text transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-6 py-2 bg-accent text-background font-bold rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingGoal ? 'Update' : 'Create'}
              </button>
            </div>
      </motion.div>
    </div>
  );
};
