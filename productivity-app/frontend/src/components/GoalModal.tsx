import { useEffect, useState } from 'react';
import { useFrameworkStore } from '../stores/frameworkStore';
import { useGoalStore } from '../stores/goalStore';
import { useToastStore } from '../stores/toastStore';
import { type Goal } from '../db';
import { motion } from 'framer-motion';

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  frameworkId: string | null;
  initialType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  editingGoal?: Goal;
}

export const GoalModal = ({ open, onClose, frameworkId, initialType = 'daily', editingGoal }: GoalModalProps) => {
  const { frameworks } = useFrameworkStore();
  const { add, update } = useGoalStore();
  const { showToast } = useToastStore();
  const [selectedFw, setSelectedFw] = useState(editingGoal?.frameworkId || frameworkId || '');
  const [goalType, setGoalType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(editingGoal?.goalType || initialType);
  const [data, setData] = useState<Record<string, string>>(editingGoal?.data || {});
  const [error, setError] = useState('');

  const fw = frameworks.find(f => String(f.id) === String(selectedFw));

  useEffect(() => {
    if (open) {
      if (editingGoal) {
        setSelectedFw(editingGoal.frameworkId);
        setGoalType(editingGoal.goalType);
        setData(editingGoal.data);
      } else {
        setSelectedFw(frameworkId || '');
        setGoalType(initialType);
        setData({});
      }
    }
  }, [open, initialType, editingGoal, frameworkId]);

  useEffect(() => {
    if (!fw || editingGoal) return;
    const initial: Record<string, string> = {};
    fw.keys.forEach(k => {
      initial[k.key] = '';
    });
    setData(initial);
  }, [selectedFw, fw, editingGoal]);

  const handleSave = async () => {
    if (!selectedFw) { setError('Select a framework'); return; }
    if (!fw) return;
    const empty = fw.keys.find(k => !data[k.key]?.trim());
    if (empty) { setError(`"${empty.label}" cannot be empty`); return; }
    
    try {
      if (editingGoal) {
        await update(editingGoal.id!, data, goalType);
        showToast('Goal updated successfully');
      } else {
        await add(selectedFw, data, goalType);
        showToast('New goal created');
      }
      onClose();
    } catch (err) {
      setError('Failed to save goal');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="bg-background border border-secondary/30 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto no-scrollbar"
      >
        <h2 className="text-xl font-bold mb-4">{editingGoal ? 'Edit Goal' : 'Create Goal'}</h2>
        {error && <p className="text-error text-sm mb-3 bg-error/10 p-2 rounded">{error}</p>}

        {/* Goal Type - Only show if not pre-locked by a category view OR if editing an existing goal */}
        {(!initialType || editingGoal) && (
          <div className="mb-4">
            <label className="text-xs text-secondary font-semibold uppercase tracking-wider block mb-2">Goal Type</label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setGoalType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                    goalType === t ? 'bg-accent text-background' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        )}

        {!frameworkId && (
          <select
            value={selectedFw}
            onChange={e => setSelectedFw(e.target.value)}
            className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-sm text-text mb-4 focus:outline-none focus:border-accent"
          >
            <option value="">Select Framework</option>
            {frameworks.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}

        {fw && fw.keys.map(k => (
          <div key={k.key} className="mb-3">
            <label className="text-sm text-secondary block mb-1">
              {k.label} {k.description && <span className="text-xs text-secondary/50">— {k.description}</span>}
            </label>
            <input
              value={data[k.key] || ''}
              onChange={e => setData({ ...data, [k.key]: e.target.value })}
              className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-sm text-text focus:outline-none focus:border-accent"
              placeholder={k.label}
            />
          </div>
        ))}

        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-secondary hover:text-text transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-accent text-background font-bold rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow">
            {editingGoal ? 'Update' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
