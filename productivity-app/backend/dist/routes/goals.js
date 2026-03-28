"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
function parseGoal(row) {
    return {
        ...row,
        data: JSON.parse(row['data']),
        isIndependent: Boolean(row['isIndependent']),
    };
}
// LIST — supports ?frameworkId=, ?goalType=, ?parentId=, ?status=
router.get('/', (req, res, next) => {
    try {
        let sql = 'SELECT * FROM goals WHERE deletedAt IS NULL';
        const params = [];
        if (req.query['frameworkId']) {
            sql += ' AND frameworkId = ?';
            params.push(req.query['frameworkId']);
        }
        if (req.query['goalType']) {
            sql += ' AND goalType = ?';
            params.push(req.query['goalType']);
        }
        if (req.query['parentId']) {
            sql += ' AND parentId = ?';
            params.push(req.query['parentId']);
        }
        if (req.query['status']) {
            sql += ' AND status = ?';
            params.push(req.query['status']);
        }
        sql += ' ORDER BY createdAt DESC';
        const rows = (0, db_1.queryAll)(sql, params);
        res.json(rows.map(parseGoal));
    }
    catch (err) {
        next(err);
    }
});
// GET one
router.get('/:id', (req, res, next) => {
    try {
        const row = (0, db_1.queryOne)('SELECT * FROM goals WHERE id = ?', [req.params['id']]);
        if (!row) {
            res.status(404).json({ error: 'Goal not found' });
            return;
        }
        res.json(parseGoal(row));
    }
    catch (err) {
        next(err);
    }
});
// GET children of a goal
router.get('/:id/children', (req, res, next) => {
    try {
        const rows = (0, db_1.queryAll)('SELECT * FROM goals WHERE parentId = ? ORDER BY createdAt DESC', [req.params['id']]);
        res.json(rows.map(parseGoal));
    }
    catch (err) {
        next(err);
    }
});
// CREATE
router.post('/', (req, res, next) => {
    try {
        const body = req.body;
        const { frameworkId, data, goalType, parentId, isIndependent } = body;
        if (!frameworkId || !data) {
            res.status(400).json({ error: 'frameworkId and data are required' });
            return;
        }
        // If parentId is provided, validate it exists
        if (parentId) {
            const parent = (0, db_1.queryOne)('SELECT id FROM goals WHERE id = ?', [parentId]);
            if (!parent) {
                res.status(400).json({ error: 'Parent goal not found' });
                return;
            }
        }
        const now = Date.now();
        const { lastInsertRowid } = (0, db_1.run)(`INSERT INTO goals (frameworkId, goalType, parentId, isIndependent, data, progress, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, 'active', ?, ?)`, [
            frameworkId,
            goalType || 'daily',
            parentId ?? null,
            isIndependent === false ? 0 : 1,
            JSON.stringify(data),
            now, now,
        ]);
        const created = parseGoal((0, db_1.queryOne)('SELECT * FROM goals WHERE id = ?', [lastInsertRowid]));
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
// UPDATE
router.put('/:id', (req, res, next) => {
    try {
        const body = req.body;
        const existing = (0, db_1.queryOne)('SELECT * FROM goals WHERE id = ?', [req.params['id']]);
        if (!existing) {
            res.status(404).json({ error: 'Goal not found' });
            return;
        }
        const updatedAt = Date.now();
        const data = body.data ? JSON.stringify(body.data) : existing['data'];
        const goalType = body.goalType ?? existing['goalType'];
        const parentId = body.parentId !== undefined ? body.parentId : existing['parentId'];
        const isIndependent = body.isIndependent !== undefined ? (body.isIndependent ? 1 : 0) : existing['isIndependent'];
        const status = body.status ?? existing['status'];
        const progress = body.progress !== undefined ? body.progress : existing['progress'];
        (0, db_1.run)(`UPDATE goals SET data = ?, goalType = ?, parentId = ?, isIndependent = ?,
       status = ?, progress = ?, updatedAt = ? WHERE id = ?`, [data, goalType, parentId ?? null, isIndependent, status, progress, updatedAt, req.params['id']]);
        const updated = parseGoal((0, db_1.queryOne)('SELECT * FROM goals WHERE id = ?', [req.params['id']]));
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
// DELETE
router.delete('/:id', (req, res, next) => {
    try {
        const id = req.params['id'];
        const now = Date.now();
        // Perform cascading soft-deletions
        (0, db_1.run)('UPDATE sessions SET deletedAt = ? WHERE goalId = ?', [now, id]);
        (0, db_1.run)('UPDATE journals SET deletedAt = ? WHERE goalId = ?', [now, id]);
        (0, db_1.run)('UPDATE failures SET deletedAt = ? WHERE type = ? AND linkedId = ?', [now, 'goal', id]);
        // Also delete failures tied to sessions of this goal
        const sessionIds = (0, db_1.queryAll)('SELECT id FROM sessions WHERE goalId = ?', [id]).map(s => s['id']);
        if (sessionIds.length > 0) {
            const placeholders = sessionIds.map(() => '?').join(',');
            (0, db_1.run)(`UPDATE failures SET deletedAt = ? WHERE type = 'session' AND linkedId IN (${placeholders})`, [now, ...sessionIds]);
        }
        const { changes } = (0, db_1.run)('UPDATE goals SET deletedAt = ? WHERE id = ?', [now, id]);
        if (changes === 0) {
            res.status(404).json({ error: 'Goal not found' });
            return;
        }
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=goals.js.map