import { useState } from 'react';
import { useFrameworkStore } from '../stores/frameworkStore';
import { useGoalStore } from '../stores/goalStore';
import { useConfirmStore } from '../stores/confirmStore';
import { useToastStore } from '../stores/toastStore';
import { type Framework } from '../db';
import { motion } from 'framer-motion';
import { Edit2 } from 'lucide-react';

interface FrameworkModalProps {
  open: boolean;
  onClose: () => void;
}

export const FrameworkModal = ({ open, onClose }: FrameworkModalProps) => {
  const { frameworks, add, update, remove } = useFrameworkStore();
  const { load: loadGoals, goals, selectedGoalId, select } = useGoalStore();
  const { confirm } = useConfirmStore();
  const { showToast } = useToastStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [keys, setKeys] = useState([{ key: '', label: '', description: '' }]);
  const [error, setError] = useState('');

  const addKey = () => setKeys([...keys, { key: '', label: '', description: '' }]);
  const removeKey = (i: number) => setKeys(keys.filter((_, idx) => idx !== i));
  const updateKey = (i: number, field: string, value: string) => {
    const updated = [...keys];
    (updated[i] as any)[field] = value;
    setKeys(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Framework name is required'); return; }
    const validKeys = keys.filter(k => k.key.trim() && k.label.trim());
    if (validKeys.length === 0) { setError('At least one key with a label is required'); return; }
    const uniqueKeys = new Set(validKeys.map(k => k.key));
    if (uniqueKeys.size !== validKeys.length) { setError('Keys must be unique'); return; }
    
    try {
      if (editingId) {
        await update(editingId, name.trim(), validKeys);
        showToast('Framework updated');
      } else {
        await add(name.trim(), validKeys);
        showToast('Framework created');
      }
      resetForm();
      onClose();
    } catch (err) {
      setError('Failed to save framework');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setKeys([{ key: '', label: '', description: '' }]);
    setError('');
  };

  const startEdit = (fw: Framework) => {
    setEditingId(fw.id!);
    setName(fw.name);
    setKeys(fw.keys.map(k => ({ 
      key: k.key, 
      label: k.label, 
      description: k.description || '' 
    })));
    setError('');
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
        <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Framework' : 'Create Framework'}</h2>
        {error && <p className="text-error text-sm mb-3 bg-error/10 p-2 rounded">{error}</p>}
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Framework name"
          className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-sm text-text mb-4 focus:outline-none focus:border-accent"
        />
        <h4 className="text-sm font-semibold text-accent mb-2 uppercase tracking-wider">Keys</h4>
        {keys.map((k, i) => (
          <div key={i} className="flex gap-2 mb-2 items-start">
            <input
              value={k.key}
              onChange={e => updateKey(i, 'key', e.target.value)}
              placeholder="Key"
              className="flex-1 bg-background border border-secondary/30 p-2 rounded-lg text-sm text-text focus:outline-none focus:border-accent"
            />
            <input
              value={k.label}
              onChange={e => updateKey(i, 'label', e.target.value)}
              placeholder="Label"
              className="flex-1 bg-background border border-secondary/30 p-2 rounded-lg text-sm text-text focus:outline-none focus:border-accent"
            />
            <input
              value={k.description}
              onChange={e => updateKey(i, 'description', e.target.value)}
              placeholder="Description (opt)"
              className="flex-1 bg-background border border-secondary/30 p-2 rounded-lg text-sm text-text focus:outline-none focus:border-accent"
            />
            {keys.length > 1 && (
              <button onClick={() => removeKey(i)} className="text-error/70 hover:text-error p-2">✕</button>
            )}
          </div>
        ))}
        <button onClick={addKey} className="text-accent text-sm font-medium mb-4 hover:underline">+ Add Key</button>
        <div className="flex gap-3 justify-end mt-4 mb-6">
          <button onClick={() => { resetForm(); onClose(); }} className="px-4 py-2 text-secondary hover:text-text transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-accent text-background font-bold rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow">
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>

        <hr className="border-secondary/20 mb-4" />
        <h4 className="text-sm font-semibold text-accent mb-3 uppercase tracking-wider">Custom Frameworks</h4>
        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
          {frameworks.filter(f => !f.isDefault).length === 0 && (
            <p className="text-xs text-secondary italic">No custom frameworks created yet.</p>
          )}
          {frameworks.filter(f => !f.isDefault).map(fw => (
            <div key={fw.id} className="flex justify-between items-center p-3 bg-secondary/5 border border-secondary/20 rounded-lg">
              <div>
                <p className="font-semibold text-sm">{fw.name}</p>
                <p className="text-[10px] text-secondary">{fw.keys.map(k => k.label).join(' • ')}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(fw)}
                  className="text-accent/70 hover:text-accent p-2 transition-colors"
                  title="Edit name and keys"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    confirm(
                      'Delete Framework',
                      'This will delete the framework and all related goals (including their sessions/journals).',
                      async () => {
                        const selected = selectedGoalId
                          ? goals.find(g => String(g.id) === String(selectedGoalId)) || null
                          : null;
                        await remove(fw.id!);
                        await loadGoals();
                        if (selected && String(selected.frameworkId) === String(fw.id)) {
                          select(null);
                        }
                        showToast('Framework deleted', 'info');
                      }
                    );
                  }}
                  className="text-error/70 hover:text-error text-xs p-2 transition-colors"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
