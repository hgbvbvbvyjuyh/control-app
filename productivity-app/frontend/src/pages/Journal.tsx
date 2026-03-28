import { useEffect, useState } from 'react';
import { AntiGravity } from '../components/AntiGravity';
import { useJournalStore } from '../stores/journalStore';
import { motion, AnimatePresence } from 'framer-motion';

import { GoalModal } from '../components/GoalModal';
import { useConfirmStore } from '../stores/confirmStore';
import { useToastStore } from '../stores/toastStore';

const tabs = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const sections = ['goals', 'reflection', 'emotions', 'problems', 'ideas'] as const;

export const Journal = () => {
  const { entries, load, add, update, remove } = useJournalStore();
  const { confirm } = useConfirmStore();
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('daily');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showNew, setShowNew] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => { load(); }, []);

  const filtered = entries.filter(e => e.type === activeTab);

  const startNewEntry = () => {
    const initial: Record<string, string> = {};
    sections.forEach(s => { initial[s] = ''; });
    setFormData(initial);
    setEditingId(null);
    setShowNew(true);
  };

  const startEdit = (entry: typeof entries[0]) => {
    const data: Record<string, string> = {};
    sections.forEach(s => { data[s] = (entry.content as any)?.[s] || ''; });
    setFormData(data);
    setEditingId(entry.id!);
    setShowNew(true);
  };

  const handleSave = async () => {
    const content: any = {};
    sections.forEach(s => { content[s] = formData[s] || ''; });
    if (editingId) {
      await update(editingId, content);
      showToast('Journal entry updated');
    } else {
      const date = new Date().toISOString().split('T')[0];
      await add(activeTab, date, content);
      showToast('Journal entry saved');
    }
    setShowNew(false);
    setEditingId(null);
    setFormData({});
    await load();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-10">
      <GoalModal open={showGoalModal} onClose={() => setShowGoalModal(false)} frameworkId={null} initialType={activeTab === 'daily' ? 'daily' : activeTab} />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Journal</h1>
        <div className="flex gap-2">
          {activeTab !== 'daily' && (
            <button
              onClick={() => setShowGoalModal(true)}
              className="bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2 rounded-lg transition-colors text-sm font-semibold border border-accent/30"
            >
              + Plan {activeTab} Goal
            </button>
          )}
          <button
            onClick={startNewEntry}
            className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/20 text-sm font-semibold"
          >
            + New Entry
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/10 p-1 rounded-xl w-max">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize text-sm ${
              activeTab === tab ? 'bg-primary/80 text-white shadow-md' : 'text-secondary hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* New / Edit Form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-6">
              <h3 className="font-bold mb-4">{editingId ? 'Edit Entry' : 'New Entry'}</h3>
              <div className="flex flex-col gap-4">
                {sections.map(section => (
                  <div key={section}>
                    <label className="text-sm text-secondary block mb-1 capitalize font-medium">{section}</label>
                    <textarea
                      value={formData[section] || ''}
                      onChange={e => setFormData({ ...formData, [section]: e.target.value })}
                      className="w-full bg-background border border-secondary/30 rounded-lg p-3 text-text min-h-[80px] focus:outline-none focus:border-accent/80 focus:ring-1 focus:ring-accent/50 transition-shadow text-sm"
                      placeholder={`Write your ${section}...`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-secondary hover:text-text transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-accent text-background font-bold rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-shadow">
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-secondary text-sm text-center mt-6">No {activeTab} entries yet.</p>
        )}
        {filtered.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <AntiGravity className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs text-secondary">{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(entry)} className="text-xs text-accent hover:underline">Edit</button>
                  <button onClick={() => {
                    confirm(
                      'Delete Journal Entry',
                      'Are you sure you want to delete this journal entry? It will be moved to the trash.',
                      async () => {
                        await remove(entry.id!);
                        showToast('Entry moved to trash', 'info');
                      }
                    );
                  }} className="text-xs text-error/70 hover:text-error p-2">Delete</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sections.map(s => {
                  const val = (entry.content as any)?.[s];
                  if (!val) return null;
                  return (
                    <div key={s} className="bg-background/50 p-3 rounded-lg border border-secondary/10">
                      <span className="text-[10px] uppercase tracking-wider text-accent/70 font-bold">{s}</span>
                      <p className="text-sm mt-1 text-text/80 whitespace-pre-wrap">{val}</p>
                    </div>
                  );
                })}
              </div>
            </AntiGravity>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
