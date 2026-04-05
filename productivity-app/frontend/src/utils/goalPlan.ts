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

/** Structural equality for plans — avoids relying on JSON key order or whitespace in stored strings. */
export function goalPlanDataEqual(a: GoalPlanData | null, b: GoalPlanData | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.type !== b.type) return false;
  if (a.items.length !== b.items.length) return false;
  for (let i = 0; i < a.items.length; i++) {
    const x = a.items[i]!;
    const y = b.items[i]!;
    if (x.label !== y.label || x.text !== y.text) return false;
  }
  return true;
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

