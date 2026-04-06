import { useEffect, useState } from 'react';
import { AntiGravity } from '../components/AntiGravity';
import { useFailureStore } from '../stores/failureStore';
import { useGoalStore } from '../stores/goalStore';
import { useSessionStore } from '../stores/sessionStore';
import type { Failure } from '../db';
import { logClientError } from '../utils/logClientError';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirmStore } from '../stores/confirmStore';
import { useToastStore } from '../stores/toastStore';
import { Edit2 } from 'lucide-react';

export const Failures = () => {
  const { failures, load, add, update, remove } = useFailureStore();
  const { goals, load: loadGoals } = useGoalStore();
  const { sessions, load: loadSessions } = useSessionStore();
  const { confirm } = useConfirmStore();
  const { showToast } = useToastStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'session' | 'goal' | 'app'>('session');
  const [linkedId, setLinkedId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void load();
    void loadGoals();
    void loadSessions();
  }, [load, loadGoals, loadSessions]);

  const handleSave = async () => {
    if (!editingId && !linkedId) { setError('Select a linked item'); return; }
    if (!note.trim()) { setError('Note is required'); return; }
    
    try {
      if (editingId) {
        await update(editingId, note.trim());
        showToast('Failure note updated');
      } else {
        await add(type, linkedId, note.trim());
        showToast('Failure logged');
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      logClientError('Failures.save', err);
      setError('Failed to save failure log');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setLinkedId('');
    setNote('');
    setError('');
  };

  const startEdit = (f: typeof failures[0]) => {
    setEditingId(f.id!);
    setType(f.type);
    setLinkedId(f.linkedId);
    setNote(f.note);
    setError('');
    setShowModal(true);
  };

  const getLinkedLabel = (f: typeof failures[0]) => {
    if (f.type === 'app') return 'Application / API';
    if (f.type === 'goal') {
      const g = goals.find(g => String(g.id) === String(f.linkedId));
      return g ? g.title || 'Unknown' : String(f.linkedId);
    }
    return `Session ${f.linkedId}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Failure Tracker</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-error/20 text-error border border-error/50 hover:bg-error/30 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
        >
          Log Failure
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-6">
              <h3 className="font-bold mb-4">{editingId ? 'Edit Failure Note' : 'Log Failure'}</h3>
              {error && <p className="text-error text-sm mb-3 bg-error/10 p-2 rounded">{error}</p>}
              <div className="flex flex-col gap-3">
                {!editingId && (
                  <>
                    <div>
                      <label className="text-sm text-secondary block mb-1">Type</label>
                      <select
                        value={type}
                        onChange={e => {
                          setType(e.target.value as Failure['type']);
                          setLinkedId('');
                        }}
                        className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                      >
                        <option value="session">Session</option>
                        <option value="goal">Goal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-secondary block mb-1">Linked {type === 'session' ? 'Session' : 'Goal'}</label>
                      <select
                        value={linkedId}
                        onChange={e => setLinkedId(e.target.value)}
                        className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                      >
                        <option value="">Select...</option>
                        {type === 'session'
                          ? sessions.map(s => <option key={s.id} value={s.id}>Session {new Date(s.startTime).toLocaleString()}</option>)
                          : goals.map(g => <option key={g.id} value={g.id}>{g.title || g.id || 'Unknown'}</option>)
                        }
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-sm text-secondary block mb-1">Note</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="What happened?"
                    className="w-full bg-background border border-secondary/30 p-3 rounded-lg text-text text-sm min-h-[80px] focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button onClick={() => { resetForm(); setShowModal(false); }} className="px-4 py-2 text-secondary hover:text-text transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-error text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-shadow">
                  {editingId ? 'Update Note' : 'Log Failure'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failure List */}
      <div className="flex flex-col gap-3">
        {failures.length === 0 && (
          <p className="text-secondary text-sm text-center mt-6">No failures logged. (That's a good thing!)</p>
        )}
        {failures.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <AntiGravity className="p-4 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-1">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                    f.type === 'session'
                      ? 'bg-secondary/30 text-secondary'
                      : f.type === 'app'
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-primary/30 text-accent'
                  }`}>{f.type}</span>
                  <span className="font-medium text-sm">{getLinkedLabel(f)}</span>
                </div>
                <p className="text-sm text-secondary/80 mt-1">{f.note}</p>
                <span className="text-[10px] text-secondary/50 mt-2 block">{new Date(f.createdAt).toLocaleString()}</span>
              </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => startEdit(f)}
                    className="text-accent/50 hover:text-accent p-2 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      confirm(
                        'Delete Failure Log',
                        'Move this failure record to the trash?',
                        async () => {
                          await remove(f.id!);
                          showToast('Failure moved to trash', 'info');
                        }
                      );
                    }}
                    className="text-error/30 hover:text-error transition-colors p-2 text-lg relative z-10"
                  >✕</button>
                </div>
            </AntiGravity>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
