"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/trash - Retrieve all soft-deleted items
router.get('/', (_req, res, next) => {
    try {
        const trash = {
            frameworks: (0, db_1.queryAll)('SELECT * FROM frameworks WHERE deletedAt IS NOT NULL'),
            goals: (0, db_1.queryAll)('SELECT * FROM goals WHERE deletedAt IS NOT NULL'),
            sessions: (0, db_1.queryAll)('SELECT * FROM sessions WHERE deletedAt IS NOT NULL'),
            journals: (0, db_1.queryAll)('SELECT * FROM journals WHERE deletedAt IS NOT NULL'),
            failures: (0, db_1.queryAll)('SELECT * FROM failures WHERE deletedAt IS NOT NULL'),
        };
        // Standardize data parsing for JSON fields
        trash.frameworks = trash.frameworks.map(r => ({ ...r, keys: JSON.parse(r['keys']) }));
        trash.goals = trash.goals.map(r => ({ ...r, data: JSON.parse(r['data']) }));
        trash.journals = trash.journals.map(r => ({ ...r, content: JSON.parse(r['content']) }));
        res.json(trash);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/trash/restore - Restore a soft-deleted item
router.post('/restore', (req, res, next) => {
    try {
        const { type, id } = req.body;
        if (!type || !id) {
            res.status(400).json({ error: 'type and id are required' });
            return;
        }
        const tableMap = {
            framework: 'frameworks',
            goal: 'goals',
            session: 'sessions',
            journal: 'journals',
            failure: 'failures',
        };
        const table = tableMap[type];
        if (!table) {
            res.status(400).json({ error: 'Invalid item type' });
            return;
        }
        const { changes } = (0, db_1.run)(`UPDATE ${table} SET deletedAt = NULL WHERE id = ?`, [id]);
        if (changes === 0) {
            res.status(404).json({ error: 'Item not found in trash' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/trash/:type/:id - Permanently delete an item
router.delete('/:type/:id', (req, res, next) => {
    try {
        const { type, id } = req.params;
        if (!type || !id) {
            res.status(400).json({ error: 'type and id are required' });
            return;
        }
        const tableMap = {
            framework: 'frameworks',
            goal: 'goals',
            session: 'sessions',
            journal: 'journals',
            failure: 'failures',
        };
        const table = tableMap[type];
        if (!table) {
            res.status(400).json({ error: 'Invalid item type' });
            return;
        }
        const { changes } = (0, db_1.run)(`DELETE FROM ${table} WHERE id = ?`, [id]);
        if (changes === 0) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=trash.js.map