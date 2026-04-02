import type { Goal } from '../db';

export type PlanGranularity = 'yearly' | 'monthly' | 'weekly';

export interface GoalPlanItem {
  label: string;
  text: string;
}

export interface GoalPlanData {
  type: PlanGranularity;
  items: GoalPlanItem[];
}

const PLAN_KEY = 'plan';

export function isPlannableGoalType(gt: Goal['goalType']): gt is PlanGranularity {
  return gt === 'yearly' || gt === 'monthly' || gt === 'weekly';
}

export function planSlotCount(goalType: PlanGranularity): number {
  switch (goalType) {
    case 'yearly':
      return 12;
    case 'monthly':
      return 4;
    case 'weekly':
      return 7;
    default:
      return 0;
  }
}

export function defaultPlanLabels(goalType: PlanGranularity): string[] {
  const n = planSlotCount(goalType);
  if (goalType === 'yearly') {
    return Array.from({ length: n }, (_, i) => `Month ${i + 1}`);
  }
  if (goalType === 'monthly') {
    return Array.from({ length: n }, (_, i) => `Week ${i + 1}`);
  }
  return Array.from({ length: n }, (_, i) => `Day ${i + 1}`);
}

export function emptyPlanForGoalType(goalType: PlanGranularity): GoalPlanData {
  const labels = defaultPlanLabels(goalType);
  return {
    type: goalType,
    items: labels.map(label => ({ label, text: '' })),
  };
}

export function parseGoalPlan(data: Record<string, string>): GoalPlanData | null {
  const raw = data[PLAN_KEY];
  if (raw == null || typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const p = JSON.parse(raw) as GoalPlanData;
    if (!p || !Array.isArray(p.items)) return null;
    const n = planSlotCount(p.type);
    if (n === 0 || p.items.length !== n) return null;
    return p;
  } catch {
    return null;
  }
}

export function serializeGoalPlan(plan: GoalPlanData): string {
  return JSON.stringify(plan);
}

/** Sub-goal type produced when generating from a plannable parent */
export function childTypeForPlannedParent(parentType: PlanGranularity): Goal['goalType'] {
  switch (parentType) {
    case 'yearly':
      return 'monthly';
    case 'monthly':
      return 'weekly';
    case 'weekly':
      return 'daily';
    default:
      return 'daily';
  }
}

export function hasChildOfType(
  goals: Goal[],
  parentId: string,
  childType: Goal['goalType']
): boolean {
  return goals.some(
    g => g.parentId != null && String(g.parentId) === String(parentId) && g.goalType === childType
  );
}

export function buildChildGoalRowData(
  fw: { keys: { key: string }[] },
  titleFromFirstField: string
): Record<string, string> {
  const row: Record<string, string> = {};
  fw.keys.forEach((k, i) => {
    row[k.key] = i === 0 ? titleFromFirstField : '';
  });
  return row;
}
