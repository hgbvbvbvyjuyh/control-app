import { useState } from 'react';
import type { Goal } from '../db';
import type { GoalPlanData } from '../utils/goalPlan';
import { childTypeForPlannedParent, isPlannableGoalType } from '../utils/goalPlan';

const BTN_SECONDARY =
  'text-sm font-semibold px-4 py-2 rounded-xl border border-white/10 bg-surface/50 text-secondary hover:text-white hover:bg-surface/80 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/50';
const BTN_ACCENT_OUTLINE =
  'text-xs font-semibold px-3 py-2 rounded-lg border border-accent/30 bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent/20';

export interface GoalPlanSectionProps {
  selectedGoal: Goal;
  planDraft: GoalPlanData | null;
  onAddPlan: () => void;
  onPlanItemChange: (index: number, text: string) => void;
  onSavePlan: () => void;
  onGenerateSubGoals: () => void;
}

export function GoalPlanSection({
  selectedGoal,
  planDraft,
  onAddPlan,
  onPlanItemChange,
  onSavePlan,
  onGenerateSubGoals,
}: GoalPlanSectionProps) {
  const [showPlan, setShowPlan] = useState(false);

  if (!isPlannableGoalType(selectedGoal.goalType)) return null;

  return (
    <div className="bg-background/50 rounded-xl border border-secondary/20 p-4">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
        <h4 className="text-xs font-semibold text-accent uppercase tracking-wider">Plan</h4>
      </div>

      <button
        type="button"
        onClick={() => setShowPlan((prev) => !prev)}
        className="text-sm text-accent hover:underline mb-2"
      >
        {showPlan ? 'Hide Plan' : 'Show Plan'}
      </button>

      {showPlan && (
        <div className="space-y-2">
          {planDraft === null ? (
            <button type="button" onClick={onAddPlan} className={BTN_ACCENT_OUTLINE}>
              Add Plan
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-3 max-h-64 overflow-y-auto no-scrollbar">
                {planDraft.items.map((item, idx) => (
                  <div key={`${item.label}-${idx}`} className="flex flex-col gap-1">
                    <label className="text-[10px] text-secondary uppercase font-bold tracking-wide">{item.label}</label>
                    <input
                      value={item.text}
                      onChange={(e) => onPlanItemChange(idx, e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-text"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onSavePlan} className={`${BTN_SECONDARY} text-xs py-2`}>
                  Save Plan
                </button>
                <button
                  type="button"
                  onClick={onGenerateSubGoals}
                  className={BTN_ACCENT_OUTLINE}
                >
                  Generate Sub Goals
                </button>
              </div>
              <p className="text-[10px] text-secondary/60 mt-2 leading-snug">
                Sub-goals: {childTypeForPlannedParent(selectedGoal.goalType)}, one per plan row (save plan first; all
                items required). Skipped if any such child already exists (same parent and type).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default GoalPlanSection;
