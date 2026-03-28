"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET /api/export — export ALL data as JSON
router.get('/', (_req, res, next) => {
    try {
        const data = {
            frameworks: (0, db_1.queryAll)('SELECT * FROM frameworks ORDER BY id'),
            goals: (0, db_1.queryAll)('SELECT * FROM goals ORDER BY id'),
            sessions: (0, db_1.queryAll)('SELECT * FROM sessions ORDER BY id'),
            journals: (0, db_1.queryAll)('SELECT * FROM journals ORDER BY id'),
            failures: (0, db_1.queryAll)('SELECT * FROM failures ORDER BY id'),
            users: (0, db_1.queryAll)('SELECT * FROM users ORDER BY id'),
            journal_questions: (0, db_1.queryAll)('SELECT * FROM journal_questions ORDER BY id'),
        };
        // Parse JSON columns for convenience
        data.frameworks = data.frameworks.map(r => ({
            ...r,
            keys: JSON.parse(r['keys']),
            isDefault: Boolean(r['isDefault']),
        }));
        data.goals = data.goals.map(r => ({
            ...r,
            data: JSON.parse(r['data']),
            isIndependent: Boolean(r['isIndependent']),
        }));
        data.journals = data.journals.map(r => ({
            ...r,
            content: JSON.parse(r['content']),
        }));
        data.journal_questions = data.journal_questions.map(r => ({
            ...r,
            isDefault: Boolean(r['isDefault']),
        }));
        res.json({
            exportedAt: new Date().toISOString(),
            ...data,
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/export/clear — full reset of backend data
router.post('/clear', (_req, res, next) => {
    const { run } = require('../db');
    try {
        run('DELETE FROM goals');
        run('DELETE FROM sessions');
        run('DELETE FROM journals');
        run('DELETE FROM failures');
        run('DELETE FROM frameworks WHERE isDefault = 0');
        run('DELETE FROM users');
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=export.js.map