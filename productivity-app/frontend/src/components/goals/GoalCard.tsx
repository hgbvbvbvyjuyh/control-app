import { type Goal } from '../../db';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import React from 'react';

interface GoalCardProps {
  goal: Goal;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStartInlineEdit: (goal: Goal) => void;
  isInlineEditing: boolean;
  inlineTitleValue: string;
  onInlineTitleChange: (value: string) => void;
  onSaveInlineEdit: (goal: Goal) => void;
  hidePencil: boolean;
  parentGoalTitle?: string;
  onSelectParent: (id: string | null) => void;
  index: number;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  isSelected,
  onSelect,
  onStartInlineEdit,
  isInlineEditing,
  inlineTitleValue,
  onInlineTitleChange,
  onSaveInlineEdit,
  hidePencil,
  parentGoalTitle,
  onSelectParent,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onSelect(goal.id!)}
    >
      <div
        className={`mx-1 p-4 cursor-pointer border rounded-[20px] ${
          isSelected
            ? 'border-primary/50 bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
            : 'border-white/5 bg-surface/30 backdrop-blur-md'
        } ${goal.parentId != null ? 'opacity-85' : ''}`}
      >
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {goal.status && goal.status !== 'active' && (
                  <span
                    className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded leading-none border ${
                      goal.status === 'done'
                        ? 'bg-success/10 text-success border-success/20'
                        : goal.status === 'not_done'
                          ? 'bg-error/10 text-error border-error/20'
                          : 'bg-secondary/10 text-secondary border-secondary/20'
                    }`}
                  >
                    {goal.status.replace('_', ' ')}
                  </span>
                )}
                {goal.parentId != null && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectParent(goal.parentId!);
                    }}
                    className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded leading-none border border-secondary/20 bg-secondary/10 text-secondary hover:border-accent/40 hover:bg-secondary/20 transition-all duration-300"
                  >
                    From: {parentGoalTitle || 'Unknown'}
                  </button>
                )}
              </div>
              <h3 className="font-semibold text-lg mt-0.5 flex items-center gap-2.5 text-white leading-tight">
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded leading-none shrink-0 ${
                    (goal.category || 'health') === 'spirituality'
                      ? 'bg-blue-500/20 text-blue-400'
                      : (goal.category || 'health') === 'finance'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : (goal.category || 'health') === 'relation'
                          ? 'bg-pink-500/20 text-pink-400'
                          : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {goal.category || 'health'}
                </span>
                {isInlineEditing ? (
                  <>
                    <input
                      value={inlineTitleValue}
                      onChange={(e) => onInlineTitleChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-background/50 border border-white/10 rounded px-2 py-1 text-sm text-text min-w-[12rem]"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveInlineEdit(goal);
                      }}
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-accent/30 bg-accent/20 text-accent hover:bg-accent/30 transition-all duration-300"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <span className="truncate pt-[1px]">{goal.title || 'Unknown'}</span>
                    {!hidePencil && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartInlineEdit(goal);
                        }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-secondary hover:text-text hover:bg-white/10 transition-all duration-300"
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
        </div>
      </div>
    </motion.div>
  );
};
