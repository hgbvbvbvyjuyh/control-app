"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
function parseJournal(row) {
    return { ...row, content: JSON.parse(row['content']) };
}
router.get('/', (req, res, next) => {
    try {
        let sql = 'SELECT * FROM journals WHERE deletedAt IS NULL';
        const params = [];
        if (req.query['type']) {
            sql += ' AND type = ?';
            params.push(req.query['type']);
        }
        if (req.query['goalId']) {
            sql += ' AND goalId = ?';
            params.push(req.query['goalId']);
        }
        if (req.query['category']) {
            sql += ' AND category = ?';
            params.push(req.query['category']);
        }
        sql += ' ORDER BY date DESC, createdAt DESC';
        const rows = (0, db_1.queryAll)(sql, params);
        res.json(rows.map(parseJournal));
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', (req, res, next) => {
    try {
        const row = (0, db_1.queryOne)('SELECT * FROM journals WHERE id = ?', [req.params['id']]);
        if (!row) {
            res.status(404).json({ error: 'Journal entry not found' });
            return;
        }
        res.json(parseJournal(row));
    }
    catch (err) {
        next(err);
    }
});
router.post('/', (req, res, next) => {
    try {
        const body = req.body;
        const { type, date, content, goalId, category } = body;
        if (!type || !date || !content) {
            res.status(400).json({ error: 'type, date, and content are required' });
            return;
        }
        const now = Date.now();
        const { lastInsertRowid } = (0, db_1.run)('INSERT INTO journals (type, date, goalId, category, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [type, date, goalId ?? null, category ?? null, JSON.stringify(content), now, now]);
        const created = parseJournal((0, db_1.queryOne)('SELECT * FROM journals WHERE id = ?', [lastInsertRowid]));
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content) {
            res.status(400).json({ error: 'content is required' });
            return;
        }
        const updatedAt = Date.now();
        const { changes } = (0, db_1.run)('UPDATE journals SET content = ?, updatedAt = ? WHERE id = ?', [JSON.stringify(content), updatedAt, req.params['id']]);
        if (changes === 0) {
            res.status(404).json({ error: 'Journal entry not found' });
            return;
        }
        const updated = parseJournal((0, db_1.queryOne)('SELECT * FROM journals WHERE id = ?', [req.params['id']]));
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
        const { changes } = (0, db_1.run)('UPDATE journals SET deletedAt = ? WHERE id = ?', [now, id]);
        if (changes === 0) {
            res.status(404).json({ error: 'Entry not found' });
            return;
        }
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=journals.js.map