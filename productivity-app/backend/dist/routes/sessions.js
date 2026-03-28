"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const progress_1 = require("../services/progress");
const router = (0, express_1.Router)();
router.get('/', (req, res, next) => {
    try {
        let sql = 'SELECT * FROM sessions WHERE deletedAt IS NULL';
        const params = [];
        if (req.query['goalId']) {
            sql += ' AND goalId = ?';
            params.push(req.query['goalId']);
        }
        if (req.query['status']) {
            sql += ' AND status = ?';
            params.push(req.query['status']);
        }
        sql += ' ORDER BY startTime DESC';
        res.json((0, db_1.queryAll)(sql, params));
    }
    catch (err) {
        next(err);
    }
});
router.get('/active', (_req, res, next) => {
    try {
        const active = (0, db_1.queryOne)("SELECT * FROM sessions WHERE status = 'active'");
        if (!active) {
            res.json(null);
            return;
        }
        res.json(active);
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', (req, res, next) => {
    try {
        const row = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [req.params['id']]);
        if (!row) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json(row);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', (req, res, next) => {
    try {
        const body = req.body;
        const { goalId, frameworkData, workTime, restTime } = body;
        if (goalId === undefined) {
            res.status(400).json({ error: 'goalId is required' });
            return;
        }
        const active = (0, db_1.queryOne)("SELECT id FROM sessions WHERE status = 'active'");
        if (active) {
            res.status(409).json({ error: 'Another session is already active. End or skip it first.' });
            return;
        }
        const goal = (0, db_1.queryOne)('SELECT goalType FROM goals WHERE id = ?', [goalId]);
        if (!goal) {
            res.status(400).json({ error: 'Goal not found' });
            return;
        }
        if (goal['goalType'] !== 'daily') {
            res.status(400).json({ error: 'Sessions can only be started for daily goals' });
            return;
        }
        const startTime = Date.now();
        const { lastInsertRowid } = (0, db_1.run)(`INSERT INTO sessions (
        goalId, status, startTime, frameworkData,
        target, workTime, restTime, startedAt, elapsedWork, elapsedRest, phase
      ) VALUES (?, 'active', ?, ?, '', ?, ?, ?, 0, 0, 'work')`, [goalId, startTime, frameworkData ?? null, workTime ?? 0, restTime ?? 0, startTime]);
        const created = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [lastInsertRowid]);
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/end', (req, res, next) => {
    try {
        const existing = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [req.params['id']]);
        if (!existing) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const status = existing['status'];
        if (status !== 'active') {
            res.status(400).json({ error: `Cannot end a session with status '${status}'` });
            return;
        }
        const { didAchieveGoal, mistake, improvementSuggestion } = req.body;
        if (didAchieveGoal === undefined) {
            res.status(400).json({ error: 'didAchieveGoal is required' });
            return;
        }
        (0, db_1.run)(`UPDATE sessions SET status = 'completed', endTime = ?, didAchieveGoal = ?, mistake = ?, improvementSuggestion = ? WHERE id = ?`, [Date.now(), didAchieveGoal ? 1 : 0, mistake ?? null, improvementSuggestion ?? null, req.params['id']]);
        if (didAchieveGoal === false || didAchieveGoal === 0) {
            (0, db_1.run)('INSERT INTO failures (type, linkedId, note, createdAt) VALUES (?, ?, ?, ?)', ['session', req.params['id'].toString(), mistake || 'Goal not achieved during session', Date.now()]);
        }
        const goalId = existing['goalId'];
        (0, progress_1.recalcProgressChain)(goalId);
        const updated = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [req.params['id']]);
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/skip', (req, res, next) => {
    try {
        const existing = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [req.params['id']]);
        if (!existing) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const status = existing['status'];
        if (status !== 'active') {
            res.status(400).json({ error: `Cannot skip a session with status '${status}'` });
            return;
        }
        const { skipReason } = req.body;
        (0, db_1.run)(`UPDATE sessions SET status = 'skipped', endTime = ?, skipReason = ? WHERE id = ?`, [Date.now(), skipReason?.trim() ?? null, req.params['id']]);
        (0, db_1.run)('INSERT INTO failures (type, linkedId, note, createdAt) VALUES (?, ?, ?, ?)', ['session', req.params['id'].toString(), skipReason ? `Skipped: ${skipReason}` : 'Skipped session', Date.now()]);
        const goalId = existing['goalId'];
        (0, progress_1.recalcProgressChain)(goalId);
        const updated = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [req.params['id']]);
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', (req, res, next) => {
    try {
        const body = req.body;
        const existing = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [req.params['id']]);
        if (!existing) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const merged = { ...existing, ...body };
        (0, db_1.run)(`UPDATE sessions
       SET status = ?, elapsedWork = ?, elapsedRest = ?, phase = ?,
           endedAt = ?, result = ?, mistake = ?, improvement = ?, skipReason = ?, didAchieveGoal = ?
       WHERE id = ?`, [
            merged.status, merged.elapsedWork, merged.elapsedRest, merged.phase,
            merged.endedAt ?? null, merged.result ?? null,
            merged.mistake ?? null, merged.improvement ?? null,
            merged.skipReason ?? null, merged.didAchieveGoal ? 1 : 0,
            req.params['id'],
        ]);
        const updated = (0, db_1.queryOne)('SELECT * FROM sessions WHERE id = ?', [req.params['id']]);
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', (req, res, next) => {
    try {
        const id = req.params['id'];
        const now = Date.now();
        const { changes } = (0, db_1.run)('UPDATE sessions SET deletedAt = ? WHERE id = ?', [now, id]);
        if (changes === 0) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map