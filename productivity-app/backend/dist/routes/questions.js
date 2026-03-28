"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// LIST — supports ?category=
router.get('/', (req, res, next) => {
    try {
        let sql = 'SELECT * FROM journal_questions WHERE 1=1';
        const params = [];
        if (req.query['category']) {
            sql += ' AND category = ?';
            params.push(req.query['category']);
        }
        sql += ' ORDER BY createdAt ASC';
        const rows = (0, db_1.queryAll)(sql, params);
        // Convert isDefault from integer to boolean
        res.json(rows.map(r => ({ ...r, isDefault: Boolean(r['isDefault']) })));
    }
    catch (err) {
        next(err);
    }
});
// CREATE custom question
router.post('/', (req, res, next) => {
    try {
        const { category, question } = req.body;
        if (!category || !question) {
            res.status(400).json({ error: 'category and question are required' });
            return;
        }
        const createdAt = Date.now();
        const { lastInsertRowid } = (0, db_1.run)('INSERT INTO journal_questions (category, question, isDefault, createdAt) VALUES (?, ?, 0, ?)', [category, question, createdAt]);
        const created = (0, db_1.queryOne)('SELECT * FROM journal_questions WHERE id = ?', [lastInsertRowid]);
        res.status(201).json({ ...created, isDefault: false });
    }
    catch (err) {
        next(err);
    }
});
// DELETE — prevent deletion of defaults
router.delete('/:id', (req, res, next) => {
    try {
        const existing = (0, db_1.queryOne)('SELECT * FROM journal_questions WHERE id = ?', [req.params['id']]);
        if (!existing) {
            res.status(404).json({ error: 'Question not found' });
            return;
        }
        if (existing['isDefault']) {
            res.status(403).json({ error: 'Cannot delete a default question' });
            return;
        }
        (0, db_1.run)('DELETE FROM journal_questions WHERE id = ?', [req.params['id']]);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=questions.js.map