import type { Goal } from '../db';

export const getActiveGoals = (goals: Goal[]): Goal[] => {
  return goals.filter(g => g.status === 'active');
};
