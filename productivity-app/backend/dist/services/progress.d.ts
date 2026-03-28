/**
 * Recalculate a single goal's progress based on its type.
 * For 'daily' goals: based on sessions (completed / total).
 * For higher-level goals: based on average of child goals' progress.
 * Logic:
 * - Daily: based on sessions today.
 * - Weekly: average of all Daily goals in same week.
 * - Monthly: average of all Weekly goals in same month.
 * - Yearly: average of all Monthly goals in same year.
 */
export declare function recalcGoalProgress(goalId: number): number;
/**
 * Propagate changes up the time-hierarchy.
 * If a daily goal changes, we find overlapping weekly goals and update them.
 */
export declare function recalcParentChain(goalId: number): void;
export declare function recalcProgressChain(goalId: number): void;
/**
 * Build a progress summary for the API.
 */
export declare function getProgressSummary(): Record<string, {
    total: number;
    completed: number;
    avgProgress: number;
}>;
//# sourceMappingURL=progress.d.ts.map