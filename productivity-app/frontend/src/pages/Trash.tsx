import { useEffect } from 'react';
import { useTrashStore } from '../stores/trashStore';
import { motion } from 'framer-motion';
import { RefreshCcw, Trash2, ShieldAlert, Archive } from 'lucide-react';
import { useConfirmStore } from '../stores/confirmStore';
import { useToastStore } from '../stores/toastStore';

export const Trash = () => {
  const { trash, loading, error, fetchTrash, restore, purge } = useTrashStore();
  const { confirm } = useConfirmStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (type: string, id: string) => {
    confirm(
      `Restore ${type}?`,
      `This will move the ${type} back to your active lists.`,
      async () => {
        await restore(type as any, id);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} restored`);
      },
      'Confirm Restore',
      'Go back'
    );
  };

  const handlePurge = async (type: string, id: string) => {
    confirm(
      `PERMANENTLY delete this ${type}?`,
      'This action cannot be undone. All associated data will be wiped from the system.',
      async () => {
        await purge(type as any, id);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted`, 'error');
      },
      'Delete Permanently',
      'Cancel'
    );
  };

  const renderSection = (title: string, items: any[], type: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
          {title} <span className="text-[10px] bg-secondary/10 px-2 py-0.5 rounded-full">{items.length}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {type === 'goal' ? (Object.values(item.data)[0] as string || 'Unnamed Goal') :
                     type === 'session' ? `Session ${new Date(item.startTime).toLocaleDateString()}` :
                     type === 'journal' ? `${item.type} Journal (${item.date})` :
                     type === 'framework' ? item.name :
                     item.note || 'Unnamed Item'}
                  </p>
                  <p className="text-[10px] text-secondary mt-1">
                    Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'Unknown date'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => handleRestore(type, item.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent/10 text-accent text-xs font-bold rounded-xl hover:bg-accent hover:text-background transition-all"
                >
                  <RefreshCcw size={14} /> Restore
                </button>
                <button
                  onClick={() => handlePurge(type, item.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-error/10 text-error text-xs font-bold rounded-xl hover:bg-error hover:text-white transition-all"
                >
                  <Trash2 size={14} /> Purge
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  if (loading && !Object.values(trash).some(arr => arr.length > 0)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  const isEmpty = Object.values(trash).every(arr => arr.length === 0);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Archive size={32} className="text-accent" />
          <h1 className="text-3xl font-black text-white tracking-tight">Trash Bin</h1>
        </div>
        <p className="text-secondary max-w-xl">
          View and manage deleted items. Restore them to your dashboard or permanently delete them from the system.
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error">
          <ShieldAlert size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
          <Trash2 size={64} className="mb-4" />
          <h2 className="text-xl font-bold mb-2">Trash is empty</h2>
          <p className="text-sm">Items moved to trash will appear here for 30 days.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {renderSection('Goals', trash.goals, 'goal')}
          {renderSection('Sessions', trash.sessions, 'session')}
          {renderSection('Journals', trash.journals, 'journal')}
          {renderSection('Failures', trash.failures, 'failure')}
          {renderSection('Frameworks', trash.frameworks, 'framework')}
        </div>
      )}
    </div>
  );
};
