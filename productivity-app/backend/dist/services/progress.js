"use strict";
// Auto-progress calculation service
// Daily progress  = completed sessions / total sessions for that goal
// Weekly progress  = avg of child daily goals' progress
// Monthly progress = avg of child weekly goals' progress
// Yearly progress  = avg of child monthly goals' progress
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalcGoalProgress = recalcGoalProgress;
exports.recalcParentChain = recalcParentChain;
exports.recalcProgressChain = recalcProgressChain;
exports.getProgressSummary = getProgressSummary;
const db_1 = require("../db");
const dateUtils_1 = require("../utils/dateUtils");
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
function recalcGoalProgress(goalId) {
    const goal = (0, db_1.queryOne)('SELECT * FROM goals WHERE id = ?', [goalId]);
    if (!goal)
        return 0;
    const goalType = goal['goalType'];
    const goalDate = new Date(goal['createdAt']);
    let progress = 0;
    if (goalType === 'daily') {
        const today = new Date();
        const sessions = (0, db_1.queryAll)('SELECT * FROM sessions WHERE goalId = ? AND deletedAt IS NULL', [goalId]);
        const todaySessions = sessions.filter(s => (0, dateUtils_1.isSameDay)(new Date(s['startTime']), today));
        const completed = todaySessions.filter(s => s['status'] === 'completed' && s['didAchieveGoal']).length;
        progress = todaySessions.length > 0 ? Math.round((completed / todaySessions.length) * 100) : 0;
    }
    else if (goalType === 'weekly') {
        const dailies = (0, db_1.queryAll)('SELECT id, progress, createdAt FROM goals WHERE goalType = ? AND deletedAt IS NULL', ['daily']);
        const sameWeekDailies = dailies.filter(d => (0, dateUtils_1.isSameWeek)(new Date(d['createdAt']), goalDate));
        if (sameWeekDailies.length > 0) {
            const sum = sameWeekDailies.reduce((acc, d) => acc + (Number(d['progress']) || 0), 0);
            progress = Math.round(sum / sameWeekDailies.length);
        }
    }
    else if (goalType === 'monthly') {
        const weeklies = (0, db_1.queryAll)('SELECT id, progress, createdAt FROM goals WHERE goalType = ? AND deletedAt IS NULL', ['weekly']);
        const sameMonthWeeklies = weeklies.filter(w => (0, dateUtils_1.isSameMonth)(new Date(w['createdAt']), goalDate));
        if (sameMonthWeeklies.length > 0) {
            const sum = sameMonthWeeklies.reduce((acc, w) => acc + (Number(w['progress']) || 0), 0);
            progress = Math.round(sum / sameMonthWeeklies.length);
        }
    }
    else if (goalType === 'yearly') {
        const monthlies = (0, db_1.queryAll)('SELECT id, progress, createdAt FROM goals WHERE goalType = ? AND deletedAt IS NULL', ['monthly']);
        const sameYearMonthlies = monthlies.filter(m => (0, dateUtils_1.isSameYear)(new Date(m['createdAt']), goalDate));
        if (sameYearMonthlies.length > 0) {
            const sum = sameYearMonthlies.reduce((acc, m) => acc + (Number(m['progress']) || 0), 0);
            progress = Math.round(sum / sameYearMonthlies.length);
        }
    }
    (0, db_1.run)('UPDATE goals SET progress = ?, updatedAt = ? WHERE id = ?', [progress, Date.now(), goalId]);
    if (progress >= 100 && goal['status'] === 'active') {
        (0, db_1.run)("UPDATE goals SET status = 'completed', updatedAt = ? WHERE id = ?", [Date.now(), goalId]);
    }
    return progress;
}
/**
 * Propagate changes up the time-hierarchy.
 * If a daily goal changes, we find overlapping weekly goals and update them.
 */
function recalcParentChain(goalId) {
    const goal = (0, db_1.queryOne)('SELECT goalType, createdAt FROM goals WHERE id = ?', [goalId]);
    if (!goal)
        return;
    const type = goal['goalType'];
    const date = new Date(goal['createdAt']);
    if (type === 'daily') {
        const weeklies = (0, db_1.queryAll)('SELECT id, createdAt FROM goals WHERE goalType = ? AND deletedAt IS NULL', ['weekly']);
        weeklies.filter(w => (0, dateUtils_1.isSameWeek)(new Date(w['createdAt']), date))
            .forEach(w => recalcProgressChain(w['id']));
    }
    else if (type === 'weekly') {
        const monthlies = (0, db_1.queryAll)('SELECT id, createdAt FROM goals WHERE goalType = ? AND deletedAt IS NULL', ['monthly']);
        monthlies.filter(m => (0, dateUtils_1.isSameMonth)(new Date(m['createdAt']), date))
            .forEach(m => recalcProgressChain(m['id']));
    }
    else if (type === 'monthly') {
        const yearlies = (0, db_1.queryAll)('SELECT id, createdAt FROM goals WHERE goalType = ? AND deletedAt IS NULL', ['yearly']);
        yearlies.filter(y => (0, dateUtils_1.isSameYear)(new Date(y['createdAt']), date))
            .forEach(y => recalcProgressChain(y['id']));
    }
}
function recalcProgressChain(goalId) {
    recalcGoalProgress(goalId);
    recalcParentChain(goalId);
}
/**
 * Build a progress summary for the API.
 */
function getProgressSummary() {
    const types = ['daily', 'weekly', 'monthly', 'yearly'];
    const summary = {};
    for (const t of types) {
        const goals = (0, db_1.queryAll)('SELECT progress, status FROM goals WHERE goalType = ?', [t]);
        const total = goals.length;
        const completed = goals.filter(g => g['status'] === 'completed').length;
        const avgProgress = total > 0
            ? Math.round(goals.reduce((s, g) => s + (Number(g['progress']) || 0), 0) / total)
            : 0;
        summary[t] = { total, completed, avgProgress };
    }
    return summary;
}
//# sourceMappingURL=progress.js.map