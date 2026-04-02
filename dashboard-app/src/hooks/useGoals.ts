import type { Goal } from "@/types/goal";

export const getActiveGoals = (goals: Goal[]): Goal[] => {
  return goals.filter(g => g.status === "active");
};

export const getChildren = (goals: Goal[], parentId: string): Goal[] => {
  return goals.filter(g => g.parentId === parentId);
};

export const hasChildren = (goals: Goal[], goalId: string): boolean => {
  return goals.some(g => g.parentId === goalId);
};

export const generateSubGoals = (
  goals: Goal[],
  parentGoal: Goal,
  type: "weekly" | "daily"
): Goal[] => {
  const existing = goals.filter(
    g => g.parentId === parentGoal.id && g.type === type
  );

  if (existing.length > 0) return goals;

  const plan = parentGoal.data?.plan;
  if (!plan) return goals;

  const newGoals: Goal[] = plan.items.map(item => ({
    id: crypto.randomUUID(),
    title: item.text,
    type,
    category: parentGoal.category,
    date: parentGoal.date,
    status: "active",
    parentId: parentGoal.id,
    createdAt: new Date().toISOString()
  }));

  return [...goals, ...newGoals];
};
